namespace MovieBooking.Data.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public string Provider { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = "pending"; // pending, success, failed
    public string? TransactionRef { get; set; }
    public string Metadata { get; set; } = "{}"; // JSONB column in PostgreSQL
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
