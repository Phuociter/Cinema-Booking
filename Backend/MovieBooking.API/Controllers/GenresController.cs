using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Services;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/genres")]
public class GenresController : ControllerBase
{
    private readonly IMovieService _movieService;

    public GenresController(IMovieService movieService)
    {
        _movieService = movieService;
    }

    [HttpGet]
    public async Task<IActionResult> GetGenres(
        CancellationToken cancellationToken = default)
    {
        return Ok(await _movieService.GetGenresAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateGenre(
        [FromBody] GenreRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new
            {
                message = "Tên thể loại không được để trống."
            });
        }

        var result = await _movieService.CreateGenreAsync(
            request.Name,
            cancellationToken);

        if (result.Conflict)
        {
            return Conflict(new { message = result.Error });
        }

        if (result.Genre == null)
        {
            return BadRequest(new { message = result.Error });
        }

        return Created("/api/genres", result.Genre);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateGenre(
        Guid id,
        [FromBody] GenreRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new
            {
                message = "Tên thể loại không được để trống."
            });
        }

        var result = await _movieService.UpdateGenreAsync(
            id,
            request.Name,
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound(new { message = result.Error });
        }

        if (result.Conflict)
        {
            return Conflict(new { message = result.Error });
        }

        if (result.Genre == null)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Genre);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteGenre(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _movieService.DeleteGenreAsync(
            id,
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound(new { message = result.Error });
        }

        if (result.Conflict)
        {
            return Conflict(new { message = result.Error });
        }

        return NoContent();
    }
}
