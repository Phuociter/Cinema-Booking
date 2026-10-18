using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Interfaces;

public interface ISnackService
{
    // --- Quản lý Danh mục Bắp nước Master ---
    Task<IEnumerable<SnackDto>> GetAllSnacksAsync();
    Task<SnackDto> CreateSnackAsync(SnackDto snackDto);
    Task<bool> UpdateSnackAsync(Guid id, SnackDto snackDto);
    Task<bool> DeleteSnackAsync(Guid id);

    // --- Quản lý Menu & Giá bán theo Cụm Rạp ---
    Task<IEnumerable<CinemaSnackDto>> GetSnacksByCinemaAsync(Guid cinemaId, bool onlyAvailable = false);
    Task<bool> AddSnackToCinemaAsync(Guid cinemaId, Guid snackId, decimal price);
    Task<bool> UpdateCinemaSnackAsync(Guid cinemaId, Guid snackId, decimal price, bool isAvailable);
    Task<bool> RemoveSnackFromCinemaAsync(Guid cinemaId, Guid snackId);
}