namespace MovieBooking.Data.Entities;

public class Actor
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ProfilePath { get; set; }

    public ICollection<MovieActor> MovieActors { get; set; } = new List<MovieActor>();
}
