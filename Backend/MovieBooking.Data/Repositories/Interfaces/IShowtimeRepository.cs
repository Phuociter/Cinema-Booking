using Microsoft.EntityFrameworkCore.Storage;
using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories.Interfaces;

public interface IShowtimeRepository : IGenericRepository<Showtime>
{
    Task<(IEnumerable<Showtime> Items, int TotalCount)> GetShowtimesWithDetailsAsync(
        Guid? movieId, Guid? cinemaId, DateOnly? date, DateOnly? dateFrom = null, DateOnly? dateTo = null, string? status = null, int page = 1, int pageSize = 20);
    Task<Showtime?> GetShowtimeByIdWithDetailsAsync(Guid id);
    Task<bool> ExistsAsync(Guid id, bool scheduledOnly = true);

    // Refactored methods
    Task<IDbContextTransaction> BeginTransactionAsync();
    new Task<Showtime?> GetByIdAsync(Guid id);
    Task<Showtime?> GetByIdNoTrackingAsync(Guid id);
    Task<bool> HasActiveOverlapAsync(Guid? excludeShowtimeId, Guid auditoriumId, DateTime startTime, DateTime endTime);
    Task<Movie?> GetActiveMovieAsync(Guid movieId);
    Task<Auditorium?> GetActiveAuditoriumWithCinemaAsync(Guid auditoriumId);
    Task<List<Seat>> GetSeatsByAuditoriumAsync(Guid auditoriumId);
    Task AddWithSeatsAsync(Showtime showtime, IEnumerable<ShowtimeSeat> seats);
}
