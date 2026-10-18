using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public interface ICinemaService
{
    Task<List<CinemaDto>> GetCinemasAsync(string? city = null);

    Task<CinemaDto?> GetCinemaByIdAsync(Guid id);

    Task<List<SeatDto>> GetSeatsByAuditoriumIdAsync(Guid auditoriumId);

        // ---- Admin: quản lý phòng chiếu ----
    Task<ServiceResult<AuditoriumCreatedDto>> CreateAuditoriumAsync(CreateAuditoriumRequest request);
    Task<ServiceResult<int>> UpdateSeatLayoutAsync(Guid auditoriumId, UpdateSeatLayoutRequest request);
    Task<ServiceResult<AuditoriumDto>> UpdateAuditoriumAsync(Guid id, UpdateAuditoriumRequest request);
    Task<ServiceResult<bool>> DeleteAuditoriumAsync(Guid id);
}