namespace MovieBooking.Service.DTOs;

public enum SetSeatMaintenanceOutcome
{
    Success,
    InvalidRequest,
    ShowtimeNotFound,
    ShowtimeCancelled,
    SeatNotFound,
    SeatSold,
    SeatPending
}

public class SetSeatMaintenanceResult
{
    public SetSeatMaintenanceOutcome Outcome { get; set; }
    public string? ErrorMessage { get; set; }
    public string Message { get; set; } = string.Empty;
    public Guid ShowtimeId { get; set; }
    public Guid SeatId { get; set; }
    public Guid ShowtimeSeatId { get; set; }
    public string Status { get; set; } = string.Empty;
}
