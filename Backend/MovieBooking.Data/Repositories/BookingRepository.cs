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
}
