using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Interfaces;

public interface IShowtimeSeatService
{
    Task<AdminShowtimeSeatsResult> GetAdminSeatsAsync(Guid showtimeId);
    Task<SetSeatMaintenanceResult> SetSeatMaintenanceAsync(Guid showtimeId, Guid seatId, SetSeatMaintenanceRequest? request);
}
