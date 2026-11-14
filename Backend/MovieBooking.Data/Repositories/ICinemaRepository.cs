using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories;

// Một dòng = 1 phim (khác nhau) có suất chiếu trong tháng tại 1 phòng
public record AuditoriumMovieRow(Guid AuditoriumId, Guid CinemaId, Guid MovieId);

public interface ICinemaRepository
{
    // Cinema
    Task<List<Cinema>> GetCinemasAsync(string? city = null);
    Task<Cinema?> GetCinemaByIdAsync(Guid id, bool track = false);
    Task AddCinemaAsync(Cinema cinema);
    Task UpdateCinemaAsync(Cinema cinema);
    Task DeleteCinemaAsync(Cinema cinema);        // xóa mềm cả các phòng thuộc rạp

    // Auditorium
    Task<Auditorium?> GetAuditoriumByIdAsync(Guid id);
    Task<bool> CinemaExistsAsync(Guid cinemaId);
    Task<bool> AuditoriumNameExistsAsync(Guid cinemaId, string name, Guid? excludeId);
    Task AddAuditoriumAsync(Auditorium auditorium);
    Task UpdateAuditoriumAsync(Auditorium auditorium);
    Task DeleteAuditoriumAsync(Auditorium auditorium);

    // Ghế
    Task<List<Seat>> GetSeatsByAuditoriumIdAsync(Guid auditoriumId);
    Task<bool> AuditoriumHasSeatsAsync(Guid auditoriumId);

    // Suất chiếu liên quan
    Task<bool> CinemaHasUpcomingShowtimesAsync(Guid cinemaId, DateTime now);
    Task<bool> AuditoriumHasUpcomingShowtimesAsync(Guid auditoriumId, DateTime now);

    // Thống kê phim trong tháng
    Task<int> GetActiveMoviesCountByCinemaAsync(Guid cinemaId, int month, int year);
    Task<List<AuditoriumMovieRow>> GetActiveMovieRowsAsync(int month, int year); // 1 truy vấn cho cả danh sách
}