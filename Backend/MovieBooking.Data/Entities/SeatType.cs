namespace MovieBooking.Data.Entities;

public class SeatType : ISoftDeletable
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ColorCode { get; set; } = "#FFFFFF";
    public decimal ExtraPrice { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<Seat> Seats { get; set; } = new List<Seat>();
}
