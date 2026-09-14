using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories.Interfaces;

public interface IShowtimeSeatRepository : IGenericRepository<ShowtimeSeat>
{
    Task<IEnumerable<ShowtimeSeat>> GetSeatsByShowtimeIdAsync(Guid showtimeId);
    Task<IEnumerable<ShowtimeSeat>> GetAvailableSeatsAsync(Guid showtimeId, IEnumerable<Guid> seatIds);
}
