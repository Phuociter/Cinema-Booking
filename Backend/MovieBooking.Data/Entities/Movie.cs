namespace MovieBooking.Data.Entities;

public class Movie : ISoftDeletable
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? OriginalTitle { get; set; }
    public string? Overview { get; set; }
    public int DurationMin { get; set; }
    public string? AgeRating { get; set; }
    public string? PosterUrl { get; set; }
    public string? BackdropUrl { get; set; }
    public string? TrailerUrl { get; set; }
    public DateOnly? ReleaseDate { get; set; }
    public decimal? RatingScore { get; set; }
    public string Status { get; set; } = "coming_soon";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<MovieGenre> MovieGenres { get; set; } = new List<MovieGenre>();
    public ICollection<MovieDirector> MovieDirectors { get; set; } = new List<MovieDirector>();
    public ICollection<MovieActor> MovieActors { get; set; } = new List<MovieActor>();
    public ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
}
