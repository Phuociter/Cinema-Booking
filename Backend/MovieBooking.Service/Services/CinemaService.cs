using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public class CinemaService : ICinemaService
{
    private readonly AppDbContext _context;

    public CinemaService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<CinemaDto>> GetCinemasAsync(string? city = null)
    {
        var query = _context.Cinemas
            .Include(c => c.Auditoriums)
            .AsQueryable();

        // Nếu có truyền city thì lọc theo city
        if (!string.IsNullOrWhiteSpace(city))
        {
            query = query.Where(c => c.City == city);
        }

        return await query
            .Select(c => new CinemaDto
            {
                Id = c.Id,
                Name = c.Name,
                Address = c.Address,
                City = c.City,
                Hotline = c.Hotline,
                ImageUrl = c.ImageUrl,

                Auditoriums = c.Auditoriums
                    .Select(a => new AuditoriumDto
                    {
                        Id = a.Id,
                        CinemaId = a.CinemaId,
                        Name = a.Name,
                        HallType = a.HallType,
                        TotalRows = a.TotalRows,
                        TotalColumns = a.TotalColumns
                    })
                    .ToList()
            })
            .ToListAsync();
    }

    public async Task<CinemaDto?> GetCinemaByIdAsync(Guid id)
    {
        return await _context.Cinemas
            .Include(c => c.Auditoriums)
            .Where(c => c.Id == id)
            .Select(c => new CinemaDto
            {
                Id = c.Id,
                Name = c.Name,
                Address = c.Address,
                City = c.City,
                Hotline = c.Hotline,
                ImageUrl = c.ImageUrl,

                Auditoriums = c.Auditoriums
                    .Select(a => new AuditoriumDto
                    {
                        Id = a.Id,
                        CinemaId = a.CinemaId,
                        Name = a.Name,
                        HallType = a.HallType,
                        TotalRows = a.TotalRows,
                        TotalColumns = a.TotalColumns
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();
    }

    public async Task<List<SeatDto>> GetSeatsByAuditoriumIdAsync(Guid auditoriumId)
    {
        return await _context.Seats
            .Include(s => s.SeatType)
            .Where(s => s.AuditoriumId == auditoriumId)
            .Select(s => new SeatDto
            {
                Id = s.Id,
                AuditoriumId = s.AuditoriumId,
                Row = s.RowLabel,
                Number = s.ColumnNumber,
                SeatType = s.SeatType.Name
            })
            .ToListAsync();
    }
}