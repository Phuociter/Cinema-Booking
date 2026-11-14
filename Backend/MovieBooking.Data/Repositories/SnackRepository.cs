using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MovieBooking.Data.Repositories
{
    public class SnackRepository : ISnackRepository
    {
        private readonly AppDbContext _context;

        public SnackRepository(AppDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // 1. QUẢN LÝ DANH MỤC MASTER
        // ==========================================
        public async Task<IEnumerable<Snack>> GetAllActiveSnacksAsync()
        {
            return await _context.Snacks
                .AsNoTracking()
                .Where(s => s.DeletedAt == null)
                .ToListAsync();
        }

        public async Task<Snack?> GetActiveSnackByIdAsync(Guid id)
        {
            return await _context.Snacks
                .FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null);
        }

        public async Task<Snack?> GetSnackByIdAsync(Guid id)
        {
            return await _context.Snacks.FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task AddSnackAsync(Snack snack)
        {
            _context.Snacks.Add(snack);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync()
        {
            await _context.SaveChangesAsync();
        }

        // ==========================================
        // 2. QUẢN LÝ MENU THEO RẠP
        // ==========================================
        public async Task<IEnumerable<CinemaSnack>> GetSnacksByCinemaAsync(Guid cinemaId, bool onlyAvailable)
        {
            var query = _context.CinemaSnacks
                .Include(cs => cs.Snack)
                .AsNoTracking()
                .Where(cs => cs.CinemaId == cinemaId && cs.Snack.DeletedAt == null);

            if (onlyAvailable)
            {
                query = query.Where(cs => cs.IsAvailable);
            }

            return await query.ToListAsync();
        }

        public async Task<bool> CinemaSnackExistsAsync(Guid cinemaId, Guid snackId)
        {
            return await _context.CinemaSnacks
                .AnyAsync(cs => cs.CinemaId == cinemaId && cs.SnackId == snackId);
        }

        public async Task AddCinemaSnackAsync(CinemaSnack cinemaSnack)
        {
            _context.CinemaSnacks.Add(cinemaSnack);
            await _context.SaveChangesAsync();
        }

        public async Task<CinemaSnack?> GetCinemaSnackAsync(Guid cinemaId, Guid snackId)
        {
            return await _context.CinemaSnacks
                .FirstOrDefaultAsync(cs => cs.CinemaId == cinemaId && cs.SnackId == snackId);
        }

        public async Task RemoveCinemaSnackAsync(CinemaSnack cinemaSnack)
        {
            _context.CinemaSnacks.Remove(cinemaSnack);
            await _context.SaveChangesAsync();
        }
    }
}