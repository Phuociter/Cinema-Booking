using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Controllers
{
    [ApiController]
    public class SnacksController : ControllerBase
    {
        private readonly ISnackService _snackService;

        public SnacksController(ISnackService snackService)
        {
            _snackService = snackService;
        }

        // ==========================================
        // 1. QUẢN LÝ DANH MỤC MASTER (ADMIN)
        // ==========================================

        [HttpGet("api/snacks")]
        public async Task<IActionResult> GetAllSnacks()
        {
            var snacks = await _snackService.GetAllSnacksAsync();
            return Ok(snacks);
        }

        [HttpPost("api/snacks")]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateSnack([FromBody] SnackDto snackDto)
        {
            var created = await _snackService.CreateSnackAsync(snackDto);
            return CreatedAtAction(nameof(GetAllSnacks), new { id = created.Id }, created);
        }

        [HttpPut("api/snacks/{id}")]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateSnack(Guid id, [FromBody] SnackDto snackDto)
        {
            var success = await _snackService.UpdateSnackAsync(id, snackDto);
            if (!success) return NotFound(new { message = "Không tìm thấy món hoặc món đã bị xóa." });
            return Ok(new { message = "Cập nhật thành công." });
        }

        [HttpDelete("api/snacks/{id}")]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteSnack(Guid id)
        {
            var success = await _snackService.DeleteSnackAsync(id);
            if (!success) return NotFound(new { message = "Không tìm thấy món." });
            return Ok(new { message = "Đã xóa món thành công." });
        }

        // ==========================================
        // 2. QUẢN LÝ THỰC ĐƠN TẠI TỪNG CỤM RẠP
        // ==========================================

        [HttpGet("api/cinemas/{cinemaId}/snacks")]
        public async Task<IActionResult> GetSnacksByCinema(Guid cinemaId, [FromQuery] bool onlyAvailable = false)
        {
            // onlyAvailable = true (Dành cho Khách đặt vé) / false (Dành cho Admin quản lý)
            var snacks = await _snackService.GetSnacksByCinemaAsync(cinemaId, onlyAvailable);
            return Ok(snacks);
        }

        [HttpPost("api/cinemas/{cinemaId}/snacks")]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddSnackToCinema(Guid cinemaId, [FromBody] AddCinemaSnackRequest request)
        {
            var success = await _snackService.AddSnackToCinemaAsync(cinemaId, request.SnackId, request.Price);
            if (!success) return BadRequest(new { message = "Món này đã tồn tại trong rạp hoặc dữ liệu không hợp lệ." });
            return Ok(new { message = "Thêm món vào rạp thành công." });
        }

        [HttpPut("api/cinemas/{cinemaId}/snacks/{snackId}")]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateCinemaSnack(Guid cinemaId, Guid snackId, [FromBody] UpdateCinemaSnackRequest request)
        {
            var success = await _snackService.UpdateCinemaSnackAsync(cinemaId, snackId, request.Price, request.IsAvailable);
            if (!success) return NotFound(new { message = "Không tìm thấy món này tại rạp." });
            return Ok(new { message = "Cập nhật giá và trạng thái thành công." });
        }

        [HttpDelete("api/cinemas/{cinemaId}/snacks/{snackId}")]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RemoveSnackFromCinema(Guid cinemaId, Guid snackId)
        {
            var success = await _snackService.RemoveSnackFromCinemaAsync(cinemaId, snackId);
            if (!success) return NotFound(new { message = "Không tìm thấy món này tại rạp." });
            return Ok(new { message = "Đã gỡ món khỏi rạp." });
        }
    }

    // ==========================================
    // CÁC LỚP MODEL HỖ TRỢ NHẬN DATA TỪ FRONTEND
    // ==========================================
    public class AddCinemaSnackRequest
    {
        public Guid SnackId { get; set; }
        public decimal Price { get; set; }
    }

    public class UpdateCinemaSnackRequest
    {
        public decimal Price { get; set; }
        public bool IsAvailable { get; set; }
    }
}