namespace MovieBooking.Data.Repositories.Interfaces;

public sealed record RevenueTotals(decimal Revenue, int Orders);

public sealed record DailyRevenueTotal(DateTime Date, decimal Revenue, int Orders);

public sealed record TopMovieReportData(
    Guid MovieId,
    string Title,
    string? PosterUrl,
    int TotalTicketsSold,
    decimal TotalRevenue);

public interface IReportRepository
{
    Task<RevenueTotals?> GetRevenueTotalsAsync(DateTime start, DateTime end, CancellationToken cancellationToken);
    Task<int> GetTicketsSoldAsync(DateTime start, DateTime end, CancellationToken cancellationToken);
    Task<IReadOnlyList<DailyRevenueTotal>> GetDailyRevenueTotalsAsync(
        DateTime start,
        DateTime end,
        CancellationToken cancellationToken);
    Task<IReadOnlyDictionary<DateTime, int>> GetDailyTicketsSoldAsync(
        DateTime start,
        DateTime end,
        CancellationToken cancellationToken);
    Task<IReadOnlyList<TopMovieReportData>> GetTopMoviesAsync(
        int top,
        DateTime? start,
        DateTime? end,
        CancellationToken cancellationToken);
}
