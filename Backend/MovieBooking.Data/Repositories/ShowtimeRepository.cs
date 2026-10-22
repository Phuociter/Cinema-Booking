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
        Guid? movieId, Guid? cinemaId, DateOnly? date, DateOnly? dateFrom = null, DateOnly? dateTo = null, string? status = null, int page = 1, int pageSize = 20)
    {
        var query = GetBaseShowtimeQuery();

        if (string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            // Do not filter by status, return both scheduled and cancelled
        }
        else if (string.Equals(status, "cancelled", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(s => s.Status == ShowtimeStatus.Cancelled);
        }
        else if (string.Equals(status, "scheduled", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(s => s.Status == ShowtimeStatus.Scheduled);
        }
        else
        {
            query = query.Where(s => s.Status == ShowtimeStatus.Scheduled);
        }

        query = ApplyShowtimeFilters(query, movieId, cinemaId, date, dateFrom, dateTo, status);

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
        DateOnly? dateTo,
        string? status)
    {
        query = ApplyMovieFilter(query, movieId);
        query = ApplyCinemaFilter(query, cinemaId);
        query = ApplyDateFilter(query, date, dateFrom, dateTo, status);
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
        DateOnly? dateTo,
        string? status)
    {
        var nowUtc = DateTime.UtcNow;

        if (date.HasValue)
        {
            var startOfDayUtc = date.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var endOfDayUtc = startOfDayUtc.AddDays(1);
            var effectiveStartUtc = !string.IsNullOrWhiteSpace(status) ? startOfDayUtc : (startOfDayUtc < nowUtc ? nowUtc : startOfDayUtc);
            return query.Where(s => s.StartTime >= effectiveStartUtc && s.StartTime < endOfDayUtc);
        }

        if (dateFrom.HasValue || dateTo.HasValue)
        {
            if (dateFrom.HasValue)
            {
                var fromUtc = dateFrom.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
                var effectiveFromUtc = !string.IsNullOrWhiteSpace(status) ? fromUtc : (fromUtc < nowUtc ? nowUtc : fromUtc);
                query = query.Where(s => s.StartTime >= effectiveFromUtc);
            }
            else
            {
                query = query.Where(s => s.StartTime >= (!string.IsNullOrWhiteSpace(status) ? DateTime.MinValue : nowUtc));
            }

            if (dateTo.HasValue)
            {
                var toUtc = dateTo.Value.ToDateTime(new TimeOnly(23, 59, 59, 999), DateTimeKind.Utc);
                query = query.Where(s => s.StartTime <= toUtc);
            }

            return query;
        }

        return !string.IsNullOrWhiteSpace(status) ? query : query.Where(s => s.StartTime >= nowUtc);
    }
}
