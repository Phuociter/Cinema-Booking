namespace MovieBooking.Service.DTOs;

public enum CancelShowtimeOutcome
{
    Success,
    NotFound,
    AlreadyCancelled,
    HasPaidBookings
}

public class CancelShowtimeResult
{
    public CancelShowtimeOutcome Outcome { get; set; }
    public string? ErrorMessage { get; set; }
    public Guid ShowtimeId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int CancelledPendingBookingsCount { get; set; }
}
