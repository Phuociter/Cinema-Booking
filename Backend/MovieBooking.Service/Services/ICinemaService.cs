using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public interface ICinemaService
{
    Task<List<CinemaDto>> GetCinemasAsync(string? city = null);

    Task<CinemaDto?> GetCinemaByIdAsync(Guid id);

    Task<List<SeatDto>> GetSeatsByAuditoriumIdAsync(Guid auditoriumId);

    Task<CinemaDto> CreateCinemaAsync(CinemaUpsertRequest request);
    Task<CinemaDto?> UpdateCinemaAsync(Guid id, CinemaUpsertRequest request);
    Task<bool> DeleteCinemaAsync(Guid id);
    Task<AuditoriumDto?> CreateAuditoriumAsync(Guid cinemaId, AuditoriumUpsertRequest request);
    Task<AuditoriumDto?> UpdateAuditoriumAsync(Guid id, AuditoriumUpsertRequest request);
    Task<bool> DeleteAuditoriumAsync(Guid id);
}