namespace MovieBooking.Service.DTOs;

public class MovieDto
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
    public string Status { get; set; } = string.Empty;
    public List<string> Genres { get; set; } = new();
    public List<string> Directors { get; set; } = new();
    public List<MovieActorDto> Actors { get; set; } = new();
}

public class MovieActorDto
{
    public Guid ActorId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ProfilePath { get; set; }
    public string? CharacterName { get; set; }
}

public class CreateMovieRequest
{
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
    public List<Guid> GenreIds { get; set; } = new();
    public List<Guid> DirectorIds { get; set; } = new();
}
