namespace MovieBooking.Data.Entities;

public class Ticket
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public Guid ShowtimeSeatId { get; set; }
    public ShowtimeSeat ShowtimeSeat { get; set; } = null!;
    public decimal Price { get; set; }
    public string? QrCode { get; set; }
    public DateTime CreatedAt { get; set; }
}
