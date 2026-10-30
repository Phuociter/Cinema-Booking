using System.ComponentModel.DataAnnotations;

namespace MovieBooking.Service.DTOs;

public class ActorDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ProfilePath { get; set; }
    public int MoviesCount { get; set; }
}

public class CreateActorRequest
{
    [Required(ErrorMessage = "Tên diễn viên không được để trống.")]
    [StringLength(150, ErrorMessage = "Tên diễn viên không được vượt quá 150 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [Url(ErrorMessage = "Đường dẫn ảnh không hợp lệ.")]
    public string? ProfilePath { get; set; }
}

public class UpdateActorRequest
{
    [Required(ErrorMessage = "Tên diễn viên không được để trống.")]
    [StringLength(150, ErrorMessage = "Tên diễn viên không được vượt quá 150 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [Url(ErrorMessage = "Đường dẫn ảnh không hợp lệ.")]
    public string? ProfilePath { get; set; }
}
