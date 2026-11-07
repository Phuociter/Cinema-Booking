using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Admin")]
public sealed class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetOverviewAsync(from, to, cancellationToken);
        return result.StatusCode == StatusCodes.Status200OK
            ? Ok(result.Data)
            : BadRequest(new { message = result.Message });
    }

    [HttpGet("top-movies")]
    public async Task<IActionResult> GetTopMovies(
        [FromQuery] int top = 5,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetTopMoviesAsync(top, from, to, cancellationToken);
        return result.StatusCode == StatusCodes.Status200OK
            ? Ok(result.Data)
            : BadRequest(new { message = result.Message });
    }
}
