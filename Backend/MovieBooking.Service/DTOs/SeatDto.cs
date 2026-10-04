namespace MovieBooking.Service.DTOs;

public class SeatDto
{
    public Guid Id { get; set; }
    public Guid AuditoriumId { get; set; }
    public string Row { get; set; } = string.Empty;
    public int Number { get; set; }
    public string SeatType { get; set; } = string.Empty;
}