namespace MovieBooking.Data.Entities;

public class ShowtimeSeat
{
    public Guid Id { get; set; }
    public Guid ShowtimeId { get; set; }
    public Showtime Showtime { get; set; } = null!;
    public Guid SeatId { get; set; }
    public Seat Seat { get; set; } = null!;
    public string Status { get; set; } = "available"; // available, reserved

    public Ticket? Ticket { get; set; }
}
