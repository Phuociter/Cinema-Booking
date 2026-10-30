using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories.Interfaces;

public interface IGenreRepository
{
    Task<List<Genre>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<Genre?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task AddAsync(
        Genre genre,
        CancellationToken cancellationToken = default);

    Task UpdateAsync(
        Genre genre,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsByNameAsync(
        string name,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default);
}
