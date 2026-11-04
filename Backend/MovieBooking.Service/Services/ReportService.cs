using MovieBooking.Data.Repositories.Interfaces;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.Service.Services;

public sealed class ReportService : IReportService
{
    private const int Ok = 200;
    private const int BadRequest = 400;

    private readonly IReportRepository _reportRepository;

    public ReportService(IReportRepository reportRepository)
    {
        _reportRepository = reportRepository;
    }

    public async Task<ReportServiceResult<RevenueOverviewDto>> GetOverviewAsync(
        DateOnly? from,
        DateOnly? to,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var toDate = to ?? today;
        var fromDate = from ?? toDate.AddDays(-29);
        var validation = ValidateRange(fromDate, toDate);
        if (validation is not null)
            return new(BadRequest, Message: validation);

        var rangeDays = toDate.DayNumber - fromDate.DayNumber + 1;
        var currentStart = ToUtcStart(fromDate);
        var currentEnd = ToUtcStart(toDate.AddDays(1));
        var previousStart = ToUtcStart(fromDate.AddDays(-rangeDays));

        var currentTotals = await _reportRepository.GetRevenueTotalsAsync(currentStart, currentEnd, cancellationToken);
        var previousTotals = await _reportRepository.GetRevenueTotalsAsync(previousStart, currentStart, cancellationToken);
        var currentTicketsSold = await _reportRepository.GetTicketsSoldAsync(currentStart, currentEnd, cancellationToken);
        var previousTicketsSold = await _reportRepository.GetTicketsSoldAsync(previousStart, currentStart, cancellationToken);
        var dailyRevenue = await _reportRepository.GetDailyRevenueTotalsAsync(currentStart, currentEnd, cancellationToken);
        var dailyTickets = await _reportRepository.GetDailyTicketsSoldAsync(currentStart, currentEnd, cancellationToken);

        var revenue = currentTotals?.Revenue ?? 0m;
        var orders = currentTotals?.Orders ?? 0;
        var previousRevenue = previousTotals?.Revenue ?? 0m;
        var previousOrders = previousTotals?.Orders ?? 0;
        var summary = new RevenueSummaryDto(
            revenue,
            orders,
            currentTicketsSold,
            orders > 0 ? revenue / orders : 0m,
            CalculateGrowth(revenue, previousRevenue),
            CalculateGrowth(orders, previousOrders),
            CalculateGrowth(currentTicketsSold, previousTicketsSold));
        var dailyTotals = dailyRevenue.Select(day => new RevenueDailyDto(
            day.Date,
            day.Revenue,
            day.Orders,
            dailyTickets.GetValueOrDefault(day.Date)));
        var previousPeriod = new RevenuePreviousPeriodDto(
            fromDate.AddDays(-rangeDays),
            fromDate.AddDays(-1),
            previousRevenue,
            previousOrders,
            previousTicketsSold);

        return new(Ok, new RevenueOverviewDto(fromDate, toDate, summary, previousPeriod, dailyTotals.ToList()));
    }

    public async Task<ReportServiceResult<IReadOnlyList<TopMovieReportDto>>> GetTopMoviesAsync(
        int top,
        DateOnly? from,
        DateOnly? to,
        CancellationToken cancellationToken)
    {
        if (top != 5 && top != 10)
            return new(BadRequest, Message: "Tham số top chỉ nhận giá trị 5 hoặc 10.");

        if (from.HasValue != to.HasValue)
            return new(BadRequest, Message: "Cần cung cấp cả ngày bắt đầu và ngày kết thúc.");

        DateTime? start = null;
        DateTime? end = null;
        if (from.HasValue && to.HasValue)
        {
            var validation = ValidateRange(from.Value, to.Value);
            if (validation is not null)
                return new(BadRequest, Message: validation);
            start = ToUtcStart(from.Value);
            end = ToUtcStart(to.Value.AddDays(1));
        }

        var movies = await _reportRepository.GetTopMoviesAsync(top, start, end, cancellationToken);
        return new(Ok, movies.Select(movie => new TopMovieReportDto(
            movie.MovieId,
            movie.Title,
            movie.PosterUrl,
            movie.TotalTicketsSold,
            movie.TotalRevenue)).ToList());
    }

    private static string? ValidateRange(DateOnly from, DateOnly to)
    {
        if (from > to)
            return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
        if (to.DayNumber - from.DayNumber + 1 > 366)
            return "Khoảng thời gian báo cáo không được vượt quá 366 ngày.";
        return null;
    }

    private static DateTime ToUtcStart(DateOnly date) =>
        date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

    private static decimal? CalculateGrowth(decimal current, decimal previous) =>
        previous == 0 ? null : (current - previous) / previous * 100m;
}
