using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;

namespace MovieBooking.Data.Repositories;

public class GenreRepository : GenericRepository<Genre>, IGenreRepository
{
    public GenreRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<List<Genre>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _context.Genres
            .AsNoTracking()
            .OrderBy(genre => genre.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Genre?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await _context.Genres
            .FirstOrDefaultAsync(genre => genre.Id == id, cancellationToken);
    }

    public async Task AddAsync(
        Genre genre,
        CancellationToken cancellationToken = default)
    {
        await _context.Genres.AddAsync(genre, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(
        Genre genre,
        CancellationToken cancellationToken = default)
    {
        _context.Genres.Update(genre);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var genre = await _context.Genres
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (genre == null)
        {
            return false;
        }

        var isInUse = await _context.MovieGenres
            .AnyAsync(relation => relation.GenreId == id, cancellationToken);

        if (isInUse)
        {
            return false;
        }

        _context.Genres.Remove(genre);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<bool> ExistsByNameAsync(
        string name,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedName = name.Trim();

        return await _context.Genres.AnyAsync(
            genre =>
                EF.Functions.ILike(genre.Name, normalizedName)
                && (!excludeId.HasValue || genre.Id != excludeId.Value),
            cancellationToken);
    }
}
