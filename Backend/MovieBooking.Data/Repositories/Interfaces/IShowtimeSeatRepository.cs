using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories.Interfaces;

public interface IShowtimeSeatRepository : IGenericRepository<ShowtimeSeat>
{
    Task<IEnumerable<ShowtimeSeat>> GetSeatsByShowtimeIdAsync(Guid showtimeId);
    Task<IEnumerable<ShowtimeSeat>> GetAvailableSeatsAsync(Guid showtimeId, IEnumerable<Guid> seatIds);

    // Refactored methods
    Task<List<ShowtimeSeat>> GetAllByShowtimeAsync(Guid showtimeId);
    Task<List<ShowtimeSeat>> GetAdminSeatsAsync(Guid showtimeId);
    Task<ShowtimeSeat?> GetByShowtimeAndSeatAsync(Guid showtimeId, Guid seatId);
    Task<List<Ticket>> GetActiveTicketsAsync(IEnumerable<Guid> showtimeSeatIds);
    Task<Ticket?> GetActiveTicketForSeatAsync(Guid showtimeSeatId);
}
