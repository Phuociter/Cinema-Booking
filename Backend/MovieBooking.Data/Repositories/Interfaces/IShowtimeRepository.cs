using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories.Interfaces;

public interface IShowtimeRepository : IGenericRepository<Showtime>
{
    Task<(IEnumerable<Showtime> Items, int TotalCount)> GetShowtimesWithDetailsAsync(
        Guid? movieId, Guid? cinemaId, DateOnly? date, DateOnly? dateFrom = null, DateOnly? dateTo = null, int page = 1, int pageSize = 20);
    Task<Showtime?> GetShowtimeByIdWithDetailsAsync(Guid id);
    Task<bool> ExistsAsync(Guid id, bool scheduledOnly = true);
}
