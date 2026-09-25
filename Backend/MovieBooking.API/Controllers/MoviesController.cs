using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.Services;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/movies")]
public class MoviesController : ControllerBase
{
    private static readonly string[] SupportedStatuses = ["now_showing", "coming_soon"];
    private readonly IMovieService _movieService;

    public MoviesController(IMovieService movieService)
    {
        _movieService = movieService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMovies(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(status) && !SupportedStatuses.Contains(status, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { message = "status chỉ nhận now_showing hoặc coming_soon" });

        if (page < 1)
            return BadRequest(new { message = "page phải lớn hơn hoặc bằng 1" });

        if (pageSize is < 1 or > 100)
            return BadRequest(new { message = "pageSize phải nằm trong khoảng từ 1 đến 100" });

        var result = await _movieService.GetMoviesAsync(
            status?.ToLowerInvariant(),
            search,
            page,
            pageSize,
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetMovie(Guid id, CancellationToken cancellationToken = default)
    {
        var movie = await _movieService.GetMovieByIdAsync(id, cancellationToken);
        return movie is null ? NotFound(new { message = "Không tìm thấy phim" }) : Ok(movie);
    }
}