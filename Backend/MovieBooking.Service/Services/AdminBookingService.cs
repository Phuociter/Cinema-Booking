using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.Service.Services;

public class AdminBookingService : IAdminBookingService
{
    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "success",
        "pending",
        "cancelled",
        "expired"
    };

    private readonly IBookingRepository _bookingRepository;

    public AdminBookingService(IBookingRepository bookingRepository)
    {
        _bookingRepository = bookingRepository;
    }

    public async Task<AdminBookingListResult> GetBookingsAsync(AdminBookingsQuery query)
    {
        query ??= new AdminBookingsQuery();

        if (!string.IsNullOrWhiteSpace(query.Status) && !AllowedStatuses.Contains(query.Status.Trim()))
        {
            return new AdminBookingListResult
            {
                Outcome = AdminBookingListOutcome.InvalidStatus,
                ErrorMessage = "Trạng thái không hợp lệ. Chỉ chấp nhận: success, pending, cancelled, expired."
            };
        }

        if (query.DateFrom.HasValue && query.DateTo.HasValue && query.DateFrom.Value > query.DateTo.Value)
        {
            return new AdminBookingListResult
            {
                Outcome = AdminBookingListOutcome.InvalidDateRange,
                ErrorMessage = "dateFrom không được lớn hơn dateTo."
            };
        }

        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = Math.Clamp(query.PageSize <= 0 ? 20 : query.PageSize, 1, 100);

        var nowUtc = DateTime.UtcNow;
        var (items, totalCount) = await _bookingRepository.GetAdminBookingsAsync(
            query.Status,
            query.Search,
            query.DateFrom,
            query.DateTo,
            page,
            pageSize,
            nowUtc,
            query.CinemaId,
            query.MovieId);

        var dtos = items.Select(b => MapToAdminBookingDto(b, nowUtc)).ToList();

        return new AdminBookingListResult
        {
            Outcome = AdminBookingListOutcome.Success,
            Data = new PagedResult<AdminBookingDto>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                Items = dtos
            }
        };
    }

    public async Task<AdminBookingDetailResult> GetBookingDetailAsync(Guid id)
    {
        var booking = await _bookingRepository.GetAdminBookingDetailByIdAsync(id);
        if (booking == null)
        {
            return new AdminBookingDetailResult
            {
                Outcome = AdminBookingDetailOutcome.NotFound,
                ErrorMessage = $"Không tìm thấy đơn đặt vé với ID: {id}"
            };
        }

        var nowUtc = DateTime.UtcNow;
        var baseDto = MapToAdminBookingDto(booking, nowUtc);
        var firstTicket = booking.Tickets.FirstOrDefault();
        var showtime = firstTicket?.ShowtimeSeat?.Showtime;

        var detailDto = new AdminBookingDetailDto
        {
            Id = baseDto.Id,
            BookingCode = baseDto.BookingCode,
            Status = baseDto.Status,
            DisplayStatus = baseDto.DisplayStatus,
            TotalAmount = baseDto.TotalAmount,
            CreatedAt = baseDto.CreatedAt,
            ExpiresAt = baseDto.ExpiresAt,
            CustomerName = baseDto.CustomerName,
            CustomerEmail = baseDto.CustomerEmail,
            CustomerPhone = baseDto.CustomerPhone,
            TicketCount = baseDto.TicketCount,
            MovieTitle = baseDto.MovieTitle,
            CinemaName = baseDto.CinemaName,
            ShowtimeStart = baseDto.ShowtimeStart,
            PaymentProvider = baseDto.PaymentProvider,
            PaymentStatus = baseDto.PaymentStatus,
            AuditoriumName = showtime?.Auditorium?.Name,
            Tickets = booking.Tickets
                .OrderBy(t => t.ShowtimeSeat?.Seat?.RowLabel)
                .ThenBy(t => t.ShowtimeSeat?.Seat?.ColumnNumber)
                .Select(t => new AdminBookingTicketDto
                {
                    Id = t.Id,
                    SeatCode = t.ShowtimeSeat?.Seat?.SeatCode ?? string.Empty,
                    RowLabel = t.ShowtimeSeat?.Seat?.RowLabel ?? string.Empty,
                    ColumnNumber = t.ShowtimeSeat?.Seat?.ColumnNumber ?? 0,
                    SeatTypeName = t.ShowtimeSeat?.Seat?.SeatType?.Name ?? string.Empty,
                    Price = t.Price
                }).ToList(),
            Snacks = booking.BookingSnacks.Select(bs => new AdminBookingSnackDto
            {
                SnackName = bs.CinemaSnack?.Snack?.Name ?? string.Empty,
                Quantity = bs.Quantity,
                UnitPrice = bs.UnitPrice
            }).ToList(),
            Payments = booking.Payments
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new AdminBookingPaymentDto
                {
                    Provider = p.Provider,
                    Method = p.Method,
                    Amount = p.Amount,
                    Status = p.Status,
                    TransactionRef = p.TransactionRef,
                    PaidAt = p.PaidAt,
                    CreatedAt = p.CreatedAt
                }).ToList()
        };

        return new AdminBookingDetailResult
        {
            Outcome = AdminBookingDetailOutcome.Success,
            Data = detailDto
        };
    }

    private static AdminBookingDto MapToAdminBookingDto(Booking b, DateTime nowUtc)
    {
        var displayStatus = b.Status;
        if (string.Equals(b.Status, "success", StringComparison.OrdinalIgnoreCase))
        {
            displayStatus = "success";
        }
        else if (string.Equals(b.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
        {
            displayStatus = "cancelled";
        }
        else if (string.Equals(b.Status, "pending", StringComparison.OrdinalIgnoreCase))
        {
            if (b.ExpiresAt.HasValue && b.ExpiresAt.Value < nowUtc)
            {
                displayStatus = "expired";
            }
            else
            {
                displayStatus = "pending";
            }
        }

        var firstTicket = b.Tickets.FirstOrDefault();
        var showtime = firstTicket?.ShowtimeSeat?.Showtime;
        var latestPayment = b.Payments.OrderByDescending(p => p.CreatedAt).FirstOrDefault();

        return new AdminBookingDto
        {
            Id = b.Id,
            BookingCode = b.BookingCode,
            Status = b.Status,
            DisplayStatus = displayStatus,
            TotalAmount = b.TotalAmount,
            CreatedAt = b.CreatedAt,
            ExpiresAt = b.ExpiresAt,
            CustomerName = b.User?.FullName,
            CustomerEmail = b.User?.Email ?? string.Empty,
            CustomerPhone = b.User?.Phone,
            TicketCount = b.Tickets.Count,
            MovieTitle = showtime?.Movie?.Title,
            CinemaName = showtime?.Auditorium?.Cinema?.Name,
            ShowtimeStart = showtime?.StartTime,
            PaymentProvider = latestPayment?.Provider,
            PaymentStatus = latestPayment?.Status
        };
    }
}
