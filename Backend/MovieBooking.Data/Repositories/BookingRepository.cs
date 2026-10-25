using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;

namespace MovieBooking.Data.Repositories;

public class BookingRepository : GenericRepository<Booking>, IBookingRepository
{
    public BookingRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Booking?> GetBookingWithDetailsAsync(Guid bookingId)
    {
        return await _dbSet
            .Include(b => b.User)
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Seat)
                        .ThenInclude(s => s.SeatType)
            .Include(b => b.BookingSnacks)
                .ThenInclude(bs => bs.CinemaSnack)
                    .ThenInclude(cs => cs.Snack)
            .FirstOrDefaultAsync(b => b.Id == bookingId);
    }

    public async Task<IEnumerable<Booking>> GetUserBookingsAsync(Guid userId)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<Booking>> GetByShowtimeWithTicketsAsync(Guid showtimeId)
    {
        return await _dbSet
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
            .Where(b => b.Tickets.Any(t => t.ShowtimeSeat != null && t.ShowtimeSeat.ShowtimeId == showtimeId))
            .ToListAsync();
    }

    public void RemoveTickets(IEnumerable<Ticket> tickets)
    {
        _context.Tickets.RemoveRange(tickets);
    }

    public async Task<(IReadOnlyList<Booking> Items, int TotalCount)> GetAdminBookingsAsync(
        string? status,
        string? search,
        DateOnly? dateFrom,
        DateOnly? dateTo,
        int page,
        int pageSize,
        DateTime nowUtc,
        Guid? cinemaId = null,
        Guid? movieId = null)
    {
        var query = _context.Bookings
            .IgnoreQueryFilters()
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            if (normalizedStatus == "success")
            {
                query = query.Where(b => b.Status == "success");
            }
            else if (normalizedStatus == "cancelled")
            {
                query = query.Where(b => b.Status == "cancelled");
            }
            else if (normalizedStatus == "expired")
            {
                query = query.Where(b => b.Status == "pending" && b.ExpiresAt != null && b.ExpiresAt < nowUtc);
            }
            else if (normalizedStatus == "pending")
            {
                query = query.Where(b => b.Status == "pending" && (b.ExpiresAt == null || b.ExpiresAt >= nowUtc));
            }
        }

        if (dateFrom.HasValue)
        {
            var fromUtc = dateFrom.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(b => b.CreatedAt >= fromUtc);
        }

        if (dateTo.HasValue)
        {
            var toUtcExclusive = dateTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(b => b.CreatedAt < toUtcExclusive);
        }

        if (cinemaId.HasValue)
        {
            query = query.Where(b => b.Tickets.Any(t =>
                t.ShowtimeSeat != null &&
                t.ShowtimeSeat.Showtime != null &&
                t.ShowtimeSeat.Showtime.Auditorium != null &&
                t.ShowtimeSeat.Showtime.Auditorium.CinemaId == cinemaId.Value));
        }

        if (movieId.HasValue)
        {
            query = query.Where(b => b.Tickets.Any(t =>
                t.ShowtimeSeat != null &&
                t.ShowtimeSeat.Showtime != null &&
                t.ShowtimeSeat.Showtime.MovieId == movieId.Value));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var trimmedSearch = search.Trim();
            if (trimmedSearch.Length > 100)
            {
                trimmedSearch = trimmedSearch.Substring(0, 100);
            }

            var escaped = trimmedSearch
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_");
            var pattern = $"%{escaped}%";

            query = query.Where(b =>
                EF.Functions.ILike(b.BookingCode, pattern) ||
                EF.Functions.ILike(b.User.Email, pattern) ||
                (b.User.Phone != null && EF.Functions.ILike(b.User.Phone, pattern)) ||
                (b.User.FullName != null && EF.Functions.ILike(b.User.FullName, pattern)));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .ThenByDescending(b => b.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(b => b.User)
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Showtime)
                        .ThenInclude(st => st.Movie)
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Showtime)
                        .ThenInclude(st => st.Auditorium)
                            .ThenInclude(a => a.Cinema)
            .Include(b => b.Payments)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<Booking?> GetAdminBookingDetailByIdAsync(Guid id)
    {
        return await _context.Bookings
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(b => b.User)
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Seat)
                        .ThenInclude(s => s.SeatType)
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Showtime)
                        .ThenInclude(st => st.Movie)
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
                    .ThenInclude(ss => ss.Showtime)
                        .ThenInclude(st => st.Auditorium)
                            .ThenInclude(a => a.Cinema)
            .Include(b => b.BookingSnacks)
                .ThenInclude(bs => bs.CinemaSnack)
                    .ThenInclude(cs => cs.Snack)
            .Include(b => b.Payments)
            .FirstOrDefaultAsync(b => b.Id == id);
    }
}
