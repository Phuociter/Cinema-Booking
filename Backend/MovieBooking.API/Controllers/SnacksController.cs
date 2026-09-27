using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.Interfaces;
using MovieBooking.Service.DTOs;

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

        // GET: /api/snacks
        // Public access: Lấy danh mục bắp nước master
        [HttpGet("api/snacks")]
        public async Task<IActionResult> GetAllSnacks()
        {
            var snacks = await _snackService.GetAllSnacksAsync();
            return Ok(snacks);
        }

        // GET: /api/cinemas/{cinemaId}/snacks
        // Public access: Lấy menu bắp nước và giá tại cụm rạp đã chọn
        [HttpGet("api/cinemas/{cinemaId}/snacks")]
        public async Task<IActionResult> GetSnacksByCinema(Guid cinemaId)
        {
            var cinemaSnacks = await _snackService.GetSnacksByCinemaAsync(cinemaId);
            return Ok(cinemaSnacks);
        }
    }
}