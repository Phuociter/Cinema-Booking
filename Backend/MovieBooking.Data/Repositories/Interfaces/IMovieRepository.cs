using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories.Interfaces;

public interface IMovieRepository
{
    Task<(List<Movie> Items, int TotalItems)> GetMoviesPagedAsync(
        string? status,
        string? search,
        string? genre,
        string sortBy,
        string? city,
        Guid? cinemaId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<Movie?> GetMovieByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task PopulateRelationsAsync(
        List<Movie> movies,
        CancellationToken cancellationToken = default);

    Task AddMovieAsync(
        Movie movie,
        CancellationToken cancellationToken = default);

    Task UpdateMovieAsync(
        Movie movie,
        CancellationToken cancellationToken = default);

    Task<bool> SoftDeleteMovieAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<bool> GenresExistAsync(
        IEnumerable<Guid> ids,
        CancellationToken cancellationToken = default);

    Task<bool> DirectorsExistAsync(
        IEnumerable<Guid> ids,
        CancellationToken cancellationToken = default);

    Task<bool> ActorsExistAsync(
        IEnumerable<Guid> ids,
        CancellationToken cancellationToken = default);
}
