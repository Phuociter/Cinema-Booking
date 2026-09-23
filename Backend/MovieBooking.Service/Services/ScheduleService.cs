using AutoMapper;
using MovieBooking.Data.Repositories.Interfaces;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.Service.Services;

public class ScheduleService : IScheduleService
{
    private readonly IShowtimeRepository _showtimeRepository;
    private readonly IShowtimeSeatRepository _showtimeSeatRepository;
    private readonly IRedisService _redisService;
    private readonly IMapper _mapper;

    public ScheduleService(
        IShowtimeRepository showtimeRepository,
        IShowtimeSeatRepository showtimeSeatRepository,
        IRedisService redisService,
        IMapper mapper)
    {
        _showtimeRepository = showtimeRepository;
        _showtimeSeatRepository = showtimeSeatRepository;
        _redisService = redisService;
        _mapper = mapper;
    }

    public async Task<PagedResult<ShowtimeDto>> GetShowtimesAsync(
        Guid? movieId, Guid? cinemaId, DateOnly? date, DateOnly? dateFrom = null, DateOnly? dateTo = null,
        int page = 1, int pageSize = 20)
    {
        (page, pageSize) = NormalizePaging(page, pageSize);
        var cacheKey = BuildShowtimesCacheKey(movieId, cinemaId, date, dateFrom, dateTo, page, pageSize);

        var cached = await _redisService.GetObjectAsync<PagedResult<ShowtimeDto>>(cacheKey);
        if (cached != null)
        {
            return cached;
        }

        var (items, totalCount) = await _showtimeRepository.GetShowtimesWithDetailsAsync(
            movieId, cinemaId, date, dateFrom, dateTo, page, pageSize);

        var result = new PagedResult<ShowtimeDto>
        {
            
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            Items = _mapper.Map<IEnumerable<ShowtimeDto>>(items)
        };

        await _redisService.SetObjectAsync(cacheKey, result, TimeSpan.FromMinutes(5));
        return result;
    }

    private static (int Page, int PageSize) NormalizePaging(int page, int pageSize)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;
        return (page, pageSize);
    }

    private static string BuildShowtimesCacheKey(
        Guid? movieId, Guid? cinemaId, DateOnly? date, DateOnly? dateFrom, DateOnly? dateTo, int page, int pageSize)
    {
        var dateKey = date?.ToString("yyyy-MM-dd")
            ?? (dateFrom.HasValue || dateTo.HasValue ? $"{dateFrom:yyyy-MM-dd}_{dateTo:yyyy-MM-dd}" : "all");
        return $"showtimes:query:{dateKey}:{movieId?.ToString() ?? "all"}:{cinemaId?.ToString() ?? "all"}:p{page}:s{pageSize}";
    }

    public async Task<ShowtimeDto?> GetShowtimeByIdAsync(Guid id)
    {
        var showtime = await _showtimeRepository.GetShowtimeByIdWithDetailsAsync(id);
        return showtime == null ? null : _mapper.Map<ShowtimeDto>(showtime);
    }

    public async Task<IEnumerable<ShowtimeSeatDto>> GetSeatsForShowtimeAsync(Guid showtimeId)
    {
        var seats = await _showtimeSeatRepository.GetSeatsByShowtimeIdAsync(showtimeId);
        return _mapper.Map<IEnumerable<ShowtimeSeatDto>>(seats);
    }

    public async Task<bool> ShowtimeExistsAsync(Guid id)
    {
        return await _showtimeRepository.ExistsAsync(id, scheduledOnly: true);
    }
}
