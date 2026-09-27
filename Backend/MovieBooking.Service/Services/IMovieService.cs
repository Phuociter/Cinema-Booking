using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public interface IMovieService
{
    Task<MovieListResponse> GetMoviesAsync(string? status, string? search, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<MovieDto?> GetMovieByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<GenreDto>> GetGenresAsync(CancellationToken cancellationToken = default);
}