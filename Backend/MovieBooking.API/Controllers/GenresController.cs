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

    // GET: api/genres
    [HttpGet]
    public async Task<IActionResult> GetGenres(
        CancellationToken cancellationToken = default)
    {
        return Ok(await _movieService.GetGenresAsync(cancellationToken));
    }

    // POST: api/genres
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateGenre(
        [FromBody] GenreRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var genre = await _movieService.CreateGenreAsync(
                request, cancellationToken);

            return Created("api/genres", genre);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT: api/genres/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateGenre(
        Guid id,
        [FromBody] GenreRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var genre = await _movieService.UpdateGenreAsync(
                id, request, cancellationToken);

            return genre == null
                ? NotFound(new { message = "Không tìm thấy thể loại" })
                : Ok(genre);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // DELETE: api/genres/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteGenre(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var deleted = await _movieService.DeleteGenreAsync(
                id, cancellationToken);

            return deleted
                ? Ok(new { message = "Đã xóa thể loại thành công" })
                : NotFound(new { message = "Không tìm thấy thể loại" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
