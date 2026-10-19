using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Data.Entities;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IRedisService _redisService;
    private readonly ILogger<BookingsController> _logger;

    public BookingsController(
        AppDbContext context,
        IRedisService redisService,
        ILogger<BookingsController> logger)
    {
        _context = context;
        _redisService = redisService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new { message = "Người dùng chưa đăng nhập hoặc token không hợp lệ." });
        }

        if (string.IsNullOrWhiteSpace(request?.HoldToken))
        {
            return BadRequest(new { message = "HoldToken là bắt buộc để tạo đơn đặt vé." });
        }

        // 1. Đọc hold data từ Redis theo holdToken, verify: tồn tại, chưa hết hạn, userId khớp user gọi
        var tokenKey = $"hold:token:{request.HoldToken}";
        var holdData = await _redisService.GetObjectAsync<HoldTokenData>(tokenKey)
                     ?? await _redisService.GetObjectAsync<HoldTokenData>($"hold:{request.HoldToken}");

        if (holdData == null)
        {
            return BadRequest(new { message = "Hold token không tồn tại hoặc đã hết hạn." });
        }

        if (holdData.ExpiresAt <= DateTime.UtcNow)
        {
            return BadRequest(new { message = "Hold token đã hết hạn giữ ghế." });
        }

        if (holdData.UserId != userId)
        {
            return StatusCode(403, new { message = "Bạn không có quyền sử dụng holdToken này." });
        }

        if (holdData.SeatIds == null || !holdData.SeatIds.Any())
        {
            return BadRequest(new { message = "Không tìm thấy danh sách ghế trong holdToken." });
        }

        var now = DateTime.UtcNow;
        var tenMinutesAgo = now.AddMinutes(-10);

        // Dọn dẹp booking pending đã hết hạn của user cho suất chiếu này (tránh chặn nhầm đơn đã hết hạn)
        await CleanupExpiredUserBookingsAsync(userId, holdData.ShowtimeId);

        // Tự động dọn dẹp đơn pending cũ của chính user cho suất chiếu này (nếu có) để tạo đơn mới
        var oldPendingBookings = await _context.Bookings
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
            .Where(b => b.UserId == userId
                     && b.Status == "pending"
                     && b.Tickets.Any(t => t.ShowtimeSeat.ShowtimeId == holdData.ShowtimeId))
            .ToListAsync();

        if (oldPendingBookings.Any())
        {
            foreach (var b in oldPendingBookings)
            {
                b.Status = "cancelled";
                b.UpdatedAt = now;
                foreach (var t in b.Tickets)
                {
                    if (t.ShowtimeSeat != null)
                    {
                        t.ShowtimeSeat.Status = "available";
                        await _redisService.RemoveAsync($"hold:{holdData.ShowtimeId}:{t.ShowtimeSeat.SeatId}");
                    }
                }
                _context.Tickets.RemoveRange(b.Tickets);
            }
            await _context.SaveChangesAsync();
        }

        // 2. Transaction trong PostgreSQL
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Verify lại từng ghế vẫn available trong DB (double-check, đề phòng race)
            var showtimeSeats = await _context.ShowtimeSeats
                .AsNoTracking()
                .Include(ss => ss.Seat)
                    .ThenInclude(s => s.SeatType)
                .Include(ss => ss.Showtime)
                .Where(ss => ss.ShowtimeId == holdData.ShowtimeId
                          && (holdData.SeatIds.Contains(ss.SeatId)
                              || (holdData.ShowtimeSeatIds != null && holdData.ShowtimeSeatIds.Contains(ss.Id))))
                .ToListAsync();

            if (showtimeSeats.Count != holdData.SeatIds.Count)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Một số ghế trong holdToken không tồn tại trong hệ thống." });
            }

            var unavailableSeats = showtimeSeats
                .Where(ss => !string.Equals(ss.Status, "available", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (unavailableSeats.Any())
            {
                await transaction.RollbackAsync();
                var seatCodes = unavailableSeats.Select(s => s.Seat?.SeatCode ?? s.SeatId.ToString());
                return Conflict(new
                {
                    message = $"Ghế không khả dụng (đã có người đặt): {string.Join(", ", seatCodes)}",
                    unavailableSeats = unavailableSeats.Select(s => s.SeatId)
                });
            }

            // 3. Tạo Booking: UserId, Status = 'pending', ExpiresAt = now + 10 phút, sinh booking_code dạng BK-{timestamp}-{random}
            var bookingCode = $"BK-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            var expiresAt = DateTime.UtcNow.AddMinutes(10);

            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                BookingCode = bookingCode,
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                ExpiresAt = expiresAt,
                TotalAmount = 0
            };

            // 4. Tạo Ticket cho từng ghế: Price = Showtime.BasePrice + SeatType.ExtraPrice (lưu snapshot vào tickets.price)
            decimal totalTicketsAmount = 0;
            var tickets = new List<Ticket>();
            foreach (var ss in showtimeSeats)
            {
                var basePrice = ss.Showtime?.BasePrice ?? 0;
                var extraPrice = ss.Seat?.SeatType?.ExtraPrice ?? 0;
                var ticketPrice = basePrice + extraPrice;
                totalTicketsAmount += ticketPrice;

                tickets.Add(new Ticket
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    ShowtimeSeatId = ss.Id,
                    Price = ticketPrice,
                    QrCode = $"TICKET-{booking.BookingCode}-{ss.Seat?.SeatCode ?? ss.Id.ToString()[..4]}",
                    CreatedAt = DateTime.UtcNow
                });
            }

            // 5. Tạo BookingSnack cho từng món (giá lấy từ CinemaSnack.Price hiện tại, snapshot vào unit_price)
            decimal totalSnacksAmount = 0;
            var bookingSnacks = new List<BookingSnack>();
            if (request.Snacks != null && request.Snacks.Any())
            {
                var validSnackItems = request.Snacks.Where(s => s.Quantity > 0).ToList();
                if (validSnackItems.Any())
                {
                    var snackIds = validSnackItems.Select(s => s.CinemaSnackId).Distinct().ToList();
                    var cinemaSnacks = await _context.CinemaSnacks
                        .Where(cs => snackIds.Contains(cs.Id) && cs.IsAvailable)
                        .ToDictionaryAsync(cs => cs.Id);

                    foreach (var item in validSnackItems)
                    {
                        if (!cinemaSnacks.TryGetValue(item.CinemaSnackId, out var cs))
                        {
                            await transaction.RollbackAsync();
                            return BadRequest(new { message = $"Bắp nước với ID {item.CinemaSnackId} không tồn tại hoặc đã hết hàng." });
                        }

                        var unitPrice = cs.Price;
                        totalSnacksAmount += unitPrice * item.Quantity;

                        bookingSnacks.Add(new BookingSnack
                        {
                            Id = Guid.NewGuid(),
                            BookingId = booking.Id,
                            CinemaSnackId = cs.Id,
                            Quantity = item.Quantity,
                            UnitPrice = unitPrice
                        });
                    }
                }
            }

            booking.TotalAmount = totalTicketsAmount + totalSnacksAmount;

            var showtimeSeatIds = showtimeSeats.Select(s => s.Id).ToList();

            // 6. Cập nhật có điều kiện: UPDATE showtimeseats SET status = 'reserved' WHERE id IN (...) AND status = 'available'
            var updatedRows = await _context.ShowtimeSeats
                .Where(ss => showtimeSeatIds.Contains(ss.Id) && ss.Status == "available")
                .ExecuteUpdateAsync(s => s.SetProperty(ss => ss.Status, "reserved"));

            if (updatedRows != showtimeSeatIds.Count)
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    message = "Một hoặc nhiều ghế đã bị người khác đặt trước trong lúc xử lý.",
                    expectedSeats = showtimeSeatIds.Count,
                    updatedSeats = updatedRows
                });
            }

            var oldTickets = await _context.Tickets.Where(t => showtimeSeatIds.Contains(t.ShowtimeSeatId)).ToListAsync();
            if (oldTickets.Any())
            {
                _context.Tickets.RemoveRange(oldTickets);
            }

            _context.Bookings.Add(booking);
            _context.Tickets.AddRange(tickets);
            if (bookingSnacks.Any())
            {
                _context.BookingSnacks.AddRange(bookingSnacks);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // 7. Xóa các key Redis hold liên quan đến holdToken này
            foreach (var seatId in holdData.SeatIds)
            {
                await _redisService.RemoveAsync($"hold:{holdData.ShowtimeId}:{seatId}");
            }
            if (holdData.ShowtimeSeatIds != null)
            {
                foreach (var ssId in holdData.ShowtimeSeatIds)
                {
                    await _redisService.RemoveAsync($"hold:{holdData.ShowtimeId}:{ssId}");
                }
            }
            await _redisService.RemoveAsync(tokenKey);
            await _redisService.RemoveAsync($"hold:{request.HoldToken}");

            // 8. Trả { bookingId, bookingCode, totalAmount, expiresAt }
            return Ok(new BookingCreatedResponse
            {
                BookingId = booking.Id,
                BookingCode = booking.BookingCode,
                TotalAmount = booking.TotalAmount,
                ExpiresAt = booking.ExpiresAt
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Lỗi khi tạo booking từ holdToken: {HoldToken}", request.HoldToken);
            return StatusCode(500, new { message = "Lỗi hệ thống khi tạo đơn đặt vé.", error = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetBookingById(Guid id)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new { message = "Người dùng chưa đăng nhập hoặc token không hợp lệ." });
        }

        var booking = await _context.Bookings
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Seat)
                        .ThenInclude(s => s.SeatType)
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Showtime)
                        .ThenInclude(st => st.Movie)
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Showtime)
                        .ThenInclude(st => st.Auditorium)
                            .ThenInclude(a => a.Cinema)
            .Include(b => b.BookingSnacks)
                .ThenInclude(bs => bs.CinemaSnack)
                    .ThenInclude(cs => cs.Snack)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null)
        {
            return NotFound(new { message = $"Không tìm thấy đơn đặt vé với ID: {id}" });
        }

        // Chỉ trả nếu booking.UserId == currentUserId, nếu không trả 403 Forbidden
        if (booking.UserId != userId)
        {
            return StatusCode(403, new { message = "Bạn không có quyền truy cập thông tin đơn đặt vé này." });
        }

        return Ok(MapToBookingResponseDto(booking));
    }

    [HttpGet("my-bookings")]
    public async Task<IActionResult> GetMyBookings([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new { message = "Người dùng chưa đăng nhập hoặc token không hợp lệ." });
        }

        // Lazy sweep: Dọn dẹp các đơn pending đã hết hạn của user trước khi lấy danh sách
        await CleanupExpiredUserBookingsAsync(userId);

        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 10;

        var query = _context.Bookings
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt);

        var totalCount = await query.CountAsync();

        var bookings = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Seat)
                        .ThenInclude(s => s.SeatType)
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Showtime)
                        .ThenInclude(st => st.Movie)
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Showtime)
                        .ThenInclude(st => st.Auditorium)
                            .ThenInclude(a => a.Cinema)
            .Include(b => b.BookingSnacks)
                .ThenInclude(bs => bs.CinemaSnack)
                    .ThenInclude(cs => cs.Snack)
            .ToListAsync();

        var result = new PagedResult<BookingResponseDto>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            Items = bookings.Select(MapToBookingResponseDto).ToList()
        };

        return Ok(result);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelBooking(Guid id)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new { message = "Người dùng chưa đăng nhập hoặc token không hợp lệ." });
        }

        var booking = await _context.Bookings
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

        if (booking == null)
        {
            return NotFound(new { message = $"Không tìm thấy đơn đặt vé với ID: {id}" });
        }

        if (booking.Status != "pending")
        {
            return BadRequest(new { message = "Chỉ có thể hủy đơn đặt vé đang ở trạng thái chờ thanh toán." });
        }

        booking.Status = "cancelled";
        booking.UpdatedAt = DateTime.UtcNow;

        foreach (var ticket in booking.Tickets)
        {
            if (ticket.ShowtimeSeat != null)
            {
                ticket.ShowtimeSeat.Status = "available";
                await _redisService.RemoveAsync($"hold:{ticket.ShowtimeSeat.ShowtimeId}:{ticket.ShowtimeSeat.SeatId}");
            }
        }
        _context.Tickets.RemoveRange(booking.Tickets);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã hủy đơn đặt vé và giải phóng ghế thành công.", bookingId = id });
    }

    private static BookingResponseDto MapToBookingResponseDto(Booking booking)
    {
        var firstTicket = booking.Tickets.FirstOrDefault();
        var showtime = firstTicket?.ShowtimeSeat?.Showtime;
        var movie = showtime?.Movie;
        var auditorium = showtime?.Auditorium;
        var cinema = auditorium?.Cinema;

        return new BookingResponseDto
        {
            Id = booking.Id,
            BookingCode = booking.BookingCode,
            TotalAmount = booking.TotalAmount,
            Status = booking.Status,
            CreatedAt = booking.CreatedAt,
            ExpiresAt = booking.ExpiresAt,
            MovieTitle = movie?.Title ?? string.Empty,
            PosterUrl = movie?.PosterUrl,
            CinemaName = cinema?.Name ?? string.Empty,
            AuditoriumName = auditorium?.Name ?? string.Empty,
            ShowtimeStart = showtime?.StartTime ?? DateTime.MinValue,
            Tickets = booking.Tickets.Select(t => new TicketDto
            {
                Id = t.Id,
                SeatCode = t.ShowtimeSeat?.Seat?.SeatCode ?? string.Empty,
                RowLabel = t.ShowtimeSeat?.Seat?.RowLabel ?? string.Empty,
                ColumnNumber = t.ShowtimeSeat?.Seat?.ColumnNumber ?? 0,
                SeatTypeName = t.ShowtimeSeat?.Seat?.SeatType?.Name ?? string.Empty,
                Price = t.Price,
                QrCode = t.QrCode
            }).ToList(),
            Snacks = booking.BookingSnacks.Select(bs => new BookingSnackDto
            {
                SnackName = bs.CinemaSnack?.Snack?.Name ?? string.Empty,
                Quantity = bs.Quantity,
                UnitPrice = bs.UnitPrice
            }).ToList()
        };
    }

    private async Task CleanupExpiredUserBookingsAsync(Guid userId, Guid? showtimeId = null)
    {
        try
        {
            var now = DateTime.UtcNow;
            var tenMinutesAgo = now.AddMinutes(-10);

            var query = _context.Bookings
                .Include(b => b.Tickets)
                    .ThenInclude(t => t.ShowtimeSeat)
                .Where(b => b.UserId == userId
                         && b.Status == "pending"
                         && ((b.ExpiresAt != null && b.ExpiresAt < now) || (b.ExpiresAt == null && b.CreatedAt < tenMinutesAgo)));

            if (showtimeId.HasValue)
            {
                query = query.Where(b => b.Tickets.Any(t => t.ShowtimeSeat.ShowtimeId == showtimeId.Value));
            }

            var expiredBookings = await query.ToListAsync();

            if (expiredBookings.Any())
            {
                foreach (var b in expiredBookings)
                {
                    b.Status = "cancelled";
                    b.UpdatedAt = now;
                    foreach (var t in b.Tickets)
                    {
                        if (t.ShowtimeSeat != null)
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
            _logger.LogError(ex, "[LazySweep] Lỗi khi dọn dẹp booking hết hạn của user {UserId}", userId);
        }
    }
}
