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
}
