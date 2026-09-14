namespace MovieBooking.Data.Entities;

public class CinemaSnack : ISoftDeletable
{
    public Guid Id { get; set; }
    public Guid CinemaId { get; set; }
    public Cinema Cinema { get; set; } = null!;
    public Guid SnackId { get; set; }
    public Snack Snack { get; set; } = null!;
    public decimal Price { get; set; }
    public bool IsAvailable { get; set; } = true;
    public DateTime? DeletedAt { get; set; }

    public ICollection<BookingSnack> BookingSnacks { get; set; } = new List<BookingSnack>();
}
