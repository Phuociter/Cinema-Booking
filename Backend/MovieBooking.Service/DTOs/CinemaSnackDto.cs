namespace MovieBooking.Service.DTOs.Snack
{
	public class CinemaSnackDto
	{
		public Guid Id { get; set; }
		public Guid CinemaId { get; set; }
		public Guid SnackId { get; set; }
		public string Name { get; set; } = null!;
		public string? ImageUrl { get; set; }
		public string? Description { get; set; }
		public decimal Price { get; set; }
		public bool IsAvailable { get; set; }
	}
}