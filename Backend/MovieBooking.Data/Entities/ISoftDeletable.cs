namespace MovieBooking.Data.Entities;

public interface ISoftDeletable
{
    DateTime? DeletedAt { get; set; }
}
