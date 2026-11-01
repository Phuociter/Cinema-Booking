using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Interfaces;

public interface IReportService
{
    Task<ReportServiceResult<RevenueOverviewDto>> GetOverviewAsync(
        DateOnly? from,
        DateOnly? to,
        CancellationToken cancellationToken);

    Task<ReportServiceResult<IReadOnlyList<TopMovieReportDto>>> GetTopMoviesAsync(
        int top,
        DateOnly? from,
        DateOnly? to,
        CancellationToken cancellationToken);
}

public sealed record ReportServiceResult<T>(int StatusCode, T? Data = default, string? Message = null);
