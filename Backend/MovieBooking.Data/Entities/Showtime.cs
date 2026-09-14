namespace MovieBooking.Data.Entities;

public class Showtime
{
    public Guid Id { get; set; }
    public Guid MovieId { get; set; }
    public Movie Movie { get; set; } = null!;
    public Guid AuditoriumId { get; set; }
    public Auditorium Auditorium { get; set; } = null!;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public decimal BasePrice { get; set; }
    public string Status { get; set; } = "scheduled"; // scheduled, cancelled, completed
    public DateTime CreatedAt { get; set; }

    public ICollection<ShowtimeSeat> ShowtimeSeats { get; set; } = new List<ShowtimeSeat>();
}
