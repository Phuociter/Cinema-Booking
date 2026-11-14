using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Data.Entities;
using MovieBooking.Service.DTOs;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<PaymentsController> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentRequest request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new { message = "Người dùng chưa đăng nhập hoặc token không hợp lệ." });
        }

        var booking = await _context.Bookings
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
            .FirstOrDefaultAsync(b => b.Id == request.BookingId);

        if (booking == null)
        {
            return NotFound(new { message = $"Không tìm thấy đơn đặt vé với ID: {request.BookingId}" });
        }

        if (booking.UserId != userId)
        {
            return StatusCode(403, new { message = "Bạn không có quyền thực hiện thanh toán cho đơn đặt vé này." });
        }

        if (booking.Status != "pending")
        {
            return BadRequest(new { message = $"Đơn đặt vé đang ở trạng thái '{booking.Status}', không thể thanh toán." });
        }

        if (await SweepIfExpiredAsync(booking))
        {
            return BadRequest(new { message = "Đơn đặt vé đã hết hạn thanh toán (quá 10 phút)." });
        }

        // Đọc cấu hình MoMo từ biến môi trường (.env)
        var momo = GetMoMoConfig();
        if (momo == null)
        {
            _logger.LogError("Thiếu cấu hình biến môi trường MoMo (MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY).");
            return StatusCode(500, new { message = "Hệ thống chưa được cấu hình biến môi trường MoMo." });
        }

        var orderId = $"BK_{booking.BookingCode}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var requestId = Guid.NewGuid().ToString();
        var amount = (long)booking.TotalAmount;
        var orderInfo = $"Thanh toan don dat ve {booking.BookingCode}";
        var requestType = "payWithMethod";
        var extraData = "";

        // Raw signature alphabetical order:
        // accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType
        var rawSignature = $"accessKey={momo.AccessKey}&amount={amount}&extraData={extraData}&ipnUrl={momo.NotifyUrl}&orderId={orderId}&orderInfo={orderInfo}&partnerCode={momo.PartnerCode}&redirectUrl={momo.ReturnUrl}&requestId={requestId}&requestType={requestType}";
        var signature = ComputeHmacSha256(rawSignature, momo.SecretKey);

        var momoRequestPayload = new
        {
            partnerCode = momo.PartnerCode,
            requestType,
            ipnUrl = momo.NotifyUrl,
            redirectUrl = momo.ReturnUrl,
            orderId,
            amount,
            orderInfo,
            requestId,
            extraData,
            lang = "vi",
            signature
        };

         var client = _httpClientFactory.CreateClient();
         client.Timeout = TimeSpan.FromSeconds(30);

         var jsonContent = new StringContent(JsonSerializer.Serialize(momoRequestPayload), Encoding.UTF8, "application/json");
         var baseEndpoint = momo.ApiEndpoint
             .Replace("/v2/gateway/api/create", "")
             .Replace("/v2/gateway/api/query", "")
             .TrimEnd('/');
         var createUrl = $"{baseEndpoint}/v2/gateway/api/create";

         HttpResponseMessage response;
         try
         {
             response = await client.PostAsync(createUrl, jsonContent);
         }
         catch (Exception ex)
         {
             _logger.LogError(ex, "Lỗi kết nối tới MoMo API Create");
             return StatusCode(502, new { message = "Không thể kết nối đến cổng thanh toán MoMo.", error = ex.Message });
         }

         var responseBody = await response.Content.ReadAsStringAsync();
         if (!response.IsSuccessStatusCode)
         {
             _logger.LogError("MoMo Create trả về HTTP {StatusCode}: {Response}", response.StatusCode, responseBody);
             return StatusCode(502, new { message = "Khởi tạo thanh toán MoMo thất bại.", error = responseBody });
         }

         var momoResponse = JsonSerializer.Deserialize<MoMoCreateResponse>(responseBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

         if (momoResponse == null || momoResponse.ResultCode != 0)
         {
             _logger.LogError("MoMo Create trả về lỗi: {Response}", responseBody);
             return StatusCode(502, new
             {
                 message = "Khởi tạo thanh toán MoMo thất bại.",
                 resultCode = momoResponse?.ResultCode,
                 error = momoResponse?.Message ?? responseBody
             });
         }

         // Tạo hoặc cập nhật bản ghi Payment trong DB
        var payment = await _context.Payments.FirstOrDefaultAsync(p => p.BookingId == booking.Id);
        if (payment == null)
        {
            payment = new Payment
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                Provider = "MOMO",
                Method = "QR",
                Amount = booking.TotalAmount,
                Status = "pending",
                TransactionRef = orderId,
                Metadata = JsonSerializer.Serialize(new
                {
                    orderId,
                    requestId,
                    payUrl = momoResponse.PayUrl,
                    shortLink = momoResponse.ShortLink,
                    qrCodeUrl = momoResponse.QrCodeUrl,
                    deeplink = momoResponse.Deeplink
                }),
                CreatedAt = DateTime.UtcNow
            };
            _context.Payments.Add(payment);
        }
        else
        {
            payment.TransactionRef = orderId;
            payment.Status = "pending";
            payment.Metadata = JsonSerializer.Serialize(new
            {
                orderId,
                requestId,
                payUrl = momoResponse.PayUrl,
                shortLink = momoResponse.ShortLink,
                qrCodeUrl = momoResponse.QrCodeUrl,
                deeplink = momoResponse.Deeplink
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new CreatePaymentResponse
        {
            BookingId = booking.Id,
            OrderId = orderId,
            Amount = booking.TotalAmount,
            PayUrl = momoResponse.PayUrl ?? string.Empty,
            QrCodeUrl = momoResponse.QrCodeUrl,
            Deeplink = momoResponse.Deeplink
        });
    }

    [HttpGet("{bookingId:guid}/status")]
    public async Task<IActionResult> GetPaymentStatus(Guid bookingId)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new { message = "Người dùng chưa đăng nhập hoặc token không hợp lệ." });
        }

        var booking = await _context.Bookings
            .Include(b => b.Tickets)
                .ThenInclude(t => t.ShowtimeSeat)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
        {
            return NotFound(new { message = $"Không tìm thấy đơn đặt vé với ID: {bookingId}" });
        }

        if (booking.UserId != userId)
        {
            return StatusCode(403, new { message = "Bạn không có quyền xem trạng thái đơn đặt vé này." });
        }

        // Lazy sweep: Nếu đơn đang pending mà đã hết hạn, tự động hủy và trả lại ghế trống
        await SweepIfExpiredAsync(booking);

        // Nếu đã thành công trước đó thì trả ngay kết quả
        if (booking.Status == "success")
        {
            var p = await _context.Payments.FirstOrDefaultAsync(x => x.BookingId == bookingId);
            return Ok(new PaymentStatusResponse
            {
                BookingId = booking.Id,
                BookingStatus = "success",
                PaymentStatus = "success",
                ResultCode = 0,
                Message = "Giao dịch thanh toán đã thành công.",
                TransId = p?.TransactionRef,
                Amount = booking.TotalAmount
            });
        }

        // Nếu đã hủy hoặc hết hạn
        if (booking.Status == "cancelled")
        {
            return Ok(new PaymentStatusResponse
            {
                BookingId = booking.Id,
                BookingStatus = "cancelled",
                PaymentStatus = "failed",
                ResultCode = -1,
                Message = "Đơn đặt vé đã bị hủy hoặc hết hạn thanh toán.",
                Amount = booking.TotalAmount
            });
        }

        var payment = await _context.Payments.FirstOrDefaultAsync(p => p.BookingId == booking.Id);
        if (payment == null || string.IsNullOrWhiteSpace(payment.TransactionRef))
        {
            return Ok(new PaymentStatusResponse
            {
                BookingId = booking.Id,
                BookingStatus = booking.Status,
                PaymentStatus = "pending",
                ResultCode = 1000,
                Message = "Chưa có phiên thanh toán MoMo nào được tạo.",
                Amount = booking.TotalAmount
            });
        }

        // Gọi MoMo Query Transaction Status API từ biến môi trường (.env)
        var momo = GetMoMoConfig();
        if (momo == null)
        {
            _logger.LogError("Thiếu cấu hình biến môi trường MoMo (MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY).");
            return StatusCode(500, new { message = "Hệ thống chưa được cấu hình biến môi trường MoMo." });
        }

        var orderId = payment.TransactionRef;
        var requestId = Guid.NewGuid().ToString();

        // Raw signature alphabetical order:
        // accessKey, orderId, partnerCode, requestId
        var rawSignature = $"accessKey={momo.AccessKey}&orderId={orderId}&partnerCode={momo.PartnerCode}&requestId={requestId}";
        var signature = ComputeHmacSha256(rawSignature, momo.SecretKey);

        var momoQueryPayload = new
        {
            partnerCode = momo.PartnerCode,
            requestId,
            orderId,
            signature,
            lang = "vi"
        };

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);

        var jsonContent = new StringContent(JsonSerializer.Serialize(momoQueryPayload), Encoding.UTF8, "application/json");
        var baseEndpoint = momo.ApiEndpoint
            .Replace("/v2/gateway/api/create", "")
            .Replace("/v2/gateway/api/query", "")
            .TrimEnd('/');
        var queryUrl = $"{baseEndpoint}/v2/gateway/api/query";

        try
        {
            var response = await client.PostAsync(queryUrl, jsonContent);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("MoMo Query HTTP {StatusCode}: {Response}", response.StatusCode, responseBody);
                return Ok(new PaymentStatusResponse
                {
                    BookingId = booking.Id,
                    BookingStatus = booking.Status,
                    PaymentStatus = payment.Status,
                    ResultCode = 1000,
                    Message = "Đang chờ thanh toán...",
                    Amount = booking.TotalAmount
                });
            }

            var momoRes = JsonSerializer.Deserialize<MoMoQueryResponse>(responseBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (momoRes != null && momoRes.ResultCode.HasValue)
            {
                if (momoRes.ResultCode.Value == 0)
                {
                    // Thanh toán thành công!
                    payment.Status = "success";
                    payment.PaidAt = DateTime.UtcNow;
                    if (momoRes.TransId.HasValue)
                    {
                        payment.TransactionRef = momoRes.TransId.Value.ToString();
                    }
                    booking.Status = "success";
                    booking.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
                else if (momoRes.ResultCode.Value != 1000 && momoRes.ResultCode.Value != 7000 && momoRes.ResultCode.Value != 7002)
                {
                    // Thất bại hoặc bị hủy bởi người dùng
                    payment.Status = "failed";
                    booking.Status = "cancelled";
                    booking.UpdatedAt = DateTime.UtcNow;
                    foreach (var t in booking.Tickets)
                    {
                        if (t.ShowtimeSeat != null)
                        {
                            t.ShowtimeSeat.Status = "available";
                        }
                    }
                    _context.Tickets.RemoveRange(booking.Tickets);
                    await _context.SaveChangesAsync();
                }

                return Ok(new PaymentStatusResponse
                {
                    BookingId = booking.Id,
                    BookingStatus = booking.Status,
                    PaymentStatus = payment.Status,
                    ResultCode = momoRes.ResultCode.Value,
                    Message = momoRes.Message ?? string.Empty,
                    TransId = momoRes.TransId?.ToString(),
                    Amount = momoRes.Amount
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi MoMo query status với OrderId: {OrderId}", orderId);
        }

        // Fallback nếu MoMo timeout hoặc tạm thời không truy vấn được
        return Ok(new PaymentStatusResponse
        {
            BookingId = booking.Id,
            BookingStatus = booking.Status,
            PaymentStatus = payment.Status,
            ResultCode = 1000,
            Message = "Đang chờ thanh toán...",
            Amount = booking.TotalAmount
        });
    }

    private static string ComputeHmacSha256(string message, string secretKey)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secretKey);
        var messageBytes = Encoding.UTF8.GetBytes(message);
        using var hmac = new HMACSHA256(keyBytes);
        var hashBytes = hmac.ComputeHash(messageBytes);
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
    }

    private class MoMoCreateResponse
    {
        public string? PartnerCode { get; set; }
        public string? OrderId { get; set; }
        public string? RequestId { get; set; }
        public long Amount { get; set; }
        public long ResponseTime { get; set; }
        public string? Message { get; set; }
        public int? ResultCode { get; set; }
        public string? PayUrl { get; set; }
        public string? Deeplink { get; set; }
        public string? QrCodeUrl { get; set; }
        public string? ShortLink { get; set; }
    }

    private class MoMoQueryResponse
    {
        public string? PartnerCode { get; set; }
        public string? OrderId { get; set; }
        public string? RequestId { get; set; }
        public string? ExtraData { get; set; }
        public long Amount { get; set; }
        public long? TransId { get; set; }
        public string? PayType { get; set; }
        public int? ResultCode { get; set; }
        public string? Message { get; set; }
        public long ResponseTime { get; set; }
    }

    private async Task<bool> SweepIfExpiredAsync(Booking booking)
    {
        var now = DateTime.UtcNow;
        var tenMinutesAgo = now.AddMinutes(-10);
        var isExpired = (booking.ExpiresAt != null && booking.ExpiresAt < now) ||
                        (booking.ExpiresAt == null && booking.CreatedAt < tenMinutesAgo);

        if (booking.Status == "pending" && isExpired)
        {
            booking.Status = "cancelled";
            booking.UpdatedAt = now;
            foreach (var t in booking.Tickets)
            {
                if (t.ShowtimeSeat != null)
                {
                    t.ShowtimeSeat.Status = "available";
                }
            }
            _context.Tickets.RemoveRange(booking.Tickets);
            await _context.SaveChangesAsync();
            return true;
        }
        return false;
    }

    private record MoMoConfig(string PartnerCode, string AccessKey, string SecretKey, string ApiEndpoint, string ReturnUrl, string NotifyUrl);

    private MoMoConfig? GetMoMoConfig()
    {
        var partnerCode = _configuration["MOMO_PARTNER_CODE"] ?? Environment.GetEnvironmentVariable("MOMO_PARTNER_CODE");
        var accessKey = _configuration["MOMO_ACCESS_KEY"] ?? Environment.GetEnvironmentVariable("MOMO_ACCESS_KEY");
        var secretKey = _configuration["MOMO_SECRET_KEY"] ?? Environment.GetEnvironmentVariable("MOMO_SECRET_KEY");

        if (string.IsNullOrWhiteSpace(partnerCode) || string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey))
        {
            return null;
        }

        var apiEndpoint = _configuration["MOMO_API_ENDPOINT"] 
            ?? Environment.GetEnvironmentVariable("MOMO_API_ENDPOINT") 
            ?? "https://test-payment.momo.vn";

        var returnUrl = _configuration["MOMO_RETURN_URL"] 
            ?? Environment.GetEnvironmentVariable("MOMO_RETURN_URL") 
            ?? "http://localhost:3001/payment/callback";

        var notifyUrl = _configuration["MOMO_NOTIFY_URL"] 
            ?? Environment.GetEnvironmentVariable("MOMO_NOTIFY_URL") 
            ?? "https://test-payment.momo.vn";

        return new MoMoConfig(partnerCode, accessKey, secretKey, apiEndpoint, returnUrl, notifyUrl);
    }
}
