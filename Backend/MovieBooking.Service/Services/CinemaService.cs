using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Service.DTOs;
using System.Data;
using System.Data.Common;

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

    // GET /api/cinemas?city=...
    public async Task<List<CinemaDto>> GetCinemasAsync(string? city = null)
    {
        var connection = _context.Database.GetDbConnection();

        try
        {
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var command = connection.CreateCommand();

            command.CommandText = @"
                SELECT
                    c.id AS cinema_id,
                    c.name AS cinema_name,
                    c.address,
                    c.city,
                    c.hotline,
                    c.image_url,
                    a.id AS auditorium_id,
                    a.cinema_id,
                    a.name AS auditorium_name,
                    a.hall_type,
                    a.total_rows,
                    a.total_columns
                FROM cinemas c
                LEFT JOIN auditoriums a
                    ON a.cinema_id = c.id
                    AND a.deleted_at IS NULL
                WHERE c.deleted_at IS NULL
                    AND (@city::varchar IS NULL OR c.city = @city)
                ORDER BY c.name, a.name;
            ";

            var cityParameter = command.CreateParameter();
            cityParameter.ParameterName = "@city";
            cityParameter.Value = string.IsNullOrWhiteSpace(city)
                ? DBNull.Value
                : city;

            command.Parameters.Add(cityParameter);

            using var reader = await command.ExecuteReaderAsync();

            var cinemas = new List<CinemaDto>();

            while (await reader.ReadAsync())
            {
                var cinemaId = reader.GetGuid(reader.GetOrdinal("cinema_id"));

                var cinema = cinemas.FirstOrDefault(c => c.Id == cinemaId);

                if (cinema == null)
                {
                    cinema = new CinemaDto
                    {
                        Id = cinemaId,
                        Name = reader.GetString(reader.GetOrdinal("cinema_name")),
                        Address = reader.IsDBNull(reader.GetOrdinal("address"))
                            ? null
                            : reader.GetString(reader.GetOrdinal("address")),
                        City = reader.IsDBNull(reader.GetOrdinal("city"))
                            ? null
                            : reader.GetString(reader.GetOrdinal("city")),
                        Hotline = reader.IsDBNull(reader.GetOrdinal("hotline"))
                            ? null
                            : reader.GetString(reader.GetOrdinal("hotline")),
                        ImageUrl = reader.IsDBNull(reader.GetOrdinal("image_url"))
                            ? null
                            : reader.GetString(reader.GetOrdinal("image_url"))
                    };

                    cinemas.Add(cinema);
                }

                var auditoriumIdOrdinal = reader.GetOrdinal("auditorium_id");

                if (!reader.IsDBNull(auditoriumIdOrdinal))
                {
                    var auditoriumId = reader.GetGuid(auditoriumIdOrdinal);

                    if (!cinema.Auditoriums.Any(a => a.Id == auditoriumId))
                    {
                        cinema.Auditoriums.Add(new AuditoriumDto
                        {
                            Id = auditoriumId,
                            CinemaId = cinemaId,
                            Name = reader.GetString(
                                reader.GetOrdinal("auditorium_name")),
                            HallType = reader.IsDBNull(
                                reader.GetOrdinal("hall_type"))
                                ? "2D"
                                : reader.GetString(
                                    reader.GetOrdinal("hall_type")),
                            TotalRows = reader.IsDBNull(
                                reader.GetOrdinal("total_rows"))
                                ? null
                                : reader.GetInt32(
                                    reader.GetOrdinal("total_rows")),
                            TotalColumns = reader.IsDBNull(
                                reader.GetOrdinal("total_columns"))
                                ? null
                                : reader.GetInt32(
                                    reader.GetOrdinal("total_columns"))
                        });
                    }
                }
            }

            return cinemas;
        }
        finally
        {
            if (connection.State == ConnectionState.Open)
            {
                await connection.CloseAsync();
            }
        }
    }

    // GET /api/cinemas/{id}
    public async Task<CinemaDto?> GetCinemaByIdAsync(Guid id)
    {
        var connection = _context.Database.GetDbConnection();

        try
        {
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var command = connection.CreateCommand();

            command.CommandText = @"
                SELECT
                    c.id AS cinema_id,
                    c.name AS cinema_name,
                    c.address,
                    c.city,
                    c.hotline,
                    c.image_url,
                    a.id AS auditorium_id,
                    a.cinema_id,
                    a.name AS auditorium_name,
                    a.hall_type,
                    a.total_rows,
                    a.total_columns
                FROM cinemas c
                LEFT JOIN auditoriums a
                    ON a.cinema_id = c.id
                    AND a.deleted_at IS NULL
                WHERE c.id = @id
                    AND c.deleted_at IS NULL
                ORDER BY a.name;
            ";

            var idParameter = command.CreateParameter();
            idParameter.ParameterName = "@id";
            idParameter.Value = id;

            command.Parameters.Add(idParameter);

            using var reader = await command.ExecuteReaderAsync();

            CinemaDto? cinema = null;

            while (await reader.ReadAsync())
            {
                var cinemaId = reader.GetGuid(
                    reader.GetOrdinal("cinema_id"));

                if (cinema == null)
                {
                    cinema = new CinemaDto
                    {
                        Id = cinemaId,
                        Name = reader.GetString(
                            reader.GetOrdinal("cinema_name")),
                        Address = reader.IsDBNull(
                            reader.GetOrdinal("address"))
                            ? null
                            : reader.GetString(
                                reader.GetOrdinal("address")),
                        City = reader.IsDBNull(
                            reader.GetOrdinal("city"))
                            ? null
                            : reader.GetString(
                                reader.GetOrdinal("city")),
                        Hotline = reader.IsDBNull(
                            reader.GetOrdinal("hotline"))
                            ? null
                            : reader.GetString(
                                reader.GetOrdinal("hotline")),
                        ImageUrl = reader.IsDBNull(
                            reader.GetOrdinal("image_url"))
                            ? null
                            : reader.GetString(
                                reader.GetOrdinal("image_url"))
                    };
                }

                var auditoriumIdOrdinal =
                    reader.GetOrdinal("auditorium_id");

                if (!reader.IsDBNull(auditoriumIdOrdinal))
                {
                    cinema.Auditoriums.Add(new AuditoriumDto
                    {
                        Id = reader.GetGuid(auditoriumIdOrdinal),
                        CinemaId = cinemaId,
                        Name = reader.GetString(
                            reader.GetOrdinal("auditorium_name")),
                        HallType = reader.IsDBNull(
                            reader.GetOrdinal("hall_type"))
                            ? "2D"
                            : reader.GetString(
                                reader.GetOrdinal("hall_type")),
                        TotalRows = reader.IsDBNull(
                            reader.GetOrdinal("total_rows"))
                            ? null
                            : reader.GetInt32(
                                reader.GetOrdinal("total_rows")),
                        TotalColumns = reader.IsDBNull(
                            reader.GetOrdinal("total_columns"))
                            ? null
                            : reader.GetInt32(
                                reader.GetOrdinal("total_columns"))
                    });
                }
            }

            return cinema;
        }
        finally
        {
            if (connection.State == ConnectionState.Open)
            {
                await connection.CloseAsync();
            }
        }
    }

    // GET /api/auditoriums/{id}/seats
    public async Task<List<SeatDto>> GetSeatsByAuditoriumIdAsync(
        Guid auditoriumId)
    {
        var connection = _context.Database.GetDbConnection();

        try
        {
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var command = connection.CreateCommand();

            command.CommandText = @"
                SELECT
                    s.id,
                    s.auditorium_id,
                    s.row_label,
                    s.column_number,
                    st.name AS seat_type
                FROM seats s
                INNER JOIN seattypes st
                    ON st.id = s.seat_type_id
                WHERE s.auditorium_id = @auditoriumId
                    AND st.deleted_at IS NULL
                ORDER BY s.row_label, s.column_number;
            ";

            var auditoriumIdParameter = command.CreateParameter();
            auditoriumIdParameter.ParameterName = "@auditoriumId";
            auditoriumIdParameter.Value = auditoriumId;

            command.Parameters.Add(auditoriumIdParameter);

            using var reader = await command.ExecuteReaderAsync();

            var seats = new List<SeatDto>();

            while (await reader.ReadAsync())
            {
                seats.Add(new SeatDto
                {
                    Id = reader.GetGuid(
                        reader.GetOrdinal("id")),

                    AuditoriumId = reader.GetGuid(
                        reader.GetOrdinal("auditorium_id")),

                    Row = reader.GetString(
                        reader.GetOrdinal("row_label")),

                    Number = reader.GetInt32(
                        reader.GetOrdinal("column_number")),

                    SeatType = reader.GetString(
                        reader.GetOrdinal("seat_type"))
                });
            }

            return seats;
        }
        finally
        {
            if (connection.State == ConnectionState.Open)
            {
                await connection.CloseAsync();
            }
        }
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
}
