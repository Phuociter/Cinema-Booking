using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Data.Constants;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories;
using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public class CinemaService : ICinemaService
{
    private static readonly string[] HallTypes = { "2D", "3D", "IMAX", "GOLDCLASS" };
    private readonly ICinemaRepository _repo;
    private readonly AppDbContext _context;

    public CinemaService(ICinemaRepository repo, AppDbContext context)
    {
        _repo = repo;
        _context = context;
    }

    // ---------- READ ----------
    public async Task<List<CinemaDto>> GetCinemasAsync(string? city = null)
    {
        var dtos = (await _repo.GetCinemasAsync(city)).Select(ToDto).ToList();
        await FillMonthlyStatsAsync(dtos);
        return dtos;
    }

    public async Task<CinemaDto?> GetCinemaByIdAsync(Guid id)
    {
        var cinema = await _repo.GetCinemaByIdAsync(id);
        if (cinema == null) return null;
        var dto = ToDto(cinema);
        await FillMonthlyStatsAsync(new List<CinemaDto> { dto });
        return dto;
    }

    public async Task<List<SeatDto>> GetSeatsByAuditoriumIdAsync(Guid auditoriumId)
    {
        var seats = await _repo.GetSeatsByAuditoriumIdAsync(auditoriumId);
        return seats.Select(s => new SeatDto
        {
            Id = s.Id,
            AuditoriumId = s.AuditoriumId,
            Row = s.RowLabel,
            Number = s.ColumnNumber,
            SeatType = s.SeatType.Name
        }).ToList();
    }

    private async Task FillMonthlyStatsAsync(List<CinemaDto> cinemas)
    {
        if (cinemas.Count == 0) return;
        var now = DateTime.UtcNow;
        var rows = await _repo.GetActiveMovieRowsAsync(now.Month, now.Year);

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
            Id = Guid.NewGuid(),
            Name = r.Name.Trim(),
            City = r.City?.Trim(),
            Address = r.Address?.Trim(),
            Hotline = r.Hotline?.Trim(),
            ImageUrl = r.ImageUrl?.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        await _repo.AddCinemaAsync(cinema);
        return ToDto(cinema);
    }

    public async Task<CinemaDto?> UpdateCinemaAsync(Guid id, CinemaUpsertRequest r)
    {
        ValidateCinema(r);
        var cinema = await _repo.GetCinemaByIdAsync(id, track: true);
        if (cinema == null) return null;

        cinema.Name = r.Name.Trim();
        cinema.City = r.City?.Trim();
        cinema.Address = r.Address?.Trim();
        cinema.Hotline = r.Hotline?.Trim();
        cinema.ImageUrl = r.ImageUrl?.Trim();
        await _repo.UpdateCinemaAsync(cinema);
        return ToDto(cinema);
    }

    public async Task<bool> DeleteCinemaAsync(Guid id)
    {
        var cinema = await _repo.GetCinemaByIdAsync(id, track: true);
        if (cinema == null) return false;

        if (await _repo.CinemaHasUpcomingShowtimesAsync(id, DateTime.UtcNow))
            throw new InvalidOperationException("Rạp còn suất chiếu sắp tới. Hãy hủy các suất chiếu trước khi xóa rạp.");

        await _repo.DeleteCinemaAsync(cinema);
        return true;
    }

    // ---------- AUDITORIUM CRUD ----------
    public async Task<AuditoriumDto?> CreateAuditoriumAsync(Guid cinemaId, AuditoriumUpsertRequest r)
    {
        ValidateAuditorium(r);
        if (!await _repo.CinemaExistsAsync(cinemaId)) return null;
        if (await _repo.AuditoriumNameExistsAsync(cinemaId, r.Name, null))
            throw new InvalidOperationException("Tên phòng đã tồn tại trong rạp này.");

        var a = new Auditorium
        {
            Id = Guid.NewGuid(),
            CinemaId = cinemaId,
            Name = r.Name.Trim(),
            HallType = r.HallType,
            TotalRows = r.TotalRows,
            TotalColumns = r.TotalColumns
        };
        await _repo.AddAuditoriumAsync(a);
        return ToDto(a);
    }

    public async Task<AuditoriumDto?> UpdateAuditoriumAsync(Guid id, AuditoriumUpsertRequest r)
    {
        ValidateAuditorium(r);
        var a = await _repo.GetAuditoriumByIdAsync(id);
        if (a == null) return null;
        if (await _repo.AuditoriumNameExistsAsync(a.CinemaId, r.Name, id))
            throw new InvalidOperationException("Tên phòng đã tồn tại trong rạp này.");

        var sizeChanged = a.TotalRows != r.TotalRows || a.TotalColumns != r.TotalColumns;
        if (sizeChanged && await _repo.AuditoriumHasSeatsAsync(id))
            throw new InvalidOperationException("Phòng đã có sơ đồ ghế, không thể đổi số hàng/cột.");

        a.Name = r.Name.Trim();
        a.HallType = r.HallType;
        a.TotalRows = r.TotalRows;
        a.TotalColumns = r.TotalColumns;
        await _repo.UpdateAuditoriumAsync(a);
        return ToDto(a);
    }

    public async Task<bool> DeleteAuditoriumAsync(Guid id)
    {
        var a = await _repo.GetAuditoriumByIdAsync(id);
        if (a == null) return false;

        if (await _repo.AuditoriumHasUpcomingShowtimesAsync(id, DateTime.UtcNow))
            throw new InvalidOperationException("Phòng còn suất chiếu sắp tới. Hãy hủy các suất chiếu trước khi xóa phòng.");

        await _repo.DeleteAuditoriumAsync(a);
        return true;
    }

    // ---------- LAYOUT & REPORTS ----------
    public async Task<ServiceResult<int>> UpdateSeatLayoutAsync(
        Guid auditoriumId, UpdateSeatLayoutRequest request)
    {
        var auditoriumExists = await _context.Auditoriums.AnyAsync(a => a.Id == auditoriumId);
        if (!auditoriumExists)
            return ServiceResult<int>.Fail(404, "Không tìm thấy phòng chiếu");

        var changes = request.Seats;

        if (changes.GroupBy(x => x.SeatId).Any(g => g.Count() > 1))
            return ServiceResult<int>.Fail(400, "Danh sách có ghế bị trùng SeatId");

        var seatIds = changes.Select(x => x.SeatId).ToList();

        var seats = await _context.Seats
            .Where(s => s.AuditoriumId == auditoriumId && seatIds.Contains(s.Id))
            .ToListAsync();

        if (seats.Count != seatIds.Count)
            return ServiceResult<int>.Fail(400, "Có ghế không tồn tại hoặc không thuộc phòng chiếu này");

        var typeIds = changes.Select(x => x.SeatTypeId).Distinct().ToList();
        var validTypeCount = await _context.SeatTypes.CountAsync(t => typeIds.Contains(t.Id));
        if (validTypeCount != typeIds.Count)
            return ServiceResult<int>.Fail(400, "Có loại ghế không hợp lệ");

        var map = changes.ToDictionary(x => x.SeatId, x => x.SeatTypeId);
        foreach (var seat in seats)
        {
            seat.SeatTypeId = map[seat.Id];
        }

        await _context.SaveChangesAsync();

        return ServiceResult<int>.Ok(seats.Count);
    }

    public async Task<List<OccupancyRateDto>> GetOccupancyRatesAsync(DateTime? from, DateTime? to)
    {
        var fromUtc = ToUtc(from);
        var toUtc = ToUtc(to);

        var query = _context.ShowtimeSeats
            .Where(ss => ss.Showtime.Status != ShowtimeStatus.Cancelled);

        if (fromUtc.HasValue)
            query = query.Where(ss => ss.Showtime.StartTime >= fromUtc.Value);
        if (toUtc.HasValue)
            query = query.Where(ss => ss.Showtime.StartTime < toUtc.Value);

        var stats = await query
            .GroupBy(ss => ss.Showtime.Auditorium.CinemaId)
            .Select(g => new
            {
                CinemaId = g.Key,
                Total = g.Count(),
                Reserved = g.Count(x => x.Status == "reserved")
            })
            .ToListAsync();

        var statMap = stats.ToDictionary(x => x.CinemaId);

        var cinemas = await _context.Cinemas
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.City })
            .ToListAsync();

        return cinemas.Select(c =>
        {
            statMap.TryGetValue(c.Id, out var s);
            var total = s?.Total ?? 0;
            var reserved = s?.Reserved ?? 0;

            return new OccupancyRateDto
            {
                CinemaId = c.Id,
                CinemaName = c.Name,
                City = c.City,
                TotalSeats = total,
                ReservedSeats = reserved,
                OccupancyRate = total == 0 ? 0 : Math.Round(reserved * 100.0 / total, 2)
            };
        }).ToList();
    }

    private static DateTime? ToUtc(DateTime? value)
    {
        if (!value.HasValue) return null;
        var v = value.Value;
        return v.Kind switch
        {
            DateTimeKind.Utc => v,
            DateTimeKind.Local => v.ToUniversalTime(),
            _ => DateTime.SpecifyKind(v, DateTimeKind.Utc)
        };
    }

    // ---------- Validate ----------
    private static void ValidateCinema(CinemaUpsertRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new InvalidOperationException("Tên rạp không được để trống.");
        if (string.IsNullOrWhiteSpace(r.City)) throw new InvalidOperationException("Vui lòng nhập tỉnh/thành.");
        if (string.IsNullOrWhiteSpace(r.Address)) throw new InvalidOperationException("Vui lòng nhập địa chỉ.");
        if (!string.IsNullOrWhiteSpace(r.Hotline) && !System.Text.RegularExpressions.Regex.IsMatch(r.Hotline.Trim(), @"^[0-9+\-\s().]{6,20}$"))
            throw new InvalidOperationException("Hotline không hợp lệ.");
    }

    private static void ValidateAuditorium(AuditoriumUpsertRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new InvalidOperationException("Tên phòng không được để trống.");
        if (!HallTypes.Contains(r.HallType)) throw new InvalidOperationException("Định dạng phòng phải là 2D, 3D, IMAX hoặc GOLDCLASS.");
        if (r.TotalRows is < 1 or > 26) throw new InvalidOperationException("Số hàng ghế phải từ 1 đến 26.");
        if (r.TotalColumns is < 1 or > 30) throw new InvalidOperationException("Số cột ghế phải từ 1 đến 30.");
    }

    // ---------- Mapping ----------
    private static CinemaDto ToDto(Cinema c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Address = c.Address,
        City = c.City,
        Hotline = c.Hotline,
        ImageUrl = c.ImageUrl,
        Auditoriums = c.Auditoriums.OrderBy(a => a.Name).Select(ToDto).ToList()
    };

    private static AuditoriumDto ToDto(Auditorium a) => new()
    {
        Id = a.Id,
        CinemaId = a.CinemaId,
        Name = a.Name,
        HallType = a.HallType,
        TotalRows = a.TotalRows,
        TotalColumns = a.TotalColumns
    };
}
