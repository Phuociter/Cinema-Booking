namespace MovieBooking.Data.Entities;

public class Seat
{
    public Guid Id { get; set; }
    public Guid AuditoriumId { get; set; }
    public Auditorium Auditorium { get; set; } = null!;
    public Guid SeatTypeId { get; set; }
    public SeatType SeatType { get; set; } = null!;
    public string RowLabel { get; set; } = string.Empty;
    public int ColumnNumber { get; set; }
    public string SeatCode { get; set; } = string.Empty;

    public ICollection<ShowtimeSeat> ShowtimeSeats { get; set; } = new List<ShowtimeSeat>();
}
