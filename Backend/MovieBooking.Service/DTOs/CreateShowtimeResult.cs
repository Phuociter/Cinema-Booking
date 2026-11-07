namespace MovieBooking.Service.DTOs;

public enum CreateShowtimeOutcome
{
    Success,
    InvalidRequest,
    MovieNotFound,
    AuditoriumNotFound,
    NoPhysicalSeats,
    ConflictOverlap
}

public class CreateShowtimeResult
{
    public CreateShowtimeOutcome Outcome { get; set; }
    public string? ErrorMessage { get; set; }
    public ShowtimeDto? Data { get; set; }
    public Guid? AuditoriumId { get; set; }
    public string? AuditoriumName { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
}
