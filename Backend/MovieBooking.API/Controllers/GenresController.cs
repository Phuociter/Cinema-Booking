using Microsoft.AspNetCore.Mvc;
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
    public async Task<IActionResult> GetGenres(CancellationToken cancellationToken = default)
    {
        return Ok(await _movieService.GetGenresAsync(cancellationToken));
    }
}