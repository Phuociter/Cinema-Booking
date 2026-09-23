using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/showtimes")]
public class ShowtimesController : ControllerBase
{
    private readonly IScheduleService _scheduleService;

    public ShowtimesController(IScheduleService scheduleService)
    {
        _scheduleService = scheduleService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ShowtimeDto>>> GetShowtimes(
        [FromQuery] Guid? movieId,
        [FromQuery] Guid? cinemaId,
        [FromQuery] DateOnly? date,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _scheduleService.GetShowtimesAsync(movieId, cinemaId, date, dateFrom, dateTo, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ShowtimeDto>> GetShowtimeById(Guid id)
    {
        var showtime = await _scheduleService.GetShowtimeByIdAsync(id);
        if (showtime == null)
        {
            return NotFound(new { message = $"Không tìm thấy suất chiếu với ID: {id}" });
        }

        return Ok(showtime);
    }

    [HttpGet("{id:guid}/seats")]
    public async Task<ActionResult<IEnumerable<ShowtimeSeatDto>>> GetShowtimeSeats(Guid id)
    {
        if (!await _scheduleService.ShowtimeExistsAsync(id))
        {
            return NotFound(new { message = $"Không tìm thấy suất chiếu với ID: {id}" });
        }

        var seats = await _scheduleService.GetSeatsForShowtimeAsync(id);
        return Ok(seats);
    }
}
