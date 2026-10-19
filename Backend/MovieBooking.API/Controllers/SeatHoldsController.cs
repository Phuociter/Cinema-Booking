
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using StackExchange.Redis;

namespace MovieBooking.API.Controllers;

[ApiController]
[Authorize]
[Route("api/showtimes/{showtimeId:guid}/seat-holds")]
public class SeatHoldsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<SeatHoldsController> _logger;

    private static readonly TimeSpan HoldDuration = TimeSpan.FromMinutes(5);

    public SeatHoldsController(
        AppDbContext dbContext,
        IConnectionMultiplexer redis,
        ILogger<SeatHoldsController> logger)
    {
        _dbContext = dbContext;
        _redis = redis;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> HoldSeats(
        Guid showtimeId,
        [FromBody] HoldSeatsRequest request)
    {
        var userIdText =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(userIdText, out var userId))
        {
            return Unauthorized(new
            {
                message = "Không xác định được người dùng đăng nhập."
            });
        }

        if (request.ShowtimeSeatIds == null ||
            request.ShowtimeSeatIds.Count == 0)
        {
            return BadRequest(new
            {
                message = "Vui lòng chọn ít nhất một ghế."
            });
        }

        var seatIds = request.ShowtimeSeatIds.Distinct().ToList();

        if (seatIds.Count != request.ShowtimeSeatIds.Count)
        {
            return BadRequest(new
            {
                message = "Danh sách ghế có ID bị trùng."
            });
        }

        var showtimeExists = await _dbContext.Showtimes
            .AnyAsync(s => s.Id == showtimeId);

        if (!showtimeExists)
        {
            return NotFound(new { message = "Không tìm thấy suất chiếu." });
        }

        var seats = await _dbContext.ShowtimeSeats
            .AsNoTracking()
            .Where(s =>
                s.ShowtimeId == showtimeId &&
                seatIds.Contains(s.Id) &&
                s.Status == "available")
            .Select(s => s.Id)
            .ToListAsync();

        if (seats.Count != seatIds.Count)
        {
            return Conflict(new
            {
                message = "Có ghế không thuộc suất chiếu hoặc không còn khả dụng."
            });
        }

        var holdToken = Guid.NewGuid().ToString("N");

        // Tất cả ghế cùng suất chiếu dùng chung hash slot Redis.
        var keys = seatIds
            .Select(id => (RedisKey)$"seat-hold:{{{showtimeId}}}:{id}")
            .ToArray();

        // Gắn token với người dùng để bước tạo booking xác minh lại.
        var holdValue = $"{userId}|{holdToken}";
        var expiryMilliseconds = (long)HoldDuration.TotalMilliseconds;

        const string script = """
            for i = 1, #KEYS do
                if redis.call('EXISTS', KEYS[i]) == 1 then
                    return 0
                end
            end

            for i = 1, #KEYS do
                redis.call('SET', KEYS[i], ARGV[1], 'PX', ARGV[2])
            end

            return 1
            """;

        try
        {
            var database = _redis.GetDatabase();

            var result = (int)await database.ScriptEvaluateAsync(
                script,
                keys,
                new RedisValue[]
                {
                    holdValue,
                    expiryMilliseconds
                });

            if (result != 1)
            {
                return Conflict(new
                {
                    message = "Có ghế đang được người khác giữ. Vui lòng chọn lại."
                });
            }

            return Ok(new
            {
                showtimeId,
                showtimeSeatIds = seatIds,
                holdToken,
                expiresInSeconds = (int)HoldDuration.TotalSeconds
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Không thể giữ ghế cho suất chiếu {ShowtimeId}",
                showtimeId);

            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Dịch vụ giữ ghế tạm thời không khả dụng. Vui lòng thử lại."
            });
        }
    }
}

public class HoldSeatsRequest
{
    public List<Guid> ShowtimeSeatIds { get; set; } = new();
}
