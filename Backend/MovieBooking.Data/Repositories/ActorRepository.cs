using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;

namespace MovieBooking.Data.Repositories;

public class ActorRepository : GenericRepository<Actor>, IActorRepository
{
    public ActorRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<(List<Actor> Items, int TotalCount)> GetActorsAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Actors.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(actor =>
                EF.Functions.ILike(actor.Name, $"%{keyword}%"));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
    .OrderBy(actor => actor.Name)
    .ThenBy(actor => actor.Id)
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .Select(actor => new Actor
    {
        Id = actor.Id,
        Name = actor.Name,
        ProfilePath = actor.ProfilePath,
        MovieActors = actor.MovieActors
    })
    .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<List<Actor>> GetAllActorsAsync(
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        IQueryable<Actor> query = _context.Actors.AsNoTracking().Include(actor => actor.MovieActors);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(actor =>
                EF.Functions.ILike(actor.Name, $"%{keyword}%"));
        }

        return await query
            .OrderBy(actor => actor.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Actor?> GetActorByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await _context.Actors
            .AsNoTracking()
            .Include(actor => actor.MovieActors)
            .FirstOrDefaultAsync(
                actor => actor.Id == id,
                cancellationToken);
    }

    public async Task AddActorAsync(
        Actor actor,
        CancellationToken cancellationToken = default)
    {
        await _context.Actors.AddAsync(actor, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateActorAsync(
     Actor actor,
     CancellationToken cancellationToken = default)
    {
        var existingActor = await _context.Actors
            .FirstOrDefaultAsync(
                item => item.Id == actor.Id,
                cancellationToken);

        if (existingActor == null)
        {
            return;
        }

        existingActor.Name = actor.Name;
        existingActor.ProfilePath = actor.ProfilePath;

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> IsActorInUseAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await _context.MovieActors.AnyAsync(
            relation => relation.ActorId == id,
            cancellationToken);
    }

    public async Task<bool> DeleteActorAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var actor = await _context.Actors.FirstOrDefaultAsync(
            item => item.Id == id,
            cancellationToken);

        if (actor == null)
        {
            return false;
        }

        if (await IsActorInUseAsync(id, cancellationToken))
        {
            return false;
        }

        _context.Actors.Remove(actor);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<bool> ExistsByNameAsync(
        string name,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedName = name.Trim();

        return await _context.Actors.AnyAsync(
            actor =>
                EF.Functions.ILike(actor.Name, normalizedName) &&
                (!excludeId.HasValue || actor.Id != excludeId.Value),
            cancellationToken);
    }
}
