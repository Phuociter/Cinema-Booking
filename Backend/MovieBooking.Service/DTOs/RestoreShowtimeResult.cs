namespace MovieBooking.Service.DTOs;

public enum RestoreShowtimeOutcome
{
    Success,
    NotFound,
    NotCancelled,
    PastStartTime,
    ConflictOverlap
}

public class RestoreShowtimeResult
{
    public RestoreShowtimeOutcome Outcome { get; set; }
    public string? ErrorMessage { get; set; }
    public Guid ShowtimeId { get; set; }
    public string Status { get; set; } = string.Empty;
}
