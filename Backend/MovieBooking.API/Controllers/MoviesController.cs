using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.API.Hubs;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Services;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/movies")]
public class MoviesController : ControllerBase
{
    private static readonly string[] SupportedStatuses =
        ["now_showing", "coming_soon"];

    private readonly IMovieService _movieService;
    private readonly IHubContext<MovieHub> _movieHub;
    private readonly ILogger<MoviesController> _logger;

    public MoviesController(
        IMovieService movieService,
        IHubContext<MovieHub> movieHub,
        ILogger<MoviesController> logger)
    {
        _movieService = movieService;
        _movieHub = movieHub;
        _logger = logger;
    }

    // GET: api/movies
    [HttpGet]
    public async Task<IActionResult> GetMovies(
    [FromQuery] string? status,
    [FromQuery] string? search,
    [FromQuery] string? genre,
    [FromQuery] string sortBy = "latest",
    [FromQuery] string? city = null,
    [FromQuery] Guid? cinemaId = null,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 12,
    CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(status) &&
            !SupportedStatuses.Contains(
                status, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                message = "status chỉ nhận now_showing hoặc coming_soon"
            });
        }

        if (page < 1)
        {
            return BadRequest(new
            {
                message = "page phải lớn hơn hoặc bằng 1"
            });
        }

        if (pageSize is < 1 or > 100)
        {
            return BadRequest(new
            {
                message = "pageSize phải nằm trong khoảng từ 1 đến 100"
            });
        }

        var normalizedSortBy = sortBy.Trim().ToLowerInvariant();

        if (!new[] { "latest", "title", "rating" }.Contains(normalizedSortBy))
        {
            return BadRequest(new
            {
                message = "sortBy chỉ nhận latest, title hoặc rating"
            });
        }

        var result = await _movieService.GetMoviesAsync(
    status?.ToLowerInvariant(),
    search,
    genre,
    normalizedSortBy,
    string.IsNullOrWhiteSpace(city) ? null : city.Trim(),
    cinemaId,
    page,
    pageSize,
    cancellationToken);

        return Ok(result);
    }

    // GET: api/movies/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetMovie(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var movie = await _movieService.GetMovieByIdAsync(
            id, cancellationToken);

        return movie is null
            ? NotFound(new { message = "Không tìm thấy phim" })
            : Ok(movie);
    }

    // POST: api/movies
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateMovie(
        [FromBody] CreateMovieRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsValidStatus(request.Status))
        {
            return BadRequest(new
            {
                message = "status chỉ nhận now_showing hoặc coming_soon"
            });
        }

        try
        {
            var movie = await _movieService.CreateMovieAsync(
                request, cancellationToken);

            await NotifyMovieChangedAsync(
                "MovieCreated", movie.Id, movie.Status);

            return CreatedAtAction(
                nameof(GetMovie),
                new { id = movie.Id },
                movie);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT: api/movies/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateMovie(
        Guid id,
        [FromBody] UpdateMovieRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsValidStatus(request.Status))
        {
            return BadRequest(new
            {
                message = "status chỉ nhận now_showing hoặc coming_soon"
            });
        }

        try
        {
            var movie = await _movieService.UpdateMovieAsync(
                id, request, cancellationToken);

            if (movie is null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy phim"
                });
            }

            await NotifyMovieChangedAsync(
                "MovieUpdated", movie.Id, movie.Status);

            return Ok(movie);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // DELETE: api/movies/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteMovie(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var deleted = await _movieService.SoftDeleteMovieAsync(
            id, cancellationToken);

        if (!deleted)
        {
            return NotFound(new
            {
                message = "Không tìm thấy phim"
            });
        }

        await NotifyMovieChangedAsync("MovieDeleted", id, null);

        return Ok(new
        {
            message = "Đã xóa mềm phim thành công"
        });
    }

    private async Task NotifyMovieChangedAsync(
        string eventName,
        Guid movieId,
        string? status)
    {
        try
        {
            await _movieHub.Clients.All.SendAsync(
                eventName,
                new
                {
                    id = movieId,
                    status
                });
        }
        catch (Exception ex)
        {
            // Phim đã được lưu; lỗi SignalR không làm API báo thất bại.
            _logger.LogError(
                ex,
                "Không thể gửi sự kiện {EventName} cho phim {MovieId}",
                eventName,
                movieId);
        }
    }

    private static bool IsValidStatus(string? status) =>
        !string.IsNullOrWhiteSpace(status) &&
        SupportedStatuses.Contains(
            status, StringComparer.OrdinalIgnoreCase);
}