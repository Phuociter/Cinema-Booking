using MovieBooking.Data.Constants;
using MovieBooking.Data.Repositories.Interfaces;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.Service.Services;

public class ShowtimeSeatService : IShowtimeSeatService
{
    private readonly IShowtimeRepository _showtimeRepository;
    private readonly IShowtimeSeatRepository _showtimeSeatRepository;
    private readonly IRedisService _redisService;

    public ShowtimeSeatService(
        IShowtimeRepository showtimeRepository,
        IShowtimeSeatRepository showtimeSeatRepository,
        IRedisService redisService)
    {
        _showtimeRepository = showtimeRepository;
        _showtimeSeatRepository = showtimeSeatRepository;
        _redisService = redisService;
    }

    public async Task<AdminShowtimeSeatsResult> GetAdminSeatsAsync(Guid showtimeId)
    {
        var showtime = await _showtimeRepository.GetByIdNoTrackingAsync(showtimeId);
        if (showtime == null)
        {
            return new AdminShowtimeSeatsResult
            {
                Outcome = AdminShowtimeSeatsOutcome.NotFound,
                ErrorMessage = $"Không tìm thấy suất chiếu với ID: {showtimeId}"
            };
        }

        var showtimeSeats = await _showtimeSeatRepository.GetAdminSeatsAsync(showtimeId);
        var showtimeSeatIds = showtimeSeats.Select(ss => ss.Id).ToList();

        // Lấy các vé active (success hoặc pending)
        var tickets = await _showtimeSeatRepository.GetActiveTicketsAsync(showtimeSeatIds);

        var ticketLookup = tickets
            .OrderByDescending(t => t.Booking.Status == "success" ? 2 : 1)
            .GroupBy(t => t.ShowtimeSeatId)
            .ToDictionary(g => g.Key, g => g.First());

        // Kiểm tra Redis hold cho từng seatId (KHÔNG dùng KEYS/SCAN)
        var redisHoldStatus = new Dictionary<Guid, string?>();
        foreach (var ss in showtimeSeats)
        {
            var holder = await _redisService.GetStringAsync($"hold:{showtimeId}:{ss.SeatId}");
            if (!string.IsNullOrEmpty(holder))
            {
                redisHoldStatus[ss.SeatId] = holder;
            }
        }

        var result = new List<AdminShowtimeSeatDto>();

        foreach (var ss in showtimeSeats)
        {
            var seat = ss.Seat;
            var extraPrice = seat?.SeatType?.ExtraPrice ?? 0m;
            var price = showtime.BasePrice + extraPrice;

            string status;
            SeatCustomerInfoDto? customerInfo = null;

            if (ticketLookup.TryGetValue(ss.Id, out var ticket) && ticket.Booking != null)
            {
                var booking = ticket.Booking;
                var user = booking.User;

                if (booking.Status == "success")
                {
                    status = "sold";
                    customerInfo = new SeatCustomerInfoDto
                    {
                        CustomerName = user?.FullName,
                        Email = user?.Email,
                        Phone = user?.Phone,
                        BookingCode = booking.BookingCode,
                        BookingStatus = booking.Status,
                        BookedAt = booking.CreatedAt,
                        HoldingExpiresAt = null
                    };
                }
                else // pending
                {
                    status = "holding";
                    customerInfo = new SeatCustomerInfoDto
                    {
                        CustomerName = user?.FullName,
                        Email = user?.Email,
                        Phone = user?.Phone,
                        BookingCode = booking.BookingCode,
                        BookingStatus = booking.Status,
                        BookedAt = booking.CreatedAt,
                        HoldingExpiresAt = booking.ExpiresAt
                    };
                }
            }
            else if (string.Equals(ss.Status, "maintenance", StringComparison.OrdinalIgnoreCase))
            {
                status = "maintenance";
            }
            else if (redisHoldStatus.ContainsKey(ss.SeatId))
            {
                status = "holding";
            }
            else
            {
                status = "available";
            }

            result.Add(new AdminShowtimeSeatDto
            {
                ShowtimeSeatId = ss.Id,
                SeatId = ss.SeatId,
                SeatCode = seat?.SeatCode ?? string.Empty,
                RowLabel = seat?.RowLabel ?? string.Empty,
                ColumnNumber = seat?.ColumnNumber ?? 0,
                SeatTypeId = seat?.SeatTypeId ?? Guid.Empty,
                SeatTypeName = seat?.SeatType?.Name ?? string.Empty,
                ColorCode = seat?.SeatType?.ColorCode ?? string.Empty,
                Price = price,
                Status = status,
                CustomerInfo = customerInfo
            });
        }

        return new AdminShowtimeSeatsResult
        {
            Outcome = AdminShowtimeSeatsOutcome.Success,
            Seats = result
        };
    }

    public async Task<SetSeatMaintenanceResult> SetSeatMaintenanceAsync(Guid showtimeId, Guid seatId, SetSeatMaintenanceRequest? request)
    {
        if (request == null)
        {
            return new SetSeatMaintenanceResult
            {
                Outcome = SetSeatMaintenanceOutcome.InvalidRequest,
                ErrorMessage = "Dữ liệu yêu cầu không hợp lệ."
            };
        }

        var showtime = await _showtimeRepository.GetByIdAsync(showtimeId);
        if (showtime == null)
        {
            return new SetSeatMaintenanceResult
            {
                Outcome = SetSeatMaintenanceOutcome.ShowtimeNotFound,
                ErrorMessage = $"Không tìm thấy suất chiếu với ID: {showtimeId}"
            };
        }

        if (showtime.Status == ShowtimeStatus.Cancelled)
        {
            return new SetSeatMaintenanceResult
            {
                Outcome = SetSeatMaintenanceOutcome.ShowtimeCancelled,
                ErrorMessage = "Không thể thay đổi trạng thái bảo trì của suất chiếu đã bị hủy."
            };
        }

        var showtimeSeat = await _showtimeSeatRepository.GetByShowtimeAndSeatAsync(showtimeId, seatId);
        if (showtimeSeat == null)
        {
            return new SetSeatMaintenanceResult
            {
                Outcome = SetSeatMaintenanceOutcome.SeatNotFound,
                ErrorMessage = $"Không tìm thấy ghế với ID {seatId} trong suất chiếu {showtimeId}."
            };
        }

        // Chặn 409 nếu ghế đang sold hoặc gắn booking pending
        var activeTicket = await _showtimeSeatRepository.GetActiveTicketForSeatAsync(showtimeSeat.Id);
        if (activeTicket != null)
        {
            var isSold = activeTicket.Booking.Status == "success";
            var msg = isSold
                ? "Không thể thay đổi trạng thái bảo trì vì ghế đã được bán (thanh toán thành công)."
                : "Không thể thay đổi trạng thái bảo trì vì ghế đang có đơn đặt hàng (pending).";
            return new SetSeatMaintenanceResult
            {
                Outcome = isSold ? SetSeatMaintenanceOutcome.SeatSold : SetSeatMaintenanceOutcome.SeatPending,
                ErrorMessage = msg
            };
        }

        var targetStatus = request.Maintenance ? "maintenance" : "available";

        // Idempotent: Nếu trạng thái hiện tại đã khớp với trạng thái đích
        if (string.Equals(showtimeSeat.Status, targetStatus, StringComparison.OrdinalIgnoreCase))
        {
            if (request.Maintenance)
            {
                await _redisService.RemoveAsync($"hold:{showtimeId}:{showtimeSeat.SeatId}");
                if (showtimeSeat.Id != showtimeSeat.SeatId)
                {
                    await _redisService.RemoveAsync($"hold:{showtimeId}:{showtimeSeat.Id}");
                }
            }

            return new SetSeatMaintenanceResult
            {
                Outcome = SetSeatMaintenanceOutcome.Success,
                Message = request.Maintenance ? "Ghế đã ở trạng thái bảo trì." : "Ghế đã ở trạng thái khả dụng.",
                ShowtimeId = showtimeId,
                SeatId = showtimeSeat.SeatId,
                ShowtimeSeatId = showtimeSeat.Id,
                Status = showtimeSeat.Status
            };
        }

        // Thực hiện cập nhật DB trong 1 transaction
        using var transaction = await _showtimeRepository.BeginTransactionAsync();
        try
        {
            showtimeSeat.Status = targetStatus;
            await _showtimeRepository.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        // Xóa key Redis SAU COMMIT nếu khóa bảo trì (maintenance = true) theo CẢ 2 format
        if (request.Maintenance)
        {
            await _redisService.RemoveAsync($"hold:{showtimeId}:{showtimeSeat.SeatId}");
            if (showtimeSeat.Id != showtimeSeat.SeatId)
            {
                await _redisService.RemoveAsync($"hold:{showtimeId}:{showtimeSeat.Id}");
            }
        }

        return new SetSeatMaintenanceResult
        {
            Outcome = SetSeatMaintenanceOutcome.Success,
            Message = request.Maintenance ? "Đã khóa bảo trì ghế thành công." : "Đã mở khóa bảo trì ghế thành công.",
            ShowtimeId = showtimeId,
            SeatId = showtimeSeat.SeatId,
            ShowtimeSeatId = showtimeSeat.Id,
            Status = showtimeSeat.Status
        };
    }
}
