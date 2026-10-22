namespace MovieBooking.Service.DTOs;

public class PaymentCallbackRequest
{
    public Guid BookingId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string TransactionRef { get; set; } = string.Empty;
    public string Status { get; set; } = "success"; // success, failed
    public string Metadata { get; set; } = "{}";
}

public class PaymentResponseDto
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? TransactionRef { get; set; }
    public DateTime? PaidAt { get; set; }
}

public class CreatePaymentRequest
{
    public Guid BookingId { get; set; }
}

public class CreatePaymentResponse
{
    public Guid BookingId { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PayUrl { get; set; } = string.Empty;
    public string? QrCodeUrl { get; set; }
    public string? Deeplink { get; set; }
}

public class PaymentStatusResponse
{
    public Guid BookingId { get; set; }
    public string BookingStatus { get; set; } = string.Empty; // pending, success, cancelled
    public string PaymentStatus { get; set; } = string.Empty; // pending, success, failed
    public int ResultCode { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? TransId { get; set; }
    public decimal Amount { get; set; }
}
