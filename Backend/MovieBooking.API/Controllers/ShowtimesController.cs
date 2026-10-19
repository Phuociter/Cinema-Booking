using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/showtimes")]
public class ShowtimesController : ControllerBase
{
    private readonly IScheduleService _scheduleService;
    private readonly IRedisService _redisService;
    private readonly AppDbContext _context;

    public ShowtimesController(
        IScheduleService scheduleService,
        IRedisService redisService,
        AppDbContext context)
    {
        _scheduleService = scheduleService;
        _redisService = redisService;
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ShowtimeDto>>> GetShowtimes(
        [FromQuery] Guid? movieId,
        [FromQuery] Guid? cinemaId,
        [FromQuery] DateOnly? date,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _scheduleService.GetShowtimesAsync(movieId, cinemaId, date, dateFrom, dateTo, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ShowtimeDto>> GetShowtimeById(Guid id)
    {
        var showtime = await _scheduleService.GetShowtimeByIdAsync(id);
        if (showtime == null)
        {
            return NotFound(new { message = $"Không tìm thấy suất chiếu với ID: {id}" });
        }

        return Ok(showtime);
    }

    [HttpGet("{id:guid}/seats")]
    public async Task<ActionResult<IEnumerable<ShowtimeSeatDto>>> GetShowtimeSeats(Guid id)
    {
        if (!await _scheduleService.ShowtimeExistsAsync(id))
        {
            return NotFound(new { message = $"Không tìm thấy suất chiếu với ID: {id}" });
        }

        // Lazy sweep: Dọn dẹp các booking pending đã hết hạn của suất chiếu này
        await CleanupExpiredPendingBookingsAsync(id);

        var seats = await _scheduleService.GetSeatsForShowtimeAsync(id);
        return Ok(seats);
    }

    [Authorize]
    [HttpPost("{id:guid}/hold-seats")]
    public async Task<IActionResult> HoldSeats(Guid id, [FromBody] HoldSeatsRequest request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new { message = "Người dùng chưa đăng nhập hoặc token không hợp lệ." });
        }

        if (request == null || request.SeatIds == null || !request.SeatIds.Any())
        {
            return BadRequest(new { message = "Danh sách ghế không được để trống." });
        }

        var showtimeExists = await _scheduleService.ShowtimeExistsAsync(id);
        if (!showtimeExists)
        {
            return NotFound(new { message = $"Không tìm thấy suất chiếu với ID: {id}" });
        }

        // Lazy sweep: Dọn dẹp các booking pending đã hết hạn trước khi kiểm tra ghế trống
        await CleanupExpiredPendingBookingsAsync(id);

        // Dọn dẹp đơn pending cũ của CHÍNH USER này trong cùng suất chiếu (nếu có)
        // Tránh tình trạng người dùng đặt lại hoặc đổi ghế bị hệ thống chặn vì đơn pending trước đó của chính mình đang giữ chỗ
        var userExistingPendingBooking = await _context.Bookings
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
            .FirstOrDefaultAsync(b => b.UserId == userId
                                   && b.Status == "pending"
                                   && b.Tickets.Any(t => t.ShowtimeSeat.ShowtimeId == id));

        if (userExistingPendingBooking != null)
        {
            userExistingPendingBooking.Status = "cancelled";
            userExistingPendingBooking.UpdatedAt = DateTime.UtcNow;

            foreach (var ticket in userExistingPendingBooking.Tickets)
            {
                if (ticket.ShowtimeSeat != null)
                {
                    ticket.ShowtimeSeat.Status = "available";
                    await _redisService.RemoveAsync($"hold:{id}:{ticket.ShowtimeSeat.SeatId}");
                }
            }
            _context.Tickets.RemoveRange(userExistingPendingBooking.Tickets);
            await _context.SaveChangesAsync();
        }

        var requestedSeatIds = request.SeatIds.Distinct().ToList();
        var showtimeSeats = await _context.ShowtimeSeats
            .Include(ss => ss.Seat)
            .Where(ss => ss.ShowtimeId == id && (requestedSeatIds.Contains(ss.SeatId) || requestedSeatIds.Contains(ss.Id)))
            .ToListAsync();

        var matchedIds = showtimeSeats.Select(ss => ss.SeatId).Concat(showtimeSeats.Select(ss => ss.Id)).ToHashSet();
        var missingIds = requestedSeatIds.Where(sid => !matchedIds.Contains(sid)).ToList();
        if (missingIds.Any())
        {
            return BadRequest(new { message = $"Không tìm thấy ghế trong suất chiếu: {string.Join(", ", missingIds)}" });
        }

        // 1. Kiểm tra ShowtimeSeat.Status trong DB phải là 'available'
        var unavailableSeats = showtimeSeats
            .Where(ss => !string.Equals(ss.Status, "available", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (unavailableSeats.Any())
        {
            var seatCodes = unavailableSeats.Select(s => s.Seat?.SeatCode ?? s.SeatId.ToString()).ToList();
            return Conflict(new
            {
                message = $"Ghế không khả dụng (đã có người đặt): {string.Join(", ", seatCodes)}",
                unavailableSeats = unavailableSeats.Select(s => s.SeatId)
            });
        }

        // 2 & 3. Atomic hold: Dùng SetStringAsync với onlyIfNotExists: true (SET ... NX)
        var ttl = TimeSpan.FromSeconds(300);
        var expiresAt = DateTime.UtcNow.Add(ttl);
        var acquiredKeys = new List<string>();

        foreach (var ss in showtimeSeats)
        {
            var redisKey = $"hold:{id}:{ss.SeatId}";
            var success = await _redisService.SetStringAsync(redisKey, userId.ToString(), ttl, onlyIfNotExists: true);

            // Nếu không set được bằng NX, kiểm tra xem có phải chính user này đang giữ không
            if (!success)
            {
                var currentHolder = await _redisService.GetStringAsync(redisKey);
                if (currentHolder == userId.ToString())
                {
                    // Chính user này đang giữ, gia hạn TTL
                    await _redisService.SetStringAsync(redisKey, userId.ToString(), ttl);
                    success = true;
                }
            }

            if (!success)
            {
                // Rollback tất cả các key đã set thành công trước đó trong request này
                foreach (var k in acquiredKeys)
                {
                    await _redisService.RemoveAsync(k);
                }

                var seatCode = ss.Seat?.SeatCode ?? ss.SeatId.ToString();
                return Conflict(new { message = $"Ghế {seatCode} đang được người khác giữ." });
            }

            acquiredKeys.Add(redisKey);
            if (ss.Id != ss.SeatId)
            {
                var ssKey = $"hold:{id}:{ss.Id}";
                await _redisService.SetStringAsync(ssKey, userId.ToString(), ttl);
                acquiredKeys.Add(ssKey);
            }
        }

        // 4. Sinh holdToken (GUID), lưu kèm mapping holdToken -> { userId, showtimeId, seatIds[] } vào Redis, cùng TTL 300s
        var holdToken = Guid.NewGuid().ToString();
        var holdTokenData = new HoldTokenData
        {
            UserId = userId,
            ShowtimeId = id,
            SeatIds = showtimeSeats.Select(s => s.SeatId).Distinct().ToList(),
            ShowtimeSeatIds = showtimeSeats.Select(s => s.Id).Distinct().ToList(),
            ExpiresAt = expiresAt
        };

        await _redisService.SetObjectAsync($"hold:token:{holdToken}", holdTokenData, ttl);
        await _redisService.SetObjectAsync($"hold:{holdToken}", holdTokenData, ttl);

        // 5. Trả về { holdToken, expiresAt, seatIds }
        return Ok(new HoldSeatsResponse
        {
            HoldToken = holdToken,
            ExpiresAt = expiresAt,
            SeatIds = request.SeatIds
        });
    }

    [HttpPost("/api/holds/{holdToken}/release")]
    public async Task<IActionResult> ReleaseHold(string holdToken)
    {
        if (string.IsNullOrWhiteSpace(holdToken))
        {
            return BadRequest(new { message = "Hold token không hợp lệ." });
        }

        var holdTokenData = await _redisService.GetObjectAsync<HoldTokenData>($"hold:token:{holdToken}")
                         ?? await _redisService.GetObjectAsync<HoldTokenData>($"hold:{holdToken}");

        if (holdTokenData == null)
        {
            return NotFound(new { message = "Hold token không tồn tại hoặc đã hết hạn." });
        }

        foreach (var seatId in holdTokenData.SeatIds)
        {
            await _redisService.RemoveAsync($"hold:{holdTokenData.ShowtimeId}:{seatId}");
        }

        if (holdTokenData.ShowtimeSeatIds != null)
        {
            foreach (var ssId in holdTokenData.ShowtimeSeatIds)
            {
                await _redisService.RemoveAsync($"hold:{holdTokenData.ShowtimeId}:{ssId}");
            }
        }

        await _redisService.RemoveAsync($"hold:token:{holdToken}");
        await _redisService.RemoveAsync($"hold:{holdToken}");

        return Ok(new
        {
            message = "Đã giải phóng ghế thành công.",
            holdToken,
            showtimeId = holdTokenData.ShowtimeId,
            seatIds = holdTokenData.SeatIds
        });
    }

    [HttpDelete("{id:guid}/hold-seats")]
    public async Task<IActionResult> ReleaseShowtimeHold(Guid id, [FromQuery] string? holdToken)
    {
        if (string.IsNullOrWhiteSpace(holdToken))
        {
            return BadRequest(new { message = "Cần cung cấp holdToken để giải phóng ghế." });
        }

        return await ReleaseHold(holdToken);
    }

    private async Task CleanupExpiredPendingBookingsAsync(Guid showtimeId)
    {
        try
        {
            var now = DateTime.UtcNow;
            var expiredBookings = await _context.Bookings
                .Include(b => b.Tickets)
                    .ThenInclude(t => t.ShowtimeSeat)
                .Where(b => b.Status == "pending"
                         && b.ExpiresAt != null
                         && b.ExpiresAt < now
                         && b.Tickets.Any(t => t.ShowtimeSeat.ShowtimeId == showtimeId))
                .ToListAsync();

            if (expiredBookings.Any())
            {
                foreach (var b in expiredBookings)
                {
                    b.Status = "cancelled";
                    b.UpdatedAt = now;
                    foreach (var t in b.Tickets)
                    {
                        if (t.ShowtimeSeat != null && t.ShowtimeSeat.ShowtimeId == showtimeId)
                        {
                            t.ShowtimeSeat.Status = "available";
                        }
                    }
                    _context.Tickets.RemoveRange(b.Tickets);
                }
                await _context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            // Log nhưng không làm gián đoạn luồng chính
            Console.WriteLine($"[LazySweep] Lỗi khi dọn dẹp booking hết hạn: {ex.Message}");
        }
    }
}
