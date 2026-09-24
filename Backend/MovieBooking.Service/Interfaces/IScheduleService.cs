using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Interfaces;

public interface IScheduleService
{
    Task<PagedResult<ShowtimeDto>> GetShowtimesAsync(
        Guid? movieId, Guid? cinemaId, DateOnly? date, DateOnly? dateFrom = null, DateOnly? dateTo = null, int page = 1, int pageSize = 20);
    Task<ShowtimeDto?> GetShowtimeByIdAsync(Guid id);
    Task<IEnumerable<ShowtimeSeatDto>> GetSeatsForShowtimeAsync(Guid showtimeId);
    Task<bool> ShowtimeExistsAsync(Guid id);
}
