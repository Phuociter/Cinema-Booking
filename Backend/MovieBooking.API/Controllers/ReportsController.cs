using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Admin")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public ReportsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("top-movies")]
    public async Task<IActionResult> GetTopMovies(
        [FromQuery] int top = 5,
        CancellationToken cancellationToken = default)
    {
        if (top != 5 && top != 10)
        {
            return BadRequest(new
            {
                message = "Tham số top chỉ nhận giá trị 5 hoặc 10."
            });
        }

        var report = await (
            from ticket in _dbContext.Tickets.AsNoTracking()
            join booking in _dbContext.Bookings.AsNoTracking()
                on ticket.BookingId equals booking.Id
            join showtimeSeat in _dbContext.ShowtimeSeats.AsNoTracking()
                on ticket.ShowtimeSeatId equals showtimeSeat.Id
            join showtime in _dbContext.Showtimes.AsNoTracking()
                on showtimeSeat.ShowtimeId equals showtime.Id
            join movie in _dbContext.Movies.AsNoTracking()
                on showtime.MovieId equals movie.Id
            where booking.Status == "success"
            group ticket by new
            {
                MovieId = movie.Id,
                Title = movie.Title,
                PosterUrl = movie.PosterUrl
            }
            into movieGroup
            select new
            {
                movieId = movieGroup.Key.MovieId,
                title = movieGroup.Key.Title,
                posterUrl = movieGroup.Key.PosterUrl,
                totalTicketsSold = movieGroup.Count(),
                totalRevenue = movieGroup.Sum(ticket => ticket.Price)
            })
            .OrderByDescending(movie => movie.totalRevenue)
            .ThenByDescending(movie => movie.totalTicketsSold)
            .Take(top)
            .ToListAsync(cancellationToken);

        return Ok(report);
    }
}
