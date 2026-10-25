using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories.Interfaces;

public interface IBookingRepository : IGenericRepository<Booking>
{
    Task<Booking?> GetBookingWithDetailsAsync(Guid bookingId);
    Task<IEnumerable<Booking>> GetUserBookingsAsync(Guid userId);

    // Refactored methods
    Task<List<Booking>> GetByShowtimeWithTicketsAsync(Guid showtimeId);
    void RemoveTickets(IEnumerable<Ticket> tickets);

    // Admin methods
    Task<(IReadOnlyList<Booking> Items, int TotalCount)> GetAdminBookingsAsync(
        string? status,
        string? search,
        DateOnly? dateFrom,
        DateOnly? dateTo,
        int page,
        int pageSize,
        DateTime nowUtc,
        Guid? cinemaId = null,
        Guid? movieId = null);

    Task<Booking?> GetAdminBookingDetailByIdAsync(Guid id);
}
