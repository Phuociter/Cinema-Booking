# 🎬 Hướng Dẫn Triển Khai Backend & Sơ Đồ Nghiệp Vụ (Business Logic)

Tài liệu này cung cấp hướng dẫn chi tiết về cấu trúc 3-Layer (`API → Service → Data`), sơ đồ luồng nghiệp vụ chuẩn hóa (Mermaid Diagrams) và bảng phân chia công việc độc lập cho 5 lập trình viên (Dev A, B, C, D, E).

---

## 1. Sơ Đồ Kiến Trúc & Luồng Nghiệp Vụ (Business Logic)

### 1.1 Luồng Nghiệp Vụ Đặt Vé (Core Booking Flow)

Luồng nghiệp vụ quan trọng nhất của hệ thống, bảo toàn tính nhất quán qua Database Transaction:

```text
┌────────────────────────────────────────────────────────────┐
│          1.1 LUỒNG NGHIỆP VỤ ĐẶT VÉ (BOOKING FLOW)         │
└────────────────────────────────────────────────────────────┘

[1] Khách hàng gửi yêu cầu đặt vé:
    Client ──( POST /api/bookings )──► BookingsController

[2] Controller validate & chuyển tiếp:
    BookingsController ──( CreateBookingAsync )──► BookingService

[3] Service thực thi Transaction trong PostgreSQL:
    BookingService ──( Begin Transaction )──► PostgreSQL
    ├── 1. Kiểm tra ghế trống (status == 'available')
    ├── 2. INSERT Bookings (status = 'pending')
    ├── 3. INSERT Tickets (sinh vé từng ghế)
    ├── 4. UPDATE ShowtimeSeats (status = 'reserved')
    ├── 5. INSERT BookingSnacks (nếu có bắp nước)
    ├── 6. INSERT Payments (status = 'pending')
    └── 7. COMMIT Transaction

[4] Phản hồi kết quả:
    BookingService ──► BookingsController ──► Client
    └── Trả về: 200 OK (BookingResponseDto + PaymentUrl)
```

---

### 1.2 Luồng Thanh Toán & Xử Lý Webhook / Callback

```text
┌────────────────────────────────────────────────────────────┐
│     1.2 LUỒNG THANH TOÁN & WEBHOOK (PAYMENT CALLBACK)      │
└────────────────────────────────────────────────────────────┘

[1] Khách hàng thanh toán qua cổng:
    Client ──( Thanh toán online )──► Cổng Thanh Toán (VNPay/MoMo)

[2] Cổng thanh toán gọi Webhook về Backend:
    Cổng Thanh Toán ──( POST /payments/callback )──► PaymentsController

[3] Service xác thực chữ ký & cập nhật DB:
    PaymentsController ──( ProcessCallback )──► PaymentService
    PaymentService ──( Verify HMAC )──► Kiểm tra chữ ký số
    ├── NẾU THÀNH CÔNG:
    │   ├── UPDATE Payments (status = 'success', paid_at = now)
    │   ├── UPDATE Bookings (status = 'success')
    │   └── Sinh QR Code cho từng Ticket
    └── NẾU THẤT BẠI:
        ├── UPDATE Payments (status = 'failed')
        ├── UPDATE Bookings (status = 'cancelled')
        └── Rollback ghế: ShowtimeSeats (status = 'available')

[4] Xác nhận với cổng thanh toán:
    PaymentService ──► PaymentsController ──► Cổng Thanh Toán (200 OK)
```

---

### 1.3 Luồng Xác Thực & Đăng Nhập (Auth & JWT Flow)

#### A. Luồng Đăng Ký Tài Khoản (Registration)

```text
┌────────────────────────────────────────────────────────────┐
│              1.3A LUỒNG ĐĂNG KÝ (REGISTRATION)             │
└────────────────────────────────────────────────────────────┘

Client ──( POST /api/auth/register )──► AuthController
                                               │
                                      AuthService
                                               │
         ┌─────────────────────────────────────┴─────────────────────────────────────┐
         ▼                                                                           ▼
 [Kiểm tra Email]                                                            [Hash Mật Khẩu]
 Query PostgreSQL                                                             PasswordHasher
 (WHERE deleted_at IS NULL)                                                  (Thuật toán PBKDF2)
         │                                                                           │
         └─────────────────────────────────────┬─────────────────────────────────────┘
                                               ▼
                                      [Lưu Vào Database]
                                       INSERT INTO Users
                                      & UserRoles (Role: Customer)
                                               │
Client ◄──( 200 OK: Đăng ký thành công )───────┘
```

#### B. Luồng Đăng Nhập & Cấp JWT Token (Login)

```text
┌────────────────────────────────────────────────────────────┐
│           1.3B LUỒNG ĐĂNG NHẬP & CẤP TOKEN (LOGIN)         │
└────────────────────────────────────────────────────────────┘

Client ──( POST /api/auth/login )──► AuthController ──► AuthService
                                                               │
         ┌─────────────────────────────────────────────────────┤
         ▼                                                     ▼
  [1. Tìm User]                                         [2. Kiểm Tra Hash]
  Query PostgreSQL theo Email                            VerifyHashedPassword
         │                                                     │
         └──────────────────────────┬──────────────────────────┘
                                    ▼
                           [Mật Khẩu Chính Xác]
                           Sinh chuỗi JWT Token
                           Claims: UserId, Email, Roles
                                    │
Client ◄──( 200 OK: Token + UserDto )───┘
```

---

### 1.4 Quy Tắc Xóa Dữ Liệu: Soft Delete vs Status vs Hard Delete

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      YÊU CẦU XÓA DỮ LIỆU                                      │
└───────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                                │
        ┌───────────────────────────────────────┼───────────────────────────────────────┐
        │                                       │                                       │
        ▼                                       ▼                                       ▼
┌───────────────────────┐               ┌───────────────────────┐               ┌───────────────────────┐
│    🟢 SOFT DELETE     │               │  🔵 TRANSACTIONAL     │               │    🔴 HARD DELETE     │
│       (7 Bảng)        │               │       (5 Bảng)        │               │       (9 Bảng)        │
├───────────────────────┤               ├───────────────────────┤               ├───────────────────────┤
│ • Movies              │               │ • Showtimes           │               │ • Seats               │
│ • Users               │               │   (status=cancelled)  │               │ • Genres, Actors      │
│ • Cinemas             │               │ • Bookings            │               │ • Directors, Roles    │
│ • Auditoriums         │               │   (status=cancelled)  │               │ • MovieGenres         │
│ • Snacks              │               │ • Payments            │               │ • MovieDirectors      │
│ • CinemaSnacks        │               │   (status=failed)     │               │ • MovieActors         │
│ • SeatTypes           │               │ • ShowtimeSeats       │               │ • UserRoles           │
│                       │               │   (status=available)  │               │ • BookingSnacks       │
│ -> Gán:               │               │ • Tickets             │               │                       │
│   DeletedAt = now()   │               │   (Không xóa record)  │               │ -> Xóa vật lý         │
│ -> Tự động lọc qua:   │               │                       │               │    khỏi Database      │
│   Global Query Filter │               │ -> Cập nhật Status    │               │    (ON DELETE CASCADE)│
└───────────────────────┘               └───────────────────────┘               └───────────────────────┘
```

---

## 2. Phân Chia Task Chi Tiết Cho 5 Lập Trình Viên

| Dev | Module Phụ Trách | Entities Sở Hữu | File Cần Code |
|---|---|---|---|
| **Dev A** | Quản lý Phim & Thể loại | `Movie`, `Genre`, `MovieGenre`, `Director`, `MovieDirector` | `IMovieService.cs`, `MovieService.cs`, `MoviesController.cs` |
| **Dev B** | Rạp, Phòng chiếu & Diễn viên | `Actor`, `MovieActor`, `Cinema`, `Auditorium` | `ICinemaService.cs`, `CinemaService.cs`, `CinemasController.cs` |
| **Dev C** | Lịch chiếu & Sơ đồ Ghế | `Showtime`, `SeatType`, `Seat`, `ShowtimeSeat` | `IScheduleService.cs`, `ScheduleService.cs`, `ShowtimesController.cs` |
| **Dev D** | Đặt vé & Bắp nước | `Booking`, `Ticket`, `Snack`, `CinemaSnack`, `BookingSnack` | `IBookingService.cs`, `BookingService.cs`, `BookingsController.cs` |
| **Dev E** | Xác thực & Thanh toán | `User`, `Role`, `UserRole`, `Payment` | `IAuthService.cs`, `IPaymentService.cs`, `AuthController.cs`, `PaymentsController.cs` |

---

### 👤 DEV A: Chi Tiết Task Quản Lý Phim

#### 1. Service: `MovieBooking.Service/Services/MovieService.cs`
- `GetAllMoviesAsync(string? status, string? search)`: Lấy danh sách phim, lọc theo trạng thái (`now_showing`, `coming_soon`) và tìm kiếm theo tên phim.
- `GetMovieByIdAsync(Guid id)`: Lấy chi tiết phim kèm Thể loại (`MovieGenres`), Đạo diễn (`MovieDirectors`), Diễn viên (`MovieActors`).
- `CreateMovieAsync(CreateMovieRequest request)`: Thêm phim mới và tạo các liên kết nhiều-nhiều.
- `SoftDeleteMovieAsync(Guid id)`: Gán `DeletedAt = DateTime.UtcNow`.

#### 2. Controller: `MovieBooking.API/Controllers/MoviesController.cs`
```csharp
[ApiController]
[Route("api/[controller]")]
public class MoviesController : ControllerBase
{
    private readonly IMovieService _movieService;
    public MoviesController(IMovieService movieService) => _movieService = movieService;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? search)
        => Ok(await _movieService.GetAllMoviesAsync(status, search));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var movie = await _movieService.GetMovieByIdAsync(id);
        return movie == null ? NotFound("Không tìm thấy phim") : Ok(movie);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateMovieRequest request)
        => Ok(await _movieService.CreateMovieAsync(request));

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _movieService.SoftDeleteMovieAsync(id);
        return NoContent();
    }
}
```

---

### 👤 DEV B: Chi Tiết Task Rạp & Phòng Chiếu

#### 1. Service: `MovieBooking.Service/Services/CinemaService.cs`
- `GetAllCinemasAsync()`: Danh sách các rạp chiếu phim kèm danh sách phòng chiếu (`Auditoriums`).
- `GetCinemaByIdAsync(Guid id)`: Chi tiết rạp.
- `GetCinemaSnacksAsync(Guid cinemaId)`: Danh sách bắp nước đang kinh doanh tại rạp (`is_available = true`).
- `SoftDeleteCinemaAsync(Guid id)`: Xóa mềm rạp (Trigger DB sẽ tự cascade xóa mềm các phòng chiếu và menu bắp nước liên quan).

#### 2. Controller: `MovieBooking.API/Controllers/CinemasController.cs`
- `GET /api/cinemas` (Public)
- `GET /api/cinemas/{id}` (Public)
- `GET /api/cinemas/{id}/snacks` (Public)
- `DELETE /api/cinemas/{id}` (`[Authorize(Roles = "Admin")]`)

---

### 👤 DEV C: Chi Tiết Task Lịch Chiếu & Sơ Đồ Ghế

#### 1. Service: `MovieBooking.Service/Services/ScheduleService.cs`
- `GetShowtimesAsync(Guid? movieId, Guid? cinemaId, DateOnly? date)`: Lấy lịch chiếu theo phim/rạp/ngày.
- `GetSeatsForShowtimeAsync(Guid showtimeId)`: Trả về toàn bộ danh sách ghế trong suất chiếu kèm trạng thái hiện tại (`available` hoặc `reserved`), loại ghế (`Standard`, `VIP`, `Couple`) và giá vé thực tế (`BasePrice + ExtraPrice`).
- `CancelShowtimeAsync(Guid id)`: Cập nhật `Status = "cancelled"`.

#### 2. Controller: `MovieBooking.API/Controllers/ShowtimesController.cs`
- `GET /api/showtimes` (Public — Query params: `movieId`, `cinemaId`, `date`)
- `GET /api/showtimes/{id}` (Public)
- `GET /api/showtimes/{id}/seats` (Public — Sơ đồ ghế)
- `PUT /api/showtimes/{id}/cancel` (`[Authorize(Roles = "Admin")]`)

---

### 👤 DEV D: Chi Tiết Task Luồng Đặt Vé & Bắp Nước

#### 1. Service: `MovieBooking.Service/Services/BookingService.cs`
- **Xử lý Transaction đặt vé**:
  1. Kiểm tra toàn bộ `ShowtimeSeatIds` yêu cầu có ở trạng thái `available` không.
  2. Tạo mã đặt vé ngẫu nhiên `BookingCode` (Ví dụ: `BK-89421A`).
  3. Tạo `Bookings` (`status = 'pending'`).
  4. Tạo các `Tickets` tương ứng từng ghế và đổi `ShowtimeSeats.status = 'reserved'`.
  5. Thêm `BookingSnacks` nếu có đặt bắp nước.
  6. Tính tổng tiền và commit transaction.

#### 2. Controller: `MovieBooking.API/Controllers/BookingsController.cs`
- `POST /api/bookings` (`[Authorize]` — Lấy `UserId` từ JWT Claims `User.FindFirst(ClaimTypes.NameIdentifier)`).
- `GET /api/bookings/{id}` (`[Authorize]`).
- `GET /api/bookings/my-bookings` (`[Authorize]`).

---

### 👤 DEV E: Chi Tiết Task Xác Thực & Thanh Toán

#### 1. Service: `MovieBooking.Service/Services/AuthService.cs` & `PaymentService.cs`
- `RegisterAsync(RegisterRequest request)`: Kiểm tra email chưa tồn tại, mã hóa mật khẩu, tạo User mới.
- `LoginAsync(LoginRequest request)`: So khớp hash, sinh chuỗi JWT Token có hạn sử dụng và chứa các Claims:
  - `ClaimTypes.NameIdentifier` (`user.Id`)
  - `ClaimTypes.Email` (`user.Email`)
  - `ClaimTypes.Role` (`Roles` của user)
- `ProcessPaymentCallbackAsync(PaymentCallbackRequest request)`: Cập nhật trạng thái giao dịch thanh toán và đơn hàng.

#### 2. Controller: `MovieBooking.API/Controllers/AuthController.cs` & `PaymentsController.cs`
- `POST /api/auth/register` (Public)
- `POST /api/auth/login` (Public)
- `GET /api/auth/me` (`[Authorize]`)
- `POST /api/payments/callback` (Public Webhook)

---

## 3. Quy Chuẩn Kỹ Thuật Bắt Buộc Toàn Dự Án

1. **Thời Gian & Múi Giờ (PostgreSQL TIMESTAMPTZ)**:
   - Luôn sử dụng `DateTime.UtcNow`, **tuyệt đối không dùng `DateTime.Now`**.
2. **Xử Lý Lỗi Tập Trung (ExceptionHandlingMiddleware)**:
   - Không lặp lại các khối `try/catch` vô nghĩa trong Controller. Mọi ngoại lệ chưa bắt sẽ được Middleware tự động xử lý và trả về JSON chuẩn format RFC 7807.
3. **Bảo Mật Dữ Liệu Nhạy Cảm**:
   - Không bao giờ trả trực tiếp Entity ra ngoài API. Luôn chuyển đổi qua DTO (`AutoMapper`).
   - Lấy `UserId` từ Token Claims, không nhận `userId` từ query string để tránh lỗ hổng IDOR (truy cập chéo dữ liệu).
