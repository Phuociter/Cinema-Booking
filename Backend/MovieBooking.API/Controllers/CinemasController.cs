using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.Services;
using Microsoft.AspNetCore.Authorization;
using MovieBooking.Service.DTOs;
namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api")]
public class CinemasController : ControllerBase
{
    private readonly ICinemaService _cinemaService;

    public CinemasController(ICinemaService cinemaService)
    {
        _cinemaService = cinemaService;
    }

    // GET /api/cinemas
    // GET /api/cinemas?city=Ho Chi Minh
    [HttpGet("cinemas")]
    public async Task<IActionResult> GetCinemas([FromQuery] string? city = null)
    {
        var cinemas = await _cinemaService.GetCinemasAsync(city);

        return Ok(cinemas);
    }

    // GET /api/cinemas/{id}
    [HttpGet("cinemas/{id:guid}")]
    public async Task<IActionResult> GetCinemaById(Guid id)
    {
        var cinema = await _cinemaService.GetCinemaByIdAsync(id);

        if (cinema == null)
        {
            return NotFound(new
            {
                message = "Cinema not found"
            });
        }

        return Ok(cinema);
    }

    // GET /api/auditoriums/{id}/seats
    [HttpGet("auditoriums/{id:guid}/seats")]
    public async Task<IActionResult> GetSeats(Guid id)
    {
        var seats = await _cinemaService.GetSeatsByAuditoriumIdAsync(id);

        return Ok(seats);
    }
        // ----- ADMIN CRUD -----
    [Authorize(Roles = "Admin")]
    [HttpPost("cinemas")]
    public async Task<IActionResult> CreateCinema([FromBody] CinemaUpsertRequest request)
        => await Run(async () => Ok(await _cinemaService.CreateCinemaAsync(request)));

    [Authorize(Roles = "Admin")]
    [HttpPut("cinemas/{id:guid}")]
    public async Task<IActionResult> UpdateCinema(Guid id, [FromBody] CinemaUpsertRequest request)
        => await Run(async () => await _cinemaService.UpdateCinemaAsync(id, request) is { } r
            ? Ok(r) : NotFound(new { message = "Không tìm thấy rạp." }));

    [Authorize(Roles = "Admin")]
    [HttpDelete("cinemas/{id:guid}")]
    public async Task<IActionResult> DeleteCinema(Guid id)
        => await Run(async () => await _cinemaService.DeleteCinemaAsync(id)
            ? NoContent() : NotFound(new { message = "Không tìm thấy rạp." }));

    [Authorize(Roles = "Admin")]
    [HttpPost("cinemas/{cinemaId:guid}/auditoriums")]
    public async Task<IActionResult> CreateAuditorium(Guid cinemaId, [FromBody] AuditoriumUpsertRequest request)
        => await Run(async () => await _cinemaService.CreateAuditoriumAsync(cinemaId, request) is { } r
            ? Ok(r) : NotFound(new { message = "Không tìm thấy rạp." }));

    [Authorize(Roles = "Admin")]
    [HttpPut("auditoriums/{id:guid}")]
    public async Task<IActionResult> UpdateAuditorium(Guid id, [FromBody] AuditoriumUpsertRequest request)
        => await Run(async () => await _cinemaService.UpdateAuditoriumAsync(id, request) is { } r
            ? Ok(r) : NotFound(new { message = "Không tìm thấy phòng chiếu." }));

    [Authorize(Roles = "Admin")]
    [HttpDelete("auditoriums/{id:guid}")]
    public async Task<IActionResult> DeleteAuditorium(Guid id)
        => await Run(async () => await _cinemaService.DeleteAuditoriumAsync(id)
            ? NoContent() : NotFound(new { message = "Không tìm thấy phòng chiếu." }));

    // Lỗi nghiệp vụ -> 400 kèm message tiếng Việt (axiosInstance sẽ đọc field "message")
    private static async Task<IActionResult> Run(Func<Task<IActionResult>> action)
    {
        try { return await action(); }
        catch (InvalidOperationException ex) { return new BadRequestObjectResult(new { message = ex.Message }); }
    }
}