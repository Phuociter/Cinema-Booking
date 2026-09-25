using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public interface ICinemaService
{
    Task<List<CinemaDto>> GetCinemasAsync(string? city = null);

    Task<CinemaDto?> GetCinemaByIdAsync(Guid id);

    Task<List<SeatDto>> GetSeatsByAuditoriumIdAsync(Guid auditoriumId);
}