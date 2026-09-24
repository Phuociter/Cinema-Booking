using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Service.DTOs;
using System.Data;
using System.Data.Common;

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
}