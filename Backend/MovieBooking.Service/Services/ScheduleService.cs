using AutoMapper;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Constants;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories;
using MovieBooking.Data.Repositories.Interfaces;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.Service.Services;

public class ScheduleService : IScheduleService
{
    private readonly IShowtimeRepository _showtimeRepository;
    private readonly IShowtimeSeatRepository _showtimeSeatRepository;
    private readonly IBookingRepository _bookingRepository;
    private readonly IRedisService _redisService;
    private readonly IMapper _mapper;

    public ScheduleService(
        IShowtimeRepository showtimeRepository,
        IShowtimeSeatRepository showtimeSeatRepository,
        IBookingRepository bookingRepository,
        IRedisService redisService,
        IMapper mapper)
    {
        _showtimeRepository = showtimeRepository;
        _showtimeSeatRepository = showtimeSeatRepository;
        _bookingRepository = bookingRepository;
        _redisService = redisService;
        _mapper = mapper;
    }

    public async Task<PagedResult<ShowtimeDto>> GetShowtimesAsync(
        Guid? movieId, Guid? cinemaId, DateOnly? date, DateOnly? dateFrom = null, DateOnly? dateTo = null,
        string? status = null, int page = 1, int pageSize = 20)
    {
        (page, pageSize) = NormalizePaging(page, pageSize);
        var cacheKey = BuildShowtimesCacheKey(movieId, cinemaId, date, dateFrom, dateTo, status, page, pageSize);

        var cached = await _redisService.GetObjectAsync<PagedResult<ShowtimeDto>>(cacheKey);
        if (cached != null)
        {
            return cached;
        }

        var (items, totalCount) = await _showtimeRepository.GetShowtimesWithDetailsAsync(
            movieId, cinemaId, date, dateFrom, dateTo, status, page, pageSize);

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

    public async Task InvalidateShowtimesCacheAsync()
    {
        await _redisService.RemoveByPrefixAsync("showtimes:query:");
    }

    private static (int Page, int PageSize) NormalizePaging(int page, int pageSize)
    {
        if (page <= 0) page = 1;
        pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 200);
        return (page, pageSize);
    }

    private static string BuildShowtimesCacheKey(
        Guid? movieId, Guid? cinemaId, DateOnly? date, DateOnly? dateFrom, DateOnly? dateTo, string? status, int page, int pageSize)
    {
        var dateKey = date?.ToString("yyyy-MM-dd")
            ?? (dateFrom.HasValue || dateTo.HasValue ? $"{dateFrom:yyyy-MM-dd}_{dateTo:yyyy-MM-dd}" : "all");
        var statusKey = string.IsNullOrWhiteSpace(status) ? "default" : status.ToLower();
        return $"showtimes:query:{statusKey}:{dateKey}:{movieId?.ToString() ?? "all"}:{cinemaId?.ToString() ?? "all"}:p{page}:s{pageSize}";
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

    public async Task<CancelShowtimeResult> CancelShowtimeAsync(Guid id)
    {
        var showtime = await _showtimeRepository.GetByIdAsync(id);
        if (showtime == null)
        {
            return new CancelShowtimeResult
            {
                Outcome = CancelShowtimeOutcome.NotFound,
                ErrorMessage = $"Không tìm thấy suất chiếu với ID: {id}",
                ShowtimeId = id
            };
        }

        if (showtime.Status == ShowtimeStatus.Cancelled)
        {
            return new CancelShowtimeResult
            {
                Outcome = CancelShowtimeOutcome.AlreadyCancelled,
                ErrorMessage = "Suất chiếu này đã bị hủy trước đó.",
                ShowtimeId = id
            };
        }

        var relatedBookings = await _bookingRepository.GetByShowtimeWithTicketsAsync(id);

        var hasSuccessBooking = relatedBookings.Any(b => b.Status == "success");
        if (hasSuccessBooking)
        {
            return new CancelShowtimeResult
            {
                Outcome = CancelShowtimeOutcome.HasPaidBookings,
                ErrorMessage = "Không thể hủy suất chiếu đã có vé được thanh toán thành công.",
                ShowtimeId = id
            };
        }

        var pendingBookings = relatedBookings.Where(b => b.Status == "pending").ToList();
        var keysToRemove = new List<string>();

        using var transaction = await _showtimeRepository.BeginTransactionAsync();
        try
        {
            foreach (var b in pendingBookings)
            {
                b.Status = "cancelled";
                b.UpdatedAt = DateTime.UtcNow;

                foreach (var ticket in b.Tickets)
                {
                    if (ticket.ShowtimeSeat != null && ticket.ShowtimeSeat.ShowtimeId == id)
                    {
                        ticket.ShowtimeSeat.Status = "available";

                        keysToRemove.Add($"hold:{id}:{ticket.ShowtimeSeat.SeatId}");
                        if (ticket.ShowtimeSeat.Id != ticket.ShowtimeSeat.SeatId)
                        {
                            keysToRemove.Add($"hold:{id}:{ticket.ShowtimeSeat.Id}");
                        }
                    }
                }
                _bookingRepository.RemoveTickets(b.Tickets);
            }

            var showtimeSeats = await _showtimeSeatRepository.GetAllByShowtimeAsync(id);
            foreach (var ss in showtimeSeats)
            {
                keysToRemove.Add($"hold:{id}:{ss.SeatId}");
                if (ss.Id != ss.SeatId)
                {
                    keysToRemove.Add($"hold:{id}:{ss.Id}");
                }
            }

            showtime.Status = ShowtimeStatus.Cancelled;
            await _showtimeRepository.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        foreach (var key in keysToRemove.Distinct())
        {
            await _redisService.RemoveAsync(key);
        }

        await InvalidateShowtimesCacheAsync();

        return new CancelShowtimeResult
        {
            Outcome = CancelShowtimeOutcome.Success,
            ShowtimeId = id,
            Status = showtime.Status,
            CancelledPendingBookingsCount = pendingBookings.Count
        };
    }

    public async Task<RestoreShowtimeResult> RestoreShowtimeAsync(Guid id)
    {
        var showtime = await _showtimeRepository.GetByIdAsync(id);
        if (showtime == null)
        {
            return new RestoreShowtimeResult
            {
                Outcome = RestoreShowtimeOutcome.NotFound,
                ErrorMessage = $"Không tìm thấy suất chiếu với ID: {id}",
                ShowtimeId = id
            };
        }

        if (showtime.Status != ShowtimeStatus.Cancelled)
        {
            return new RestoreShowtimeResult
            {
                Outcome = RestoreShowtimeOutcome.NotCancelled,
                ErrorMessage = "Chỉ có thể mở lại suất chiếu đã bị hủy.",
                ShowtimeId = id
            };
        }

        if (showtime.StartTime <= DateTime.UtcNow)
        {
            return new RestoreShowtimeResult
            {
                Outcome = RestoreShowtimeOutcome.PastStartTime,
                ErrorMessage = "Không thể mở lại suất chiếu đã qua thời gian bắt đầu.",
                ShowtimeId = id
            };
        }

        var hasOverlap = await _showtimeRepository.HasActiveOverlapAsync(id, showtime.AuditoriumId, showtime.StartTime, showtime.EndTime);
        if (hasOverlap)
        {
            return new RestoreShowtimeResult
            {
                Outcome = RestoreShowtimeOutcome.ConflictOverlap,
                ErrorMessage = "Không thể mở lại vì phòng chiếu đã có một suất chiếu khác hoạt động trong khung giờ này.",
                ShowtimeId = id
            };
        }

        showtime.Status = ShowtimeStatus.Scheduled;
        await _showtimeRepository.SaveChangesAsync();

        await InvalidateShowtimesCacheAsync();

        return new RestoreShowtimeResult
        {
            Outcome = RestoreShowtimeOutcome.Success,
            ShowtimeId = id,
            Status = showtime.Status
        };
    }

    public async Task<CreateShowtimeResult> CreateShowtimeAsync(CreateShowtimeRequest request)
    {
        if (request == null)
        {
            return new CreateShowtimeResult
            {
                Outcome = CreateShowtimeOutcome.InvalidRequest,
                ErrorMessage = "Dữ liệu yêu cầu không hợp lệ."
            };
        }

        if (request.BasePrice < 0)
        {
            return new CreateShowtimeResult
            {
                Outcome = CreateShowtimeOutcome.InvalidRequest,
                ErrorMessage = "Giá vé cơ bản phải lớn hơn hoặc bằng 0."
            };
        }

        if (request.StartTime <= DateTime.UtcNow)
        {
            return new CreateShowtimeResult
            {
                Outcome = CreateShowtimeOutcome.InvalidRequest,
                ErrorMessage = "Thời gian bắt đầu suất chiếu phải ở tương lai."
            };
        }

        var movie = await _showtimeRepository.GetActiveMovieAsync(request.MovieId);
        if (movie == null)
        {
            return new CreateShowtimeResult
            {
                Outcome = CreateShowtimeOutcome.MovieNotFound,
                ErrorMessage = "Phim không tồn tại hoặc đã bị xóa."
            };
        }

        var auditorium = await _showtimeRepository.GetActiveAuditoriumWithCinemaAsync(request.AuditoriumId);
        if (auditorium == null)
        {
            return new CreateShowtimeResult
            {
                Outcome = CreateShowtimeOutcome.AuditoriumNotFound,
                ErrorMessage = "Phòng chiếu không tồn tại hoặc đã bị xóa."
            };
        }

        var endTime = request.StartTime.AddMinutes(movie.DurationMin);

        var showtime = new Showtime
        {
            Id = Guid.NewGuid(),
            MovieId = movie.Id,
            AuditoriumId = auditorium.Id,
            StartTime = request.StartTime,
            EndTime = endTime,
            BasePrice = request.BasePrice,
            Status = ShowtimeStatus.Scheduled,
            CreatedAt = DateTime.UtcNow
        };

        var seats = await _showtimeRepository.GetSeatsByAuditoriumAsync(request.AuditoriumId);
        if (!seats.Any())
        {
            return new CreateShowtimeResult
            {
                Outcome = CreateShowtimeOutcome.NoPhysicalSeats,
                ErrorMessage = "Phòng chiếu chưa có cấu hình ghế vật lý."
            };
        }

        var showtimeSeats = seats.Select(s => new ShowtimeSeat
        {
            Id = Guid.NewGuid(),
            ShowtimeId = showtime.Id,
            SeatId = s.Id,
            Status = "available"
        }).ToList();

        using var transaction = await _showtimeRepository.BeginTransactionAsync();
        try
        {
            await _showtimeRepository.AddWithSeatsAsync(showtime, showtimeSeats);
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            await transaction.RollbackAsync();

            if (DbErrors.IsOverlapViolation(ex))
            {
                return new CreateShowtimeResult
                {
                    Outcome = CreateShowtimeOutcome.ConflictOverlap,
                    ErrorMessage = "Phòng chiếu đã có suất chiếu khác trong khung giờ này (trùng lịch chiếu).",
                    AuditoriumId = auditorium.Id,
                    AuditoriumName = auditorium.Name,
                    StartTime = request.StartTime,
                    EndTime = endTime
                };
            }

            throw;
        }

        var responseDto = new ShowtimeDto
        {
            Id = showtime.Id,
            MovieId = movie.Id,
            MovieTitle = movie.Title,
            PosterUrl = movie.PosterUrl,
            AuditoriumId = auditorium.Id,
            AuditoriumName = auditorium.Name,
            CinemaId = auditorium.CinemaId,
            CinemaName = auditorium.Cinema?.Name ?? string.Empty,
            City = auditorium.Cinema?.City,
            Address = auditorium.Cinema?.Address,
            HallType = auditorium.HallType,
            StartTime = showtime.StartTime,
            EndTime = showtime.EndTime,
            BasePrice = showtime.BasePrice,
            Status = showtime.Status
        };

        await InvalidateShowtimesCacheAsync();

        return new CreateShowtimeResult
        {
            Outcome = CreateShowtimeOutcome.Success,
            Data = responseDto
        };
    }
}
