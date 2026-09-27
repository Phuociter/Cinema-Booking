using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Constants;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;

namespace MovieBooking.Data.Repositories;

public class ShowtimeRepository : GenericRepository<Showtime>, IShowtimeRepository
{
    public ShowtimeRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<(IEnumerable<Showtime> Items, int TotalCount)> GetShowtimesWithDetailsAsync(
        Guid? movieId, Guid? cinemaId, DateOnly? date, DateOnly? dateFrom = null, DateOnly? dateTo = null, int page = 1, int pageSize = 20)
    {
        var query = GetBaseShowtimeQuery()
            .Where(s => s.Status == ShowtimeStatus.Scheduled);

        query = ApplyShowtimeFilters(query, movieId, cinemaId, date, dateFrom, dateTo);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(s => s.StartTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<Showtime?> GetShowtimeByIdWithDetailsAsync(Guid id)
    {
        return await GetBaseShowtimeQuery()
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<bool> ExistsAsync(Guid id, bool scheduledOnly = true)
    {
        return await _dbSet.AnyAsync(s => s.Id == id && (!scheduledOnly || s.Status == ShowtimeStatus.Scheduled));
    }

    private IQueryable<Showtime> GetBaseShowtimeQuery()
    {
        return _dbSet
            .AsNoTracking()
            .Include(s => s.Movie)
            .Include(s => s.Auditorium)
                .ThenInclude(a => a.Cinema);
    }

    private IQueryable<Showtime> ApplyShowtimeFilters(
        IQueryable<Showtime> query,
        Guid? movieId,
        Guid? cinemaId,
        DateOnly? date,
        DateOnly? dateFrom,
        DateOnly? dateTo)
    {
        query = ApplyMovieFilter(query, movieId);
        query = ApplyCinemaFilter(query, cinemaId);
        query = ApplyDateFilter(query, date, dateFrom, dateTo);
        return query;
    }

    private IQueryable<Showtime> ApplyMovieFilter(IQueryable<Showtime> query, Guid? movieId)
    {
        return movieId.HasValue ? query.Where(s => s.MovieId == movieId.Value) : query;
    }

    private IQueryable<Showtime> ApplyCinemaFilter(IQueryable<Showtime> query, Guid? cinemaId)
    {
        return cinemaId.HasValue ? query.Where(s => s.Auditorium.CinemaId == cinemaId.Value) : query;
    }

    private IQueryable<Showtime> ApplyDateFilter(
        IQueryable<Showtime> query,
        DateOnly? date,
        DateOnly? dateFrom,
        DateOnly? dateTo)
    {
        var nowUtc = DateTime.UtcNow;

        if (date.HasValue)
        {
            var startOfDayUtc = date.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var effectiveStartUtc = startOfDayUtc < nowUtc ? nowUtc : startOfDayUtc;
            var endOfDayUtc = startOfDayUtc.AddDays(1);
            return query.Where(s => s.StartTime >= effectiveStartUtc && s.StartTime < endOfDayUtc);
        }

        if (dateFrom.HasValue || dateTo.HasValue)
        {
            if (dateFrom.HasValue)
            {
                var fromUtc = dateFrom.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
                var effectiveFromUtc = fromUtc < nowUtc ? nowUtc : fromUtc;
                query = query.Where(s => s.StartTime >= effectiveFromUtc);
            }
            else
            {
                query = query.Where(s => s.StartTime >= nowUtc);
            }

            if (dateTo.HasValue)
            {
                var toUtc = dateTo.Value.ToDateTime(new TimeOnly(23, 59, 59, 999), DateTimeKind.Utc);
                query = query.Where(s => s.StartTime <= toUtc);
            }

            return query;
        }

        return query.Where(s => s.StartTime >= nowUtc);
    }
}
