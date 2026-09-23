using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Interfaces;

public interface IMovieService
{
    Task<(List<MovieDto> Items, int TotalItems)> GetAllMoviesAsync(
        string? status,
        string? search,
        int page,
        int pageSize);

    Task<MovieDto?> GetMovieByIdAsync(Guid id);

    Task<List<string>> GetGenresAsync();
}
