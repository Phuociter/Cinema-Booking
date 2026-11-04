namespace MovieBooking.Service.DTOs;

public sealed record RevenueDailyDto(DateTime Date, decimal Revenue, int Orders, int TicketsSold);

public sealed record RevenuePreviousPeriodDto(
    DateOnly From,
    DateOnly To,
    decimal Revenue,
    int Orders,
    int TicketsSold);

public sealed record RevenueSummaryDto(
    decimal Revenue,
    int Orders,
    int TicketsSold,
    decimal AverageOrderValue,
    decimal? RevenueGrowthPercent,
    decimal? OrdersGrowthPercent,
    decimal? TicketsGrowthPercent);

public sealed record RevenueOverviewDto(
    DateOnly From,
    DateOnly To,
    RevenueSummaryDto Summary,
    RevenuePreviousPeriodDto PreviousPeriod,
    IReadOnlyList<RevenueDailyDto> DailyTotals);

public sealed record TopMovieReportDto(
    Guid MovieId,
    string Title,
    string? PosterUrl,
    int TotalTicketsSold,
    decimal TotalRevenue);
