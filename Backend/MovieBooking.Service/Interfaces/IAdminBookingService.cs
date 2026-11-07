using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Interfaces;

public interface IAdminBookingService
{
    Task<AdminBookingListResult> GetBookingsAsync(AdminBookingsQuery query);
    Task<AdminBookingDetailResult> GetBookingDetailAsync(Guid id);
}
