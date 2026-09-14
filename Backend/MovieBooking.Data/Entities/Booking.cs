namespace MovieBooking.Data.Entities;

public class Booking
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string BookingCode { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "pending"; // pending, success, cancelled
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<BookingSnack> BookingSnacks { get; set; } = new List<BookingSnack>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
