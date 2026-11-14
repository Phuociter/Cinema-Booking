using AutoMapper;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MovieBooking.Service.Services
{
    public class SnackService : ISnackService
    {
        private readonly ISnackRepository _snackRepository;
        private readonly IMapper _mapper;

        // DI inject Repository thay vì DbContext
        public SnackService(ISnackRepository snackRepository, IMapper mapper)
        {
            _snackRepository = snackRepository;
            _mapper = mapper;
        }

        // ==========================================
        // 1. QUẢN LÝ DANH MỤC MASTER (CHO TẤT CẢ RẠP)
        // ==========================================
        public async Task<IEnumerable<SnackDto>> GetAllSnacksAsync()
        {
            var snacks = await _snackRepository.GetAllActiveSnacksAsync();
            return _mapper.Map<IEnumerable<SnackDto>>(snacks);
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

            await _snackRepository.AddSnackAsync(snack);
            return _mapper.Map<SnackDto>(snack);
        }

        public async Task<bool> UpdateSnackAsync(Guid id, SnackDto snackDto)
        {
            var snack = await _snackRepository.GetActiveSnackByIdAsync(id);
            if (snack == null) return false;

            snack.Name = snackDto.Name ?? snack.Name;
            snack.ImageUrl = snackDto.ImageUrl;
            snack.Description = snackDto.Description;

            await _snackRepository.UpdateAsync();
            return true;
        }

        public async Task<bool> DeleteSnackAsync(Guid id)
        {
            var snack = await _snackRepository.GetSnackByIdAsync(id);
            if (snack == null) return false;

            snack.DeletedAt = DateTime.UtcNow; // Xóa mềm
            await _snackRepository.UpdateAsync();
            return true;
        }

        // ==========================================
        // 2. QUẢN LÝ MENU & BẢNG GIÁ RIÊNG CHO TỪNG RẠP
        // ==========================================
        public async Task<IEnumerable<CinemaSnackDto>> GetSnacksByCinemaAsync(Guid cinemaId, bool onlyAvailable = false)
        {
            var cinemaSnacks = await _snackRepository.GetSnacksByCinemaAsync(cinemaId, onlyAvailable);
            return _mapper.Map<IEnumerable<CinemaSnackDto>>(cinemaSnacks);
        }

        public async Task<bool> AddSnackToCinemaAsync(Guid cinemaId, Guid snackId, decimal price)
        {
            var exists = await _snackRepository.CinemaSnackExistsAsync(cinemaId, snackId);
            if (exists) return false;

            var cinemaSnack = new CinemaSnack
            {
                Id = Guid.NewGuid(),
                CinemaId = cinemaId,
                SnackId = snackId,
                Price = price,
                IsAvailable = true
            };

            await _snackRepository.AddCinemaSnackAsync(cinemaSnack);
            return true;
        }

        public async Task<bool> UpdateCinemaSnackAsync(Guid cinemaId, Guid snackId, decimal price, bool isAvailable)
        {
            var cinemaSnack = await _snackRepository.GetCinemaSnackAsync(cinemaId, snackId);
            if (cinemaSnack == null) return false;

            cinemaSnack.Price = price;
            cinemaSnack.IsAvailable = isAvailable;

            await _snackRepository.UpdateAsync();
            return true;
        }

        public async Task<bool> RemoveSnackFromCinemaAsync(Guid cinemaId, Guid snackId)
        {
            var cinemaSnack = await _snackRepository.GetCinemaSnackAsync(cinemaId, snackId);
            if (cinemaSnack == null) return false;

            await _snackRepository.RemoveCinemaSnackAsync(cinemaSnack);
            return true;
        }
    }
}