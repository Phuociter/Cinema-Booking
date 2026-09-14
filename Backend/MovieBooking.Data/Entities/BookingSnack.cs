namespace MovieBooking.Data.Entities;

public class BookingSnack
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public Guid CinemaSnackId { get; set; }
    public CinemaSnack CinemaSnack { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
