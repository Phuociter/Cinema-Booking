namespace MovieBooking.Data.Entities;

public class Director
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }

    public ICollection<MovieDirector> MovieDirectors { get; set; } = new List<MovieDirector>();
}
