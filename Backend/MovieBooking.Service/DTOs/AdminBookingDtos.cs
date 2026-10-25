namespace MovieBooking.Service.DTOs;

public class AdminBookingsQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Status { get; set; }
    public string? Search { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
    public Guid? CinemaId { get; set; }
    public Guid? MovieId { get; set; }
}

public class AdminBookingDto
{
    public Guid Id { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string DisplayStatus { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }

    public string? CustomerName { get; set; }
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }

    public int TicketCount { get; set; }
    public string? MovieTitle { get; set; }
    public string? CinemaName { get; set; }
    public DateTime? ShowtimeStart { get; set; }

    public string? PaymentProvider { get; set; }
    public string? PaymentStatus { get; set; }
}

public class AdminBookingDetailDto : AdminBookingDto
{
    public string? AuditoriumName { get; set; }
    public List<AdminBookingTicketDto> Tickets { get; set; } = new();
    public List<AdminBookingSnackDto> Snacks { get; set; } = new();
    public List<AdminBookingPaymentDto> Payments { get; set; } = new();
}

public class AdminBookingTicketDto
{
    public Guid Id { get; set; }
    public string SeatCode { get; set; } = string.Empty;
    public string RowLabel { get; set; } = string.Empty;
    public int ColumnNumber { get; set; }
    public string SeatTypeName { get; set; } = string.Empty;
    public decimal Price { get; set; }
}

public class AdminBookingSnackDto
{
    public string SnackName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice => UnitPrice * Quantity;
}

public class AdminBookingPaymentDto
{
    public string Provider { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? TransactionRef { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public enum AdminBookingListOutcome
{
    Success,
    InvalidStatus,
    InvalidSearch,
    InvalidDateRange
}

public class AdminBookingListResult
{
    public AdminBookingListOutcome Outcome { get; set; }
    public PagedResult<AdminBookingDto>? Data { get; set; }
    public string? ErrorMessage { get; set; }
}

public enum AdminBookingDetailOutcome
{
    Success,
    NotFound
}

public class AdminBookingDetailResult
{
    public AdminBookingDetailOutcome Outcome { get; set; }
    public AdminBookingDetailDto? Data { get; set; }
    public string? ErrorMessage { get; set; }
}
