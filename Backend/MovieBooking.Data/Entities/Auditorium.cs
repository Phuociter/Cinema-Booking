namespace MovieBooking.Data.Entities;

public class Auditorium : ISoftDeletable
{
    public Guid Id { get; set; }
    public Guid CinemaId { get; set; }
    public Cinema Cinema { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string HallType { get; set; } = "2D";
    public int? TotalRows { get; set; }
    public int? TotalColumns { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<Seat> Seats { get; set; } = new List<Seat>();
    public ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
}
