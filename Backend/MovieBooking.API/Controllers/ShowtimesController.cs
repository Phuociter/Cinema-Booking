using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Data.Constants;
using MovieBooking.Data.Entities;
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
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _scheduleService.GetShowtimesAsync(movieId, cinemaId, date, dateFrom, dateTo, status, page, pageSize);
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

    // POST /api/showtimes
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateShowtime([FromBody] CreateShowtimeRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Dữ liệu yêu cầu không hợp lệ." });
        }

        if (request.BasePrice < 0)
        {
            return BadRequest(new { message = "Giá vé cơ bản phải lớn hơn hoặc bằng 0." });
        }

        if (request.StartTime <= DateTime.UtcNow)
        {
            return BadRequest(new { message = "Thời gian bắt đầu suất chiếu phải ở tương lai." });
        }

        var movie = await _context.Movies
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == request.MovieId && m.DeletedAt == null);

        if (movie == null)
        {
            return BadRequest(new { message = "Phim không tồn tại hoặc đã bị xóa." });
        }

        var auditorium = await _context.Auditoriums
            .Include(a => a.Cinema)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == request.AuditoriumId && a.DeletedAt == null);

        if (auditorium == null)
        {
            return BadRequest(new { message = "Phòng chiếu không tồn tại hoặc đã bị xóa." });
        }

        // end_time = start_time + movies.duration_min (Không buffer)
        var endTime = request.StartTime.AddMinutes(movie.DurationMin);

        var showtime = new Showtime
        {
            Id = Guid.NewGuid(),
            MovieId = movie.Id,
            AuditoriumId = auditorium.Id,
            StartTime = request.StartTime,
            EndTime = endTime,
            BasePrice = request.BasePrice,
            Status = ShowtimeStatus.Scheduled,
            CreatedAt = DateTime.UtcNow
        };

        // Lấy tất cả ghế vật lý trong phòng chiếu
        var physicalSeats = await _context.Seats
            .Where(s => s.AuditoriumId == auditorium.Id)
            .AsNoTracking()
            .ToListAsync();

        if (!physicalSeats.Any())
        {
            return BadRequest(new { message = "Phòng chiếu chưa có cấu hình ghế vật lý." });
        }

        var showtimeSeats = physicalSeats.Select(s => new ShowtimeSeat
        {
            Id = Guid.NewGuid(),
            ShowtimeId = showtime.Id,
            SeatId = s.Id,
            Status = "available"
        }).ToList();

        // Trong 1 transaction, lỗi thì rollback toàn bộ
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            _context.Showtimes.Add(showtime);
            await _context.ShowtimeSeats.AddRangeAsync(showtimeSeats);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            await transaction.RollbackAsync();

            if (ex.InnerException is Npgsql.PostgresException pgEx && pgEx.SqlState == "23P01")
            {
                return StatusCode(409, new
                {
                    message = "Phòng chiếu đã có suất chiếu khác trong khung giờ này (trùng lịch chiếu).",
                    auditoriumId = auditorium.Id,
                    auditoriumName = auditorium.Name,
                    startTime = request.StartTime,
                    endTime = endTime
                });
            }

            throw;
        }

        var responseDto = new ShowtimeDto
        {
            Id = showtime.Id,
            MovieId = movie.Id,
            MovieTitle = movie.Title,
            PosterUrl = movie.PosterUrl,
            AuditoriumId = auditorium.Id,
            AuditoriumName = auditorium.Name,
            CinemaId = auditorium.CinemaId,
            CinemaName = auditorium.Cinema?.Name ?? string.Empty,
            City = auditorium.Cinema?.City,
            Address = auditorium.Cinema?.Address,
            HallType = auditorium.HallType,
            StartTime = showtime.StartTime,
            EndTime = showtime.EndTime,
            BasePrice = showtime.BasePrice,
            Status = showtime.Status
        };

        await _scheduleService.InvalidateShowtimesCacheAsync();

        return CreatedAtAction(nameof(GetShowtimeById), new { id = showtime.Id }, responseDto);
    }

    // PUT /api/showtimes/{id}/cancel
    [HttpPut("{id:guid}/cancel")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CancelShowtime(Guid id)
    {
        var showtime = await _context.Showtimes
            .FirstOrDefaultAsync(s => s.Id == id);

        if (showtime == null)
        {
            return NotFound(new { message = $"Không tìm thấy suất chiếu với ID: {id}" });
        }

        if (showtime.Status == ShowtimeStatus.Cancelled)
        {
            return BadRequest(new { message = "Suất chiếu này đã bị hủy trước đó." });
        }

        // Kiểm tra booking liên quan qua tickets -> showtime_seat
        var relatedBookings = await _context.Bookings
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
            .Where(b => b.Tickets.Any(t => t.ShowtimeSeat.ShowtimeId == id))
            .ToListAsync();

        // 1. Có booking "success" -> 409
        var hasSuccessBooking = relatedBookings.Any(b => b.Status == "success");
        if (hasSuccessBooking)
        {
            return StatusCode(409, new { message = "Không thể hủy suất chiếu đã có vé được thanh toán thành công." });
        }

        // 2. Chỉ có "pending" (hoặc không có booking nào):
        var pendingBookings = relatedBookings.Where(b => b.Status == "pending").ToList();
        var keysToRemove = new List<string>();

        // Cập nhật booking pending + showtime.status trong 1 transaction
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            foreach (var b in pendingBookings)
            {
                b.Status = "cancelled";
                b.UpdatedAt = DateTime.UtcNow;

                foreach (var ticket in b.Tickets)
                {
                    if (ticket.ShowtimeSeat != null && ticket.ShowtimeSeat.ShowtimeId == id)
                    {
                        ticket.ShowtimeSeat.Status = "available";

                        // Thu thập key Redis hold theo CẢ 2 format
                        keysToRemove.Add($"hold:{id}:{ticket.ShowtimeSeat.SeatId}");
                        if (ticket.ShowtimeSeat.Id != ticket.ShowtimeSeat.SeatId)
                        {
                            keysToRemove.Add($"hold:{id}:{ticket.ShowtimeSeat.Id}");
                        }
                    }
                }
                _context.Tickets.RemoveRange(b.Tickets);
            }

            // Thu thập thêm tất cả các ghế của suất chiếu để xóa bất kỳ hold key nào còn sót lại
            var showtimeSeats = await _context.ShowtimeSeats.Where(ss => ss.ShowtimeId == id).ToListAsync();
            foreach (var ss in showtimeSeats)
            {
                keysToRemove.Add($"hold:{id}:{ss.SeatId}");
                if (ss.Id != ss.SeatId)
                {
                    keysToRemove.Add($"hold:{id}:{ss.Id}");
                }
            }

            showtime.Status = ShowtimeStatus.Cancelled;
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        // Xóa key Redis SAU KHI commit DB thành công theo CẢ 2 format bằng RemoveAsync từng key
        foreach (var key in keysToRemove.Distinct())
        {
            await _redisService.RemoveAsync(key);
        }

        await _scheduleService.InvalidateShowtimesCacheAsync();

        return Ok(new
        {
            message = "Hủy suất chiếu thành công.",
            showtimeId = id,
            status = showtime.Status,
            cancelledPendingBookingsCount = pendingBookings.Count
        });
    }

    // PUT /api/showtimes/{id}/restore
    [HttpPut("{id:guid}/restore")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RestoreShowtime(Guid id)
    {
        var showtime = await _context.Showtimes
            .FirstOrDefaultAsync(s => s.Id == id);

        if (showtime == null)
        {
            return NotFound(new { message = $"Không tìm thấy suất chiếu với ID: {id}" });
        }

        if (showtime.Status != ShowtimeStatus.Cancelled)
        {
            return BadRequest(new { message = "Chỉ có thể mở lại suất chiếu đã bị hủy." });
        }

        if (showtime.StartTime <= DateTime.UtcNow)
        {
            return BadRequest(new { message = "Không thể mở lại suất chiếu đã qua thời gian bắt đầu." });
        }

        // Kiểm tra xem phòng chiếu trong khung giờ này đã có suất chiếu nào khác đang active không
        var hasOverlap = await _context.Showtimes
            .AnyAsync(s => s.Id != id
                        && s.AuditoriumId == showtime.AuditoriumId
                        && s.Status != ShowtimeStatus.Cancelled
                        && s.StartTime < showtime.EndTime
                        && s.EndTime > showtime.StartTime);

        if (hasOverlap)
        {
            return StatusCode(409, new { message = "Không thể mở lại vì phòng chiếu đã có một suất chiếu khác hoạt động trong khung giờ này." });
        }

        showtime.Status = ShowtimeStatus.Scheduled;
        await _context.SaveChangesAsync();

        // Xóa cache Redis danh sách suất chiếu
        await _scheduleService.InvalidateShowtimesCacheAsync();

        return Ok(new
        {
            message = "Mở lại suất chiếu thành công.",
            showtimeId = id,
            status = showtime.Status
        });
    }

    // GET /api/showtimes/{id}/admin-seats
    [HttpGet("{id:guid}/admin-seats")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<AdminShowtimeSeatDto>>> GetAdminShowtimeSeats(Guid id)
    {
        var showtime = await _context.Showtimes
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id);

        if (showtime == null)
        {
            return NotFound(new { message = $"Không tìm thấy suất chiếu với ID: {id}" });
        }

        var showtimeSeats = await _context.ShowtimeSeats
            .Include(ss => ss.Seat)
                .ThenInclude(s => s.SeatType)
            .Where(ss => ss.ShowtimeId == id)
            .OrderBy(ss => ss.Seat.RowLabel)
            .ThenBy(ss => ss.Seat.ColumnNumber)
            .ToListAsync();

        var showtimeSeatIds = showtimeSeats.Select(ss => ss.Id).ToList();

        // Lấy các vé active (success hoặc pending)
        var tickets = await _context.Tickets
            .Include(t => t.Booking)
                .ThenInclude(b => b.User)
            .Where(t => showtimeSeatIds.Contains(t.ShowtimeSeatId)
                     && (t.Booking.Status == "success" || t.Booking.Status == "pending"))
            .ToListAsync();

        var ticketLookup = tickets
            .OrderByDescending(t => t.Booking.Status == "success" ? 2 : 1)
            .GroupBy(t => t.ShowtimeSeatId)
            .ToDictionary(g => g.Key, g => g.First());

        // Kiểm tra Redis hold cho từng seatId (KHÔNG dùng KEYS/SCAN)
        var redisHoldStatus = new Dictionary<Guid, string?>();
        foreach (var ss in showtimeSeats)
        {
            var holder = await _redisService.GetStringAsync($"hold:{id}:{ss.SeatId}");
            if (!string.IsNullOrEmpty(holder))
            {
                redisHoldStatus[ss.SeatId] = holder;
            }
        }

        var result = new List<AdminShowtimeSeatDto>();

        foreach (var ss in showtimeSeats)
        {
            var seat = ss.Seat;
            var extraPrice = seat?.SeatType?.ExtraPrice ?? 0m;
            var price = showtime.BasePrice + extraPrice;

            string status;
            SeatCustomerInfoDto? customerInfo = null;

            if (ticketLookup.TryGetValue(ss.Id, out var ticket) && ticket.Booking != null)
            {
                var booking = ticket.Booking;
                var user = booking.User;

                if (booking.Status == "success")
                {
                    status = "sold";
                    customerInfo = new SeatCustomerInfoDto
                    {
                        CustomerName = user?.FullName,
                        Email = user?.Email,
                        Phone = user?.Phone,
                        BookingCode = booking.BookingCode,
                        BookingStatus = booking.Status,
                        BookedAt = booking.CreatedAt,
                        HoldingExpiresAt = null
                    };
                }
                else // pending
                {
                    status = "holding";
                    customerInfo = new SeatCustomerInfoDto
                    {
                        CustomerName = user?.FullName,
                        Email = user?.Email,
                        Phone = user?.Phone,
                        BookingCode = booking.BookingCode,
                        BookingStatus = booking.Status,
                        BookedAt = booking.CreatedAt,
                        HoldingExpiresAt = booking.ExpiresAt
                    };
                }
            }
            else if (string.Equals(ss.Status, "maintenance", StringComparison.OrdinalIgnoreCase))
            {
                status = "maintenance";
            }
            else if (redisHoldStatus.ContainsKey(ss.SeatId))
            {
                status = "holding";
            }
            else
            {
                status = "available";
            }

            result.Add(new AdminShowtimeSeatDto
            {
                ShowtimeSeatId = ss.Id,
                SeatId = ss.SeatId,
                SeatCode = seat?.SeatCode ?? string.Empty,
                RowLabel = seat?.RowLabel ?? string.Empty,
                ColumnNumber = seat?.ColumnNumber ?? 0,
                SeatTypeId = seat?.SeatTypeId ?? Guid.Empty,
                SeatTypeName = seat?.SeatType?.Name ?? string.Empty,
                ColorCode = seat?.SeatType?.ColorCode ?? string.Empty,
                Price = price,
                Status = status,
                CustomerInfo = customerInfo
            });
        }

        return Ok(result);
    }

    // PUT /api/showtimes/{id}/seats/{seatId}/maintenance
    [HttpPut("{id:guid}/seats/{seatId:guid}/maintenance")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetSeatMaintenance(
        Guid id,
        Guid seatId,
        [FromBody] SetSeatMaintenanceRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Dữ liệu yêu cầu không hợp lệ." });
        }

        var showtime = await _context.Showtimes.FirstOrDefaultAsync(s => s.Id == id);
        if (showtime == null)
        {
            return NotFound(new { message = $"Không tìm thấy suất chiếu với ID: {id}" });
        }

        if (showtime.Status == ShowtimeStatus.Cancelled)
        {
            return StatusCode(409, new { message = "Không thể thay đổi trạng thái bảo trì của suất chiếu đã bị hủy." });
        }

        var showtimeSeat = await _context.ShowtimeSeats
            .Include(ss => ss.Seat)
            .FirstOrDefaultAsync(ss => ss.ShowtimeId == id && ss.SeatId == seatId);

        if (showtimeSeat == null)
        {
            return NotFound(new { message = $"Không tìm thấy ghế với ID {seatId} trong suất chiếu {id}." });
        }

        // Chặn 409 nếu ghế đang sold hoặc gắn booking pending
        var activeTicket = await _context.Tickets
            .Include(t => t.Booking)
            .FirstOrDefaultAsync(t => t.ShowtimeSeatId == showtimeSeat.Id
                                   && (t.Booking.Status == "success" || t.Booking.Status == "pending"));

        if (activeTicket != null)
        {
            var isSold = activeTicket.Booking.Status == "success";
            var msg = isSold
                ? "Không thể thay đổi trạng thái bảo trì vì ghế đã được bán (thanh toán thành công)."
                : "Không thể thay đổi trạng thái bảo trì vì ghế đang có đơn đặt hàng (pending).";
            return StatusCode(409, new { message = msg });
        }

        var targetStatus = request.Maintenance ? "maintenance" : "available";

        // Idempotent: Nếu trạng thái hiện tại đã khớp với trạng thái đích
        if (string.Equals(showtimeSeat.Status, targetStatus, StringComparison.OrdinalIgnoreCase))
        {
            if (request.Maintenance)
            {
                await _redisService.RemoveAsync($"hold:{id}:{showtimeSeat.SeatId}");
                if (showtimeSeat.Id != showtimeSeat.SeatId)
                {
                    await _redisService.RemoveAsync($"hold:{id}:{showtimeSeat.Id}");
                }
            }

            return Ok(new
            {
                message = request.Maintenance ? "Ghế đã ở trạng thái bảo trì." : "Ghế đã ở trạng thái khả dụng.",
                showtimeId = id,
                seatId = showtimeSeat.SeatId,
                showtimeSeatId = showtimeSeat.Id,
                status = showtimeSeat.Status
            });
        }

        // Thực hiện cập nhật DB trong 1 transaction
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            showtimeSeat.Status = targetStatus;
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        // Xóa key Redis SAU COMMIT nếu khóa bảo trì (maintenance = true) theo CẢ 2 format
        if (request.Maintenance)
        {
            await _redisService.RemoveAsync($"hold:{id}:{showtimeSeat.SeatId}");
            if (showtimeSeat.Id != showtimeSeat.SeatId)
            {
                await _redisService.RemoveAsync($"hold:{id}:{showtimeSeat.Id}");
            }
        }

        return Ok(new
        {
            message = request.Maintenance ? "Đã khóa bảo trì ghế thành công." : "Đã mở khóa bảo trì ghế thành công.",
            showtimeId = id,
            seatId = showtimeSeat.SeatId,
            showtimeSeatId = showtimeSeat.Id,
            status = showtimeSeat.Status
        });
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
