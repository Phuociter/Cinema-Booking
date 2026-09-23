using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/movies")]
public class MoviesController : ControllerBase
{
    private readonly IMovieService _movieService;

    public MoviesController(IMovieService movieService)
    {
        _movieService = movieService;
    }

    // GET: /api/movies
    // GET: /api/movies?status=now_showing&search=Avengers&page=1&pageSize=10
    [HttpGet]
    public async Task<IActionResult> GetAllMovies(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var (items, totalItems) = await _movieService.GetAllMoviesAsync(
            status,
            search,
            page,
            pageSize);

        return Ok(new
        {
            items,
            page = page < 1 ? 1 : page,
            pageSize = pageSize < 1 ? 10 : Math.Min(pageSize, 100),
            totalItems,
            totalPages = (int)Math.Ceiling(
                totalItems / (double)(pageSize < 1 ? 10 : Math.Min(pageSize, 100)))
        });
    }

    // GET: /api/movies/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetMovieById(Guid id)
    {
        var movie = await _movieService.GetMovieByIdAsync(id);

        if (movie == null)
        {
            return NotFound(new
            {
                message = "Movie not found"
            });
        }

        return Ok(movie);
    }

    // GET: /api/genres
    [HttpGet("/api/genres")]
    public async Task<IActionResult> GetGenres()
    {
        var genres = await _movieService.GetGenresAsync();

        return Ok(genres);
    }
}