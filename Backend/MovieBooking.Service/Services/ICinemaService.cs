using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public interface ICinemaService
{
    Task<List<CinemaDto>> GetCinemasAsync(string? city = null);
    Task<CinemaDto?> GetCinemaByIdAsync(Guid id);
    Task<List<SeatDto>> GetSeatsByAuditoriumIdAsync(Guid auditoriumId);

    // ---- Admin CRUD (Cinema & Auditorium) ----
    Task<CinemaDto> CreateCinemaAsync(CinemaUpsertRequest request);
    Task<CinemaDto?> UpdateCinemaAsync(Guid id, CinemaUpsertRequest request);
    Task<bool> DeleteCinemaAsync(Guid id);

    Task<AuditoriumDto?> CreateAuditoriumAsync(Guid cinemaId, AuditoriumUpsertRequest request);
    Task<AuditoriumDto?> UpdateAuditoriumAsync(Guid id, AuditoriumUpsertRequest request);
    Task<bool> DeleteAuditoriumAsync(Guid id);

    // ---- Admin layout & reports ----
    Task<ServiceResult<int>> UpdateSeatLayoutAsync(Guid auditoriumId, UpdateSeatLayoutRequest request);
    Task<List<OccupancyRateDto>> GetOccupancyRatesAsync(DateTime? from, DateTime? to);
}