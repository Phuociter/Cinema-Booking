namespace MovieBooking.Service.DTOs;

public class ShowtimeDto
{
    public Guid Id { get; set; }
    public Guid MovieId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterUrl { get; set; }
    public Guid AuditoriumId { get; set; }
    public string AuditoriumName { get; set; } = string.Empty;
    public Guid CinemaId { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public decimal BasePrice { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ShowtimeSeatDto
{
    public Guid Id { get; set; }
    public Guid ShowtimeId { get; set; }
    public Guid SeatId { get; set; }
    public string RowLabel { get; set; } = string.Empty;
    public int ColumnNumber { get; set; }
    public string SeatCode { get; set; } = string.Empty;
    public string SeatTypeName { get; set; } = string.Empty;
    public string ColorCode { get; set; } = string.Empty;
    public decimal ExtraPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string Status { get; set; } = "available"; // available, reserved
}
