namespace MovieBooking.Service.DTOs;

public enum AdminShowtimeSeatsOutcome
{
    Success,
    NotFound
}

public class AdminShowtimeSeatsResult
{
    public AdminShowtimeSeatsOutcome Outcome { get; set; }
    public string? ErrorMessage { get; set; }
    public IEnumerable<AdminShowtimeSeatDto>? Seats { get; set; }
}
