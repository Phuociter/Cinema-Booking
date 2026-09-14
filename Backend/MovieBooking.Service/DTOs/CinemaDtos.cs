namespace MovieBooking.Service.DTOs;

public class CinemaDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Hotline { get; set; }
    public string? ImageUrl { get; set; }
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
}
