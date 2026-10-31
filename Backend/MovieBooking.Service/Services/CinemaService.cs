using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Data.Entities;
using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public class CinemaService : ICinemaService
{
    private static readonly string[] HallTypes = { "2D", "3D", "IMAX", "GOLDCLASS" };
    private readonly AppDbContext _context;

    public CinemaService(AppDbContext context) => _context = context;

    // ---------- READ ----------
    public async Task<List<CinemaDto>> GetCinemasAsync(string? city = null)
    {
        var query = _context.Cinemas.AsQueryable();
        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(c => c.City == city);

        var cinemas = await query
            .OrderBy(c => c.Name)
            .Select(c => new CinemaDto
            {
                Id = c.Id, Name = c.Name, Address = c.Address, City = c.City,
                Hotline = c.Hotline, ImageUrl = c.ImageUrl,
                Auditoriums = c.Auditoriums.OrderBy(a => a.Name).Select(a => new AuditoriumDto
                {
                    Id = a.Id, CinemaId = a.CinemaId, Name = a.Name, HallType = a.HallType,
                    TotalRows = a.TotalRows, TotalColumns = a.TotalColumns
                }).ToList()
            })
            .ToListAsync();

        await FillMonthlyStatsAsync(cinemas);
        return cinemas;
    }

    public async Task<CinemaDto?> GetCinemaByIdAsync(Guid id)
    {
        var cinema = await _context.Cinemas
            .Where(c => c.Id == id)
            .Select(c => new CinemaDto
            {
                Id = c.Id, Name = c.Name, Address = c.Address, City = c.City,
                Hotline = c.Hotline, ImageUrl = c.ImageUrl,
                Auditoriums = c.Auditoriums.OrderBy(a => a.Name).Select(a => new AuditoriumDto
                {
                    Id = a.Id, CinemaId = a.CinemaId, Name = a.Name, HallType = a.HallType,
                    TotalRows = a.TotalRows, TotalColumns = a.TotalColumns
                }).ToList()
            })
            .FirstOrDefaultAsync();

        if (cinema != null) await FillMonthlyStatsAsync(new List<CinemaDto> { cinema });
        return cinema;
    }

    public async Task<List<SeatDto>> GetSeatsByAuditoriumIdAsync(Guid auditoriumId)
    {
        return await _context.Seats
            .Include(s => s.SeatType)
            .Where(s => s.AuditoriumId == auditoriumId)
            .Select(s => new SeatDto
            {
                Id = s.Id, AuditoriumId = s.AuditoriumId, Row = s.RowLabel,
                Number = s.ColumnNumber, SeatType = s.SeatType.Name
            })
            .ToListAsync();
    }

    // Thống kê: số phim KHÁC NHAU có suất chiếu (chưa hủy) trong tháng hiện tại. Chỉ 1 truy vấn.
    private async Task FillMonthlyStatsAsync(List<CinemaDto> cinemas)
    {
        if (cinemas.Count == 0) return;

        var now = DateTime.UtcNow;
        var from = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var to = from.AddMonths(1);

        var rows = await _context.Showtimes
            .Where(s => s.StartTime >= from && s.StartTime < to && s.Status != "cancelled")
            .Select(s => new { s.AuditoriumId, s.Auditorium.CinemaId, s.MovieId })
            .Distinct()
            .ToListAsync();

        var perAuditorium = rows.GroupBy(r => r.AuditoriumId).ToDictionary(g => g.Key, g => g.Count());
        var perCinema = rows.GroupBy(r => r.CinemaId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.MovieId).Distinct().Count());

        foreach (var c in cinemas)
        {
            c.ActiveMovieCountThisMonth = perCinema.GetValueOrDefault(c.Id);
            foreach (var a in c.Auditoriums)
                a.ActiveMovieCountThisMonth = perAuditorium.GetValueOrDefault(a.Id);
        }
    }

    // ---------- CINEMA CRUD ----------
    public async Task<CinemaDto> CreateCinemaAsync(CinemaUpsertRequest r)
    {
        ValidateCinema(r);
        var cinema = new Cinema
        {
            Id = Guid.NewGuid(), Name = r.Name.Trim(), City = r.City?.Trim(),
            Address = r.Address?.Trim(), Hotline = r.Hotline?.Trim(),
            ImageUrl = r.ImageUrl?.Trim(), CreatedAt = DateTime.UtcNow
        };
        _context.Cinemas.Add(cinema);
        await _context.SaveChangesAsync();
        return ToDto(cinema);
    }

    public async Task<CinemaDto?> UpdateCinemaAsync(Guid id, CinemaUpsertRequest r)
    {
        ValidateCinema(r);
        var cinema = await _context.Cinemas.FirstOrDefaultAsync(c => c.Id == id);
        if (cinema == null) return null;

        cinema.Name = r.Name.Trim();
        cinema.City = r.City?.Trim();
        cinema.Address = r.Address?.Trim();
        cinema.Hotline = r.Hotline?.Trim();
        cinema.ImageUrl = r.ImageUrl?.Trim();
        await _context.SaveChangesAsync();
        return ToDto(cinema);
    }

    public async Task<bool> DeleteCinemaAsync(Guid id)
    {
        var cinema = await _context.Cinemas.Include(c => c.Auditoriums).FirstOrDefaultAsync(c => c.Id == id);
        if (cinema == null) return false;

        var now = DateTime.UtcNow;
        var hasUpcoming = await _context.Showtimes.AnyAsync(s =>
            s.Auditorium.CinemaId == id && s.StartTime > now && s.Status != "cancelled");
        if (hasUpcoming)
            throw new InvalidOperationException("Rạp còn suất chiếu sắp tới. Hãy hủy các suất chiếu trước khi xóa rạp.");

        cinema.DeletedAt = now;
        foreach (var a in cinema.Auditoriums) a.DeletedAt ??= now;
        await _context.SaveChangesAsync();
        return true;
    }

    // ---------- AUDITORIUM CRUD ----------
    public async Task<AuditoriumDto?> CreateAuditoriumAsync(Guid cinemaId, AuditoriumUpsertRequest r)
    {
        ValidateAuditorium(r);
        if (!await _context.Cinemas.AnyAsync(c => c.Id == cinemaId)) return null;
        await EnsureUniqueAuditoriumName(cinemaId, r.Name, null);

        var a = new Auditorium
        {
            Id = Guid.NewGuid(), CinemaId = cinemaId, Name = r.Name.Trim(),
            HallType = r.HallType, TotalRows = r.TotalRows, TotalColumns = r.TotalColumns
        };
        _context.Auditoriums.Add(a);
        await _context.SaveChangesAsync();
        return ToDto(a);
    }

    public async Task<AuditoriumDto?> UpdateAuditoriumAsync(Guid id, AuditoriumUpsertRequest r)
    {
        ValidateAuditorium(r);
        var a = await _context.Auditoriums.FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return null;
        await EnsureUniqueAuditoriumName(a.CinemaId, r.Name, id);

        var sizeChanged = a.TotalRows != r.TotalRows || a.TotalColumns != r.TotalColumns;
        if (sizeChanged && await _context.Seats.AnyAsync(s => s.AuditoriumId == id))
            throw new InvalidOperationException("Phòng đã có sơ đồ ghế, không thể đổi số hàng/cột.");

        a.Name = r.Name.Trim();
        a.HallType = r.HallType;
        a.TotalRows = r.TotalRows;
        a.TotalColumns = r.TotalColumns;
        await _context.SaveChangesAsync();
        return ToDto(a);
    }

    public async Task<bool> DeleteAuditoriumAsync(Guid id)
    {
        var a = await _context.Auditoriums.FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return false;

        var now = DateTime.UtcNow;
        if (await _context.Showtimes.AnyAsync(s => s.AuditoriumId == id && s.StartTime > now && s.Status != "cancelled"))
            throw new InvalidOperationException("Phòng còn suất chiếu sắp tới. Hãy hủy các suất chiếu trước khi xóa phòng.");

        a.DeletedAt = now;
        await _context.SaveChangesAsync();
        return true;
    }

    // ---------- helpers ----------
    private static void ValidateCinema(CinemaUpsertRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new InvalidOperationException("Tên rạp không được để trống.");
        if (string.IsNullOrWhiteSpace(r.City)) throw new InvalidOperationException("Vui lòng nhập tỉnh/thành.");
        if (string.IsNullOrWhiteSpace(r.Address)) throw new InvalidOperationException("Vui lòng nhập địa chỉ.");
    }

    private static void ValidateAuditorium(AuditoriumUpsertRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new InvalidOperationException("Tên phòng không được để trống.");
        if (!HallTypes.Contains(r.HallType)) throw new InvalidOperationException("Định dạng phòng phải là 2D, 3D, IMAX hoặc GOLDCLASS.");
        if (r.TotalRows is < 1 or > 26) throw new InvalidOperationException("Số hàng ghế phải từ 1 đến 26.");
        if (r.TotalColumns is < 1 or > 30) throw new InvalidOperationException("Số cột ghế phải từ 1 đến 30.");
    }

    private async Task EnsureUniqueAuditoriumName(Guid cinemaId, string name, Guid? excludeId)
    {
        var n = name.Trim().ToLower();
        var exists = await _context.Auditoriums.AnyAsync(a =>
            a.CinemaId == cinemaId && a.Id != excludeId && a.Name.ToLower() == n);
        if (exists) throw new InvalidOperationException("Tên phòng đã tồn tại trong rạp này.");
    }

    private static CinemaDto ToDto(Cinema c) => new()
    {
        Id = c.Id, Name = c.Name, Address = c.Address, City = c.City,
        Hotline = c.Hotline, ImageUrl = c.ImageUrl
    };

    private static AuditoriumDto ToDto(Auditorium a) => new()
    {
        Id = a.Id, CinemaId = a.CinemaId, Name = a.Name, HallType = a.HallType,
        TotalRows = a.TotalRows, TotalColumns = a.TotalColumns
    };
}