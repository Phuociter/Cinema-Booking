namespace MovieBooking.Data.Entities;

public class Cinema : ISoftDeletable
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Hotline { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<Auditorium> Auditoriums { get; set; } = new List<Auditorium>();
    public ICollection<CinemaSnack> CinemaSnacks { get; set; } = new List<CinemaSnack>();
}
