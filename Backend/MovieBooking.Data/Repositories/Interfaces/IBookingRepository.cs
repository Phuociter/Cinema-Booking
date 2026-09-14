using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories.Interfaces;

public interface IBookingRepository : IGenericRepository<Booking>
{
    Task<Booking?> GetBookingWithDetailsAsync(Guid bookingId);
    Task<IEnumerable<Booking>> GetUserBookingsAsync(Guid userId);
}
