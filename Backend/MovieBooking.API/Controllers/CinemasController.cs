using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.DTOs;
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

    // ============================================================
    // PUBLIC
    // ============================================================

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

    // ============================================================
    // ADMIN: PHÒNG CHIẾU
    // ============================================================

    // POST /api/auditoriums
    [HttpPost("auditoriums")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateAuditorium([FromBody] CreateAuditoriumRequest request)
    {
        var result = await _cinemaService.CreateAuditoriumAsync(request);

        if (!result.Success)
            return StatusCode(result.StatusCode, new { message = result.Error });

        return CreatedAtAction(nameof(GetSeats), new { id = result.Data!.Id }, result.Data);
    }

    // PUT /api/auditoriums/{id}/seats/layout
    [HttpPut("auditoriums/{id:guid}/seats/layout")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateSeatLayout(Guid id, [FromBody] UpdateSeatLayoutRequest request)
    {
        var result = await _cinemaService.UpdateSeatLayoutAsync(id, request);

        if (!result.Success)
            return StatusCode(result.StatusCode, new { message = result.Error });

        return Ok(new { message = "Cập nhật loại ghế thành công", updated = result.Data });
    }

    // PUT /api/auditoriums/{id}
    [HttpPut("auditoriums/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateAuditorium(Guid id, [FromBody] UpdateAuditoriumRequest request)
    {
        var result = await _cinemaService.UpdateAuditoriumAsync(id, request);

        if (!result.Success)
            return StatusCode(result.StatusCode, new { message = result.Error });

        return Ok(result.Data);
    }

    // DELETE /api/auditoriums/{id}
    [HttpDelete("auditoriums/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteAuditorium(Guid id)
    {
        var result = await _cinemaService.DeleteAuditoriumAsync(id);

        if (!result.Success)
            return StatusCode(result.StatusCode, new { message = result.Error });

        return NoContent();
    }

    // ============================================================
    // ADMIN: CỤM RẠP & BÁO CÁO
    // ============================================================

    // POST /api/cinemas
    [HttpPost("cinemas")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateCinema([FromBody] CreateCinemaRequest request)
    {
        var result = await _cinemaService.CreateCinemaAsync(request);

        if (!result.Success)
            return StatusCode(result.StatusCode, new { message = result.Error });

        return CreatedAtAction(nameof(GetCinemaById), new { id = result.Data!.Id }, result.Data);
    }

    // PUT /api/cinemas/{id}
    [HttpPut("cinemas/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateCinema(Guid id, [FromBody] UpdateCinemaRequest request)
    {
        var result = await _cinemaService.UpdateCinemaAsync(id, request);

        if (!result.Success)
            return StatusCode(result.StatusCode, new { message = result.Error });

        return Ok(result.Data);
    }

    // DELETE /api/cinemas/{id}
    [HttpDelete("cinemas/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteCinema(Guid id)
    {
        var result = await _cinemaService.DeleteCinemaAsync(id);

        if (!result.Success)
            return StatusCode(result.StatusCode, new { message = result.Error });

        return NoContent();
    }

    // GET /api/reports/occupancy-rates?from=2026-10-01&to=2026-11-01
    [HttpGet("reports/occupancy-rates")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetOccupancyRates(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var data = await _cinemaService.GetOccupancyRatesAsync(from, to);

        return Ok(data);
    }
}