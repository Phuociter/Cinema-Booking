using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories.Interfaces;

public interface IActorRepository
{
    Task<(List<Actor> Items, int TotalCount)> GetActorsAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<List<Actor>> GetAllActorsAsync(
        string? search = null,
        CancellationToken cancellationToken = default);

    Task<Actor?> GetActorByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task AddActorAsync(
        Actor actor,
        CancellationToken cancellationToken = default);

    Task UpdateActorAsync(
        Actor actor,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteActorAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<bool> IsActorInUseAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsByNameAsync(
        string name,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default);
}
