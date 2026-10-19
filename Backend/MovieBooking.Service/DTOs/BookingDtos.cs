namespace MovieBooking.Service.DTOs;

public class CreateBookingRequest
{
    public string HoldToken { get; set; } = string.Empty;
    public Guid? ShowtimeId { get; set; }
    public List<Guid>? ShowtimeSeatIds { get; set; } = new();
    public List<BookingSnackItemRequest> Snacks { get; set; } = new();
    public string PaymentProvider { get; set; } = "MOMO"; // VNPAY, MOMO, STRIPE
    public string PaymentMethod { get; set; } = "QR";
}

public class BookingCreatedResponse
{
    public Guid BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class BookingSnackItemRequest
{
    public Guid CinemaSnackId { get; set; }
    public int Quantity { get; set; }
}

public class BookingResponseDto
{
    public Guid Id { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterUrl { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public string AuditoriumName { get; set; } = string.Empty;
    public DateTime ShowtimeStart { get; set; }
    public List<TicketDto> Tickets { get; set; } = new();
    public List<BookingSnackDto> Snacks { get; set; } = new();
    public string? PaymentUrl { get; set; }
}

public class TicketDto
{
    public Guid Id { get; set; }
    public string SeatCode { get; set; } = string.Empty;
    public string RowLabel { get; set; } = string.Empty;
    public int ColumnNumber { get; set; }
    public string SeatTypeName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? QrCode { get; set; }
}

public class BookingSnackDto
{
    public string SnackName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice => UnitPrice * Quantity;
}
