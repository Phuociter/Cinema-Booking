using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.Services;

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
}