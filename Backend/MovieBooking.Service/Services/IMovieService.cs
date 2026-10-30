using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public interface IMovieService
{
    Task<MovieListResponse> GetMoviesAsync(
        string? status, string? search, string? genre, string sortBy,
        string? city, Guid? cinemaId, int page, int pageSize,
        CancellationToken cancellationToken = default);

    Task<MovieDto?> GetMovieByIdAsync(
        Guid id, CancellationToken cancellationToken = default);

    Task<List<GenreDto>> GetGenresAsync(
        CancellationToken cancellationToken = default);

    Task<MovieDto> CreateMovieAsync(
        CreateMovieRequest request, CancellationToken cancellationToken = default);

    Task<MovieDto?> UpdateMovieAsync(
        Guid id, UpdateMovieRequest request, CancellationToken cancellationToken = default);

    Task<bool> SoftDeleteMovieAsync(
        Guid id, CancellationToken cancellationToken = default);

    Task<GenreDto> CreateGenreAsync(
        GenreRequest request, CancellationToken cancellationToken = default);

    Task<GenreDto?> UpdateGenreAsync(
        Guid id, GenreRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteGenreAsync(
        Guid id, CancellationToken cancellationToken = default);
}
