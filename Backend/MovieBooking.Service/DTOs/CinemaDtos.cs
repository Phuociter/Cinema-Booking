using System.ComponentModel.DataAnnotations;

namespace MovieBooking.Service.DTOs;

public class CinemaDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Hotline { get; set; }
    public string? ImageUrl { get; set; }
    public int ActiveMovieCountThisMonth { get; set; }
    public List<AuditoriumDto> Auditoriums { get; set; } = new();
}

public class AuditoriumDto
{
    public Guid Id { get; set; }
    public Guid CinemaId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string HallType { get; set; } = "2D";
    public int? TotalRows { get; set; }
    public int? TotalColumns { get; set; }
    public int ActiveMovieCountThisMonth { get; set; }
}

// ---- Admin: CRUD cụm rạp & phòng chiếu ----

public class CinemaUpsertRequest
{
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Address { get; set; }
    public string? Hotline { get; set; }
    public string? ImageUrl { get; set; }
}

public class AuditoriumUpsertRequest
{
    public string Name { get; set; } = string.Empty;
    public string HallType { get; set; } = "2D";
    public int TotalRows { get; set; }
    public int TotalColumns { get; set; }
}

public class CreateCinemaRequest : CinemaUpsertRequest
{
}

public class UpdateCinemaRequest : CinemaUpsertRequest
{
}

// ---- Báo cáo: tỷ lệ lấp đầy ghế ----

public class OccupancyRateDto
{
    public Guid CinemaId { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public string? City { get; set; }
    public int TotalSeats { get; set; }
    public int ReservedSeats { get; set; }

    // Phần trăm, từ 0 đến 100
    public double OccupancyRate { get; set; }
}