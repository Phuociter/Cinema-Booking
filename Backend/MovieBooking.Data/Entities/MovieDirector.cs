namespace MovieBooking.Data.Entities;

public class MovieDirector
{
    public Guid MovieId { get; set; }
    public Movie Movie { get; set; } = null!;
    public Guid DirectorId { get; set; }
    public Director Director { get; set; } = null!;
}
