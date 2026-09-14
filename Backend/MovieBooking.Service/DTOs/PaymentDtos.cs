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
