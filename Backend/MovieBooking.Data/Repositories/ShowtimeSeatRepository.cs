using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;

namespace MovieBooking.Data.Repositories;

public class ShowtimeSeatRepository : GenericRepository<ShowtimeSeat>, IShowtimeSeatRepository
{
    public ShowtimeSeatRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<ShowtimeSeat>> GetSeatsByShowtimeIdAsync(Guid showtimeId)
    {
        return await GetBaseShowtimeSeatQuery()
            .Where(ss => ss.ShowtimeId == showtimeId)
            .OrderBy(ss => ss.Seat.RowLabel)
            .ThenBy(ss => ss.Seat.ColumnNumber)
            .ToListAsync();
    }

    public async Task<IEnumerable<ShowtimeSeat>> GetAvailableSeatsAsync(Guid showtimeId, IEnumerable<Guid> seatIds)
    {
        var seatIdList = seatIds.ToList();
        return await _dbSet
            .AsNoTracking()
            .Where(ss => ss.ShowtimeId == showtimeId
                      && seatIdList.Contains(ss.SeatId)
                      && ss.Status == "available")
            .ToListAsync();
    }

    private IQueryable<ShowtimeSeat> GetBaseShowtimeSeatQuery()
    {
        return _dbSet
            .AsNoTracking()
            .Include(ss => ss.Showtime)
            .Include(ss => ss.Seat)
                .ThenInclude(s => s.SeatType);
    }

    public async Task<List<ShowtimeSeat>> GetAllByShowtimeAsync(Guid showtimeId)
    {
        return await _dbSet
            .Where(ss => ss.ShowtimeId == showtimeId)
            .ToListAsync();
    }

    public async Task<List<ShowtimeSeat>> GetAdminSeatsAsync(Guid showtimeId)
    {
        return await _dbSet
            .Include(ss => ss.Seat)
                .ThenInclude(s => s.SeatType)
            .Where(ss => ss.ShowtimeId == showtimeId)
            .OrderBy(ss => ss.Seat.RowLabel)
            .ThenBy(ss => ss.Seat.ColumnNumber)
            .ToListAsync();
    }

    public async Task<ShowtimeSeat?> GetByShowtimeAndSeatAsync(Guid showtimeId, Guid seatId)
    {
        return await _dbSet
            .Include(ss => ss.Seat)
            .FirstOrDefaultAsync(ss => ss.ShowtimeId == showtimeId && ss.SeatId == seatId);
    }

    public async Task<List<Ticket>> GetActiveTicketsAsync(IEnumerable<Guid> showtimeSeatIds)
    {
        return await _context.Tickets
            .Include(t => t.Booking)
                .ThenInclude(b => b.User)
            .Where(t => showtimeSeatIds.Contains(t.ShowtimeSeatId)
                     && (t.Booking.Status == "success" || t.Booking.Status == "pending"))
            .ToListAsync();
    }

    public async Task<Ticket?> GetActiveTicketForSeatAsync(Guid showtimeSeatId)
    {
        return await _context.Tickets
            .Include(t => t.Booking)
            .Where(t => t.ShowtimeSeatId == showtimeSeatId
                     && (t.Booking.Status == "success" || t.Booking.Status == "pending"))
            .FirstOrDefaultAsync();
    }
}
