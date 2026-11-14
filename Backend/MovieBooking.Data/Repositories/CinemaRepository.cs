using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories;

public class CinemaRepository : ICinemaRepository
{
    private readonly AppDbContext _context;

    public CinemaRepository(AppDbContext context) => _context = context;

    // ---------- Cinema ----------
    public async Task<List<Cinema>> GetCinemasAsync(string? city = null)
    {
        var query = _context.Cinemas.AsNoTracking().Include(c => c.Auditoriums).AsQueryable();
        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(c => c.City == city);
        return await query.OrderBy(c => c.Name).ToListAsync();
    }

    public async Task<Cinema?> GetCinemaByIdAsync(Guid id, bool track = false)
    {
        var query = _context.Cinemas.Include(c => c.Auditoriums).AsQueryable();
        if (!track) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task AddCinemaAsync(Cinema cinema)
    {
        _context.Cinemas.Add(cinema);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateCinemaAsync(Cinema cinema)
    {
        _context.Cinemas.Update(cinema);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteCinemaAsync(Cinema cinema)
    {
        var now = DateTime.UtcNow;
        cinema.DeletedAt = now;
        foreach (var a in cinema.Auditoriums) a.DeletedAt ??= now;
        await _context.SaveChangesAsync();
    }

    // ---------- Auditorium ----------
    public Task<Auditorium?> GetAuditoriumByIdAsync(Guid id) =>
        _context.Auditoriums.FirstOrDefaultAsync(a => a.Id == id);

    public Task<bool> CinemaExistsAsync(Guid cinemaId) =>
        _context.Cinemas.AnyAsync(c => c.Id == cinemaId);

    public Task<bool> AuditoriumNameExistsAsync(Guid cinemaId, string name, Guid? excludeId)
    {
        var n = name.Trim().ToLower();
        return _context.Auditoriums.AnyAsync(a =>
            a.CinemaId == cinemaId && a.Id != excludeId && a.Name.ToLower() == n);
    }

    public async Task AddAuditoriumAsync(Auditorium auditorium)
    {
        _context.Auditoriums.Add(auditorium);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAuditoriumAsync(Auditorium auditorium)
    {
        _context.Auditoriums.Update(auditorium);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAuditoriumAsync(Auditorium auditorium)
    {
        auditorium.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    // ---------- Seats ----------
    public Task<List<Seat>> GetSeatsByAuditoriumIdAsync(Guid auditoriumId) =>
        _context.Seats.AsNoTracking()
            .Include(s => s.SeatType)
            .Where(s => s.AuditoriumId == auditoriumId)
            .ToListAsync();

    public Task<bool> AuditoriumHasSeatsAsync(Guid auditoriumId) =>
        _context.Seats.AnyAsync(s => s.AuditoriumId == auditoriumId);

    // ---------- Showtimes liên quan ----------
    public Task<bool> CinemaHasUpcomingShowtimesAsync(Guid cinemaId, DateTime now) =>
        _context.Showtimes.AnyAsync(s =>
            s.Auditorium.CinemaId == cinemaId && s.StartTime > now && s.Status != "cancelled");

    public Task<bool> AuditoriumHasUpcomingShowtimesAsync(Guid auditoriumId, DateTime now) =>
        _context.Showtimes.AnyAsync(s =>
            s.AuditoriumId == auditoriumId && s.StartTime > now && s.Status != "cancelled");

    // ---------- Thống kê tháng ----------
    private static (DateTime from, DateTime to) MonthRange(int month, int year)
    {
        var from = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        return (from, from.AddMonths(1));
    }

    public Task<int> GetActiveMoviesCountByCinemaAsync(Guid cinemaId, int month, int year)
    {
        var (from, to) = MonthRange(month, year);
        return _context.Showtimes
            .Where(s => s.Auditorium.CinemaId == cinemaId
                        && s.StartTime >= from && s.StartTime < to && s.Status != "cancelled")
            .Select(s => s.MovieId)
            .Distinct()
            .CountAsync();
    }

    public Task<List<AuditoriumMovieRow>> GetActiveMovieRowsAsync(int month, int year)
    {
        var (from, to) = MonthRange(month, year);
        return _context.Showtimes
            .Where(s => s.StartTime >= from && s.StartTime < to && s.Status != "cancelled")
            .Select(s => new AuditoriumMovieRow(s.AuditoriumId, s.Auditorium.CinemaId, s.MovieId))
            .Distinct()
            .ToListAsync();
    }
}