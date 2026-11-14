using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories
{
    public interface ISnackRepository
    {
        // Nhóm Master Snacks
        Task<IEnumerable<Snack>> GetAllActiveSnacksAsync();
        Task<Snack?> GetActiveSnackByIdAsync(Guid id);
        Task<Snack?> GetSnackByIdAsync(Guid id);
        Task AddSnackAsync(Snack snack);
        Task UpdateAsync(); // Hàm dùng chung để SaveChanges

        // Nhóm Cinema Snacks
        Task<IEnumerable<CinemaSnack>> GetSnacksByCinemaAsync(Guid cinemaId, bool onlyAvailable);
        Task<bool> CinemaSnackExistsAsync(Guid cinemaId, Guid snackId);
        Task AddCinemaSnackAsync(CinemaSnack cinemaSnack);
        Task<CinemaSnack?> GetCinemaSnackAsync(Guid cinemaId, Guid snackId);
        Task RemoveCinemaSnackAsync(CinemaSnack cinemaSnack);
    }
}