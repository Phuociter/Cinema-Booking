namespace MovieBooking.Service.DTOs;

public class SnackDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? Description { get; set; }
}

public class CinemaSnackDto
{
    public Guid Id { get; set; }
    public Guid CinemaId { get; set; }
    public Guid SnackId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public decimal Price { get; set; }
    public bool IsAvailable { get; set; }
}
