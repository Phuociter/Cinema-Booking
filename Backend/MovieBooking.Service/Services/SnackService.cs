using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Data.Entities;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.Service.Services
{
    public class SnackService : ISnackService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public SnackService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // ==========================================
        // 1. QUẢN LÝ DANH MỤC MASTER (CHO TẤT CẢ RẠP)
        // ==========================================
        public async Task<IEnumerable<SnackDto>> GetAllSnacksAsync()
        {
            return await _context.Snacks
                .AsNoTracking()
                .Where(s => s.DeletedAt == null) // Bỏ qua các món đã xóa mềm
                .ProjectTo<SnackDto>(_mapper.ConfigurationProvider)
                .ToListAsync();
        }

        public async Task<SnackDto> CreateSnackAsync(SnackDto snackDto)
        {
            var snack = new Snack
            {
                Id = Guid.NewGuid(),
                Name = snackDto.Name ?? string.Empty,
                ImageUrl = snackDto.ImageUrl,
                Description = snackDto.Description
            };

            _context.Snacks.Add(snack);
            await _context.SaveChangesAsync();

            return _mapper.Map<SnackDto>(snack);
        }

        public async Task<bool> UpdateSnackAsync(Guid id, SnackDto snackDto)
        {
            var snack = await _context.Snacks.FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null);
            if (snack == null) return false;

            snack.Name = snackDto.Name ?? snack.Name;
            snack.ImageUrl = snackDto.ImageUrl;
            snack.Description = snackDto.Description;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteSnackAsync(Guid id)
        {
            var snack = await _context.Snacks.FirstOrDefaultAsync(s => s.Id == id);
            if (snack == null) return false;

            snack.DeletedAt = DateTime.UtcNow; // Xóa mềm để giữ lịch sử hóa đơn cũ
            await _context.SaveChangesAsync();
            return true;
        }

        // ==========================================
        // 2. QUẢN LÝ MENU & BẢNG GIÁ RIÊNG CHO TỪNG RẠP
        // ==========================================
        public async Task<IEnumerable<CinemaSnackDto>> GetSnacksByCinemaAsync(Guid cinemaId, bool onlyAvailable = false)
        {
            var query = _context.CinemaSnacks
                .Include(cs => cs.Snack)
                .AsNoTracking()
                .Where(cs => cs.CinemaId == cinemaId && cs.Snack.DeletedAt == null);

            // Nếu gọi từ Client (đặt vé) thì truyền true, gọi từ Admin (quản lý) thì truyền false
            if (onlyAvailable)
            {
                query = query.Where(cs => cs.IsAvailable);
            }

            return await query
                .ProjectTo<CinemaSnackDto>(_mapper.ConfigurationProvider)
                .ToListAsync();
        }

        public async Task<bool> AddSnackToCinemaAsync(Guid cinemaId, Guid snackId, decimal price)
        {
            var exists = await _context.CinemaSnacks.AnyAsync(cs => cs.CinemaId == cinemaId && cs.SnackId == snackId);
            if (exists) return false; // Món này đã được thêm vào rạp rồi

            var cinemaSnack = new CinemaSnack
            {
                Id = Guid.NewGuid(),
                CinemaId = cinemaId,
                SnackId = snackId,
                Price = price,
                IsAvailable = true // Mặc định vừa thêm xong là Còn hàng
            };

            _context.CinemaSnacks.Add(cinemaSnack);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateCinemaSnackAsync(Guid cinemaId, Guid snackId, decimal price, bool isAvailable)
        {
            var cinemaSnack = await _context.CinemaSnacks
                .FirstOrDefaultAsync(cs => cs.CinemaId == cinemaId && cs.SnackId == snackId);

            if (cinemaSnack == null) return false;

            cinemaSnack.Price = price; // Đổi giá
            cinemaSnack.IsAvailable = isAvailable; // Gạt nút bật/tắt còn hàng

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemoveSnackFromCinemaAsync(Guid cinemaId, Guid snackId)
        {
            var cinemaSnack = await _context.CinemaSnacks
                .FirstOrDefaultAsync(cs => cs.CinemaId == cinemaId && cs.SnackId == snackId);

            if (cinemaSnack == null) return false;

            _context.CinemaSnacks.Remove(cinemaSnack);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}