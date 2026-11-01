using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Repositories.Interfaces;

namespace MovieBooking.Data.Repositories;

public sealed class ReportRepository : IReportRepository
{
    private readonly AppDbContext _context;

    public ReportRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<RevenueTotals?> GetRevenueTotalsAsync(
        DateTime start,
        DateTime end,
        CancellationToken cancellationToken)
    {
        var totals = await _context.Bookings
            .AsNoTracking()
            .Where(booking =>
                booking.Status == "success" &&
                booking.CreatedAt >= start &&
                booking.CreatedAt < end)
            .GroupBy(_ => 1)
            .Select(group => new
            {
                Revenue = group.Sum(booking => booking.TotalAmount),
                Orders = group.Count()
            })
            .FirstOrDefaultAsync(cancellationToken);
        return totals is null ? null : new RevenueTotals(totals.Revenue, totals.Orders);
    }

    public Task<int> GetTicketsSoldAsync(DateTime start, DateTime end, CancellationToken cancellationToken)
    {
        return (
            from ticket in _context.Tickets.AsNoTracking()
            join booking in _context.Bookings.AsNoTracking()
                on ticket.BookingId equals booking.Id
            where booking.Status == "success" &&
                  booking.CreatedAt >= start &&
                  booking.CreatedAt < end
            select ticket)
            .CountAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DailyRevenueTotal>> GetDailyRevenueTotalsAsync(
        DateTime start,
        DateTime end,
        CancellationToken cancellationToken)
    {
        var days = await _context.Bookings
            .AsNoTracking()
            .Where(booking =>
                booking.Status == "success" &&
                booking.CreatedAt >= start &&
                booking.CreatedAt < end)
            .GroupBy(booking => booking.CreatedAt.Date)
            .Select(group => new
            {
                Date = group.Key,
                Revenue = group.Sum(booking => booking.TotalAmount),
                Orders = group.Count()
            })
            .OrderBy(day => day.Date)
            .ToListAsync(cancellationToken);
        return days.Select(day => new DailyRevenueTotal(day.Date, day.Revenue, day.Orders)).ToList();
    }

    public async Task<IReadOnlyDictionary<DateTime, int>> GetDailyTicketsSoldAsync(
        DateTime start,
        DateTime end,
        CancellationToken cancellationToken)
    {
        return await (
            from ticket in _context.Tickets.AsNoTracking()
            join booking in _context.Bookings.AsNoTracking()
                on ticket.BookingId equals booking.Id
            where booking.Status == "success" &&
                  booking.CreatedAt >= start &&
                  booking.CreatedAt < end
            group ticket by booking.CreatedAt.Date
            into dayGroup
            select new
            {
                Date = dayGroup.Key,
                TicketsSold = dayGroup.Count()
            })
            .ToDictionaryAsync(day => day.Date, day => day.TicketsSold, cancellationToken);
    }

    public async Task<IReadOnlyList<TopMovieReportData>> GetTopMoviesAsync(
        int top,
        DateTime? start,
        DateTime? end,
        CancellationToken cancellationToken)
    {
        var bookings = _context.Bookings.AsNoTracking()
            .Where(booking => booking.Status == "success");
        if (start.HasValue && end.HasValue)
            bookings = bookings.Where(booking => booking.CreatedAt >= start && booking.CreatedAt < end);

        var movies = await (
            from ticket in _context.Tickets.AsNoTracking()
            join booking in bookings on ticket.BookingId equals booking.Id
            join showtimeSeat in _context.ShowtimeSeats.AsNoTracking()
                on ticket.ShowtimeSeatId equals showtimeSeat.Id
            join showtime in _context.Showtimes.AsNoTracking()
                on showtimeSeat.ShowtimeId equals showtime.Id
            join movie in _context.Movies.AsNoTracking()
                on showtime.MovieId equals movie.Id
            group ticket by new
            {
                MovieId = movie.Id,
                Title = movie.Title,
                PosterUrl = movie.PosterUrl
            }
            into movieGroup
            select new
            {
                movieGroup.Key.MovieId,
                movieGroup.Key.Title,
                movieGroup.Key.PosterUrl,
                TotalTicketsSold = movieGroup.Count(),
                TotalRevenue = movieGroup.Sum(ticket => ticket.Price)
            })
            .OrderByDescending(movie => movie.TotalRevenue)
            .ThenByDescending(movie => movie.TotalTicketsSold)
            .Take(top)
            .ToListAsync(cancellationToken);
        return movies.Select(movie => new TopMovieReportData(
            movie.MovieId,
            movie.Title,
            movie.PosterUrl,
            movie.TotalTicketsSold,
            movie.TotalRevenue)).ToList();
    }
}
