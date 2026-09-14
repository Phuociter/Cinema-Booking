namespace MovieBooking.Data.Entities;

public class Snack : ISoftDeletable
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? Description { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<CinemaSnack> CinemaSnacks { get; set; } = new List<CinemaSnack>();
}
