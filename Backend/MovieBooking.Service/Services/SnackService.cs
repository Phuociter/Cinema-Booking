using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
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

        public async Task<IEnumerable<SnackDto>> GetAllSnacksAsync()
        {
            return await _context.Snacks
                .AsNoTracking()
                .ProjectTo<SnackDto>(_mapper.ConfigurationProvider)
                .ToListAsync();
        }

        public async Task<IEnumerable<CinemaSnackDto>> GetSnacksByCinemaAsync(Guid cinemaId)
        {
            return await _context.CinemaSnacks
                .Include(cs => cs.Snack)
                .AsNoTracking()
                .Where(cs => cs.CinemaId == cinemaId && cs.IsAvailable)
                .ProjectTo<CinemaSnackDto>(_mapper.ConfigurationProvider)
                .ToListAsync();
        }
    }
}