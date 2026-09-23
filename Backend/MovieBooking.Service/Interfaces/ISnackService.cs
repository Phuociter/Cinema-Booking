using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Interfaces
{
    public interface ISnackService
    {
        Task<IEnumerable<SnackDto>> GetAllSnacksAsync();
        Task<IEnumerable<CinemaSnackDto>> GetSnacksByCinemaAsync(Guid cinemaId);
    }
}