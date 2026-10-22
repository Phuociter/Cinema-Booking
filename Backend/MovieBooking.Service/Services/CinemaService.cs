using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Service.DTOs;

using MovieBooking.Data.Constants;
using MovieBooking.Data.Entities;

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
            .OrderBy(s => s.RowLabel)
            .ThenBy(s => s.ColumnNumber)
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
        // ============================================================
    // ADMIN: QUẢN LÝ PHÒNG CHIẾU
    // ============================================================

    private static readonly string[] AllowedHallTypes = { "2D", "3D", "IMAX", "GOLDCLASS" };

    private static string? NormalizeHallType(string? input)
    {
        var value = (input ?? "2D").Trim().ToUpperInvariant();
        return AllowedHallTypes.Contains(value) ? value : null;
    }

    private static AuditoriumDto ToDto(Auditorium a) => new()
    {
        Id = a.Id,
        CinemaId = a.CinemaId,
        Name = a.Name,
        HallType = a.HallType,
        TotalRows = a.TotalRows,
        TotalColumns = a.TotalColumns
    };

    // POST /api/auditoriums
    public async Task<ServiceResult<AuditoriumCreatedDto>> CreateAuditoriumAsync(
        CreateAuditoriumRequest request)
    {
        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length == 0)
            return ServiceResult<AuditoriumCreatedDto>.Fail(400, "Tên phòng không được để trống");

        var hallType = NormalizeHallType(request.HallType);
        if (hallType == null)
            return ServiceResult<AuditoriumCreatedDto>.Fail(400, "Định dạng chiếu chỉ nhận: 2D, 3D, IMAX");

        // Global query filter đã loại rạp bị xóa mềm
        var cinemaExists = await _context.Cinemas.AnyAsync(c => c.Id == request.CinemaId);
        if (!cinemaExists)
            return ServiceResult<AuditoriumCreatedDto>.Fail(404, "Không tìm thấy rạp");

        var nameTaken = await _context.Auditoriums
            .AnyAsync(a => a.CinemaId == request.CinemaId && a.Name == name);
        if (nameTaken)
            return ServiceResult<AuditoriumCreatedDto>.Fail(409, "Tên phòng đã tồn tại trong rạp này");

        // Lấy 3 loại ghế mặc định
        var seatTypeList = await _context.SeatTypes
            .Where(st => st.Name == "Standard" || st.Name == "VIP" || st.Name == "Couple")
            .ToListAsync();

        var seatTypeIds = seatTypeList
            .GroupBy(st => st.Name)
            .ToDictionary(g => g.Key, g => g.First().Id);

        foreach (var required in new[] { "Standard", "VIP", "Couple" })
        {
            if (!seatTypeIds.ContainsKey(required))
                return ServiceResult<AuditoriumCreatedDto>.Fail(
                    500, $"Chưa có loại ghế '{required}' trong bảng seattypes. Hãy seed dữ liệu trước.");
        }

        var auditorium = new Auditorium
        {
            Id = Guid.NewGuid(),
            CinemaId = request.CinemaId,
            Name = name,
            HallType = hallType,
            TotalRows = request.TotalRows,
            TotalColumns = request.TotalColumns
        };

        var seats = new List<Seat>(request.TotalRows * request.TotalColumns);

        for (var r = 0; r < request.TotalRows; r++)
        {
            var rowLabel = ((char)('A' + r)).ToString();

            // Hàng cuối: Couple, hàng kế cuối: VIP, còn lại: Standard
            var seatTypeId =
                r == request.TotalRows - 1 ? seatTypeIds["Couple"] :
                r == request.TotalRows - 2 ? seatTypeIds["VIP"] :
                seatTypeIds["Standard"];

            for (var c = 1; c <= request.TotalColumns; c++)
            {
                seats.Add(new Seat
                {
                    Id = Guid.NewGuid(),
                    AuditoriumId = auditorium.Id,
                    SeatTypeId = seatTypeId,
                    RowLabel = rowLabel,
                    ColumnNumber = c,
                    SeatCode = $"{rowLabel}{c}"
                });
            }
        }

        // 1 transaction: phòng + toàn bộ ghế, lỗi giữa chừng thì rollback hết
        await using var tx = await _context.Database.BeginTransactionAsync();

        _context.Auditoriums.Add(auditorium);
        _context.Seats.AddRange(seats);
        await _context.SaveChangesAsync();

        await tx.CommitAsync();

        var dto = new AuditoriumCreatedDto
        {
            Id = auditorium.Id,
            CinemaId = auditorium.CinemaId,
            Name = auditorium.Name,
            HallType = auditorium.HallType,
            TotalRows = auditorium.TotalRows,
            TotalColumns = auditorium.TotalColumns,
            SeatCount = seats.Count
        };

        return ServiceResult<AuditoriumCreatedDto>.Ok(dto);
    }

    // PUT /api/auditoriums/{id}/seats/layout
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

    // PUT /api/auditoriums/{id}
    public async Task<ServiceResult<AuditoriumDto>> UpdateAuditoriumAsync(
        Guid id, UpdateAuditoriumRequest request)
    {
        var auditorium = await _context.Auditoriums.FirstOrDefaultAsync(a => a.Id == id);
        if (auditorium == null)
            return ServiceResult<AuditoriumDto>.Fail(404, "Không tìm thấy phòng chiếu");

        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length == 0)
            return ServiceResult<AuditoriumDto>.Fail(400, "Tên phòng không được để trống");

        var hallType = NormalizeHallType(request.HallType);
        if (hallType == null)
            return ServiceResult<AuditoriumDto>.Fail(400, "Định dạng chiếu chỉ nhận: 2D, 3D, IMAX");

        var nameTaken = await _context.Auditoriums.AnyAsync(a =>
            a.CinemaId == auditorium.CinemaId && a.Name == name && a.Id != id);
        if (nameTaken)
            return ServiceResult<AuditoriumDto>.Fail(409, "Tên phòng đã tồn tại trong rạp này");

        auditorium.Name = name;
        auditorium.HallType = hallType;

        await _context.SaveChangesAsync();

        return ServiceResult<AuditoriumDto>.Ok(ToDto(auditorium));
    }

    // DELETE /api/auditoriums/{id}  (xóa mềm)
    public async Task<ServiceResult<bool>> DeleteAuditoriumAsync(Guid id)
    {
        var auditorium = await _context.Auditoriums.FirstOrDefaultAsync(a => a.Id == id);
        if (auditorium == null)
            return ServiceResult<bool>.Fail(404, "Không tìm thấy phòng chiếu");

        var now = DateTime.UtcNow;

        var hasUpcomingShowtimes = await _context.Showtimes.AnyAsync(s =>
            s.AuditoriumId == id &&
            s.Status == ShowtimeStatus.Scheduled &&
            s.EndTime > now);

        if (hasUpcomingShowtimes)
            return ServiceResult<bool>.Fail(
                409, "Phòng đang có suất chiếu chưa kết thúc, không thể xóa");

        auditorium.DeletedAt = now;   // ghế cũ được giữ nguyên
        await _context.SaveChangesAsync();

        return ServiceResult<bool>.Ok(true);
    }
        // ============================================================
    // ADMIN: CRUD CỤM RẠP & BÁO CÁO
    // ============================================================

    private static CinemaDto ToCinemaDto(Cinema c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Address = c.Address,
        City = c.City,
        Hotline = c.Hotline,
        ImageUrl = c.ImageUrl
    };

    private static string? NullIfBlank(string? s) =>
        string.IsNullOrWhiteSpace(s) ? null : s.Trim();

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

    // POST /api/cinemas
    public async Task<ServiceResult<CinemaDto>> CreateCinemaAsync(CreateCinemaRequest request)
    {
        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length == 0)
            return ServiceResult<CinemaDto>.Fail(400, "Tên rạp không được để trống");

        var duplicated = await _context.Cinemas.AnyAsync(c =>
            c.Name == name && c.City == NullIfBlank(request.City));
        if (duplicated)
            return ServiceResult<CinemaDto>.Fail(409, "Rạp cùng tên đã tồn tại trong thành phố này");

        var cinema = new Cinema
        {
            Id = Guid.NewGuid(),
            Name = name,
            Address = NullIfBlank(request.Address),
            City = NullIfBlank(request.City),
            Hotline = NullIfBlank(request.Hotline),
            ImageUrl = NullIfBlank(request.ImageUrl),
            CreatedAt = DateTime.UtcNow
        };

        _context.Cinemas.Add(cinema);
        await _context.SaveChangesAsync();

        return ServiceResult<CinemaDto>.Ok(ToCinemaDto(cinema));
    }

    // PUT /api/cinemas/{id}
    public async Task<ServiceResult<CinemaDto>> UpdateCinemaAsync(Guid id, UpdateCinemaRequest request)
    {
        var cinema = await _context.Cinemas.FirstOrDefaultAsync(c => c.Id == id);
        if (cinema == null)
            return ServiceResult<CinemaDto>.Fail(404, "Không tìm thấy rạp");

        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length == 0)
            return ServiceResult<CinemaDto>.Fail(400, "Tên rạp không được để trống");

        var city = NullIfBlank(request.City);
        var duplicated = await _context.Cinemas.AnyAsync(c =>
            c.Id != id && c.Name == name && c.City == city);
        if (duplicated)
            return ServiceResult<CinemaDto>.Fail(409, "Rạp cùng tên đã tồn tại trong thành phố này");

        cinema.Name = name;
        cinema.Address = NullIfBlank(request.Address);
        cinema.City = city;
        cinema.Hotline = NullIfBlank(request.Hotline);
        cinema.ImageUrl = NullIfBlank(request.ImageUrl);

        await _context.SaveChangesAsync();

        return ServiceResult<CinemaDto>.Ok(ToCinemaDto(cinema));
    }

    // DELETE /api/cinemas/{id}  (xóa mềm)
    public async Task<ServiceResult<bool>> DeleteCinemaAsync(Guid id)
    {
        var cinema = await _context.Cinemas.FirstOrDefaultAsync(c => c.Id == id);
        if (cinema == null)
            return ServiceResult<bool>.Fail(404, "Không tìm thấy rạp");

        var now = DateTime.UtcNow;

        var hasUpcomingShowtimes = await _context.Showtimes.AnyAsync(s =>
            s.Auditorium.CinemaId == id &&
            s.Status == ShowtimeStatus.Scheduled &&
            s.EndTime > now);

        if (hasUpcomingShowtimes)
            return ServiceResult<bool>.Fail(
                409, "Rạp đang có suất chiếu chưa kết thúc, không thể xóa");

        await using var tx = await _context.Database.BeginTransactionAsync();

        cinema.DeletedAt = now;

        var auditoriums = await _context.Auditoriums
            .Where(a => a.CinemaId == id)
            .ToListAsync();
        foreach (var a in auditoriums) a.DeletedAt = now;

        var cinemaSnacks = await _context.CinemaSnacks
            .Where(cs => cs.CinemaId == id)
            .ToListAsync();
        foreach (var cs in cinemaSnacks) cs.DeletedAt = now;

        await _context.SaveChangesAsync();
        await tx.CommitAsync();

        return ServiceResult<bool>.Ok(true);
    }

    // GET /api/reports/occupancy-rates?from=...&to=...
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
}
