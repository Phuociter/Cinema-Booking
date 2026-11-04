using System.ComponentModel.DataAnnotations;

namespace MovieBooking.Service.DTOs;

public class CreateAuditoriumRequest
{
    public Guid CinemaId { get; set; }

    [Required, StringLength(50, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    // 2D / 3D / IMAX
    public string HallType { get; set; } = "2D";

    [Range(1, 26, ErrorMessage = "Số hàng phải từ 1 đến 26")]
    public int TotalRows { get; set; }

    [Range(1, 50, ErrorMessage = "Số cột phải từ 1 đến 50")]
    public int TotalColumns { get; set; }
}

public class UpdateAuditoriumRequest
{
    [Required, StringLength(50, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    public string HallType { get; set; } = "2D";
}

public class SeatTypeChangeItem
{
    public Guid SeatId { get; set; }
    public Guid SeatTypeId { get; set; }
}

public class UpdateSeatLayoutRequest
{
    [Required, MinLength(1, ErrorMessage = "Danh sách ghế không được rỗng")]
    public List<SeatTypeChangeItem> Seats { get; set; } = new();
}

public class AuditoriumCreatedDto : AuditoriumDto
{
    public int SeatCount { get; set; }
}