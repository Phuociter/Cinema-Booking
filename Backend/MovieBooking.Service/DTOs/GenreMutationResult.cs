namespace MovieBooking.Service.DTOs;

public sealed class GenreMutationResult
{
    public GenreDto? Genre { get; init; }
    public string? Error { get; init; }
    public bool NotFound { get; init; }
    public bool Conflict { get; init; }
}
