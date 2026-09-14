# Movie Booking App — ASP.NET Core Backend Business Flow

Tài liệu mô tả kiến trúc và luồng nghiệp vụ chuẩn cho backend ASP.NET Core, tương ứng với DB schema PostgreSQL 21 bảng.

---

## 1. Kiến trúc tổng thể

Áp dụng **Clean Architecture** (4 tầng), tách biệt rõ business logic khỏi framework/DB:

```
src/
  MovieBooking.Domain/          # Entities, Enums, Domain events — không phụ thuộc gì cả
  MovieBooking.Application/     # Use cases (CQRS: Commands/Queries), Interfaces, DTO, Validation
  MovieBooking.Infrastructure/  # EF Core, Redis, Payment gateway client, Repository impl
  MovieBooking.API/             # Controllers, Middleware, DI setup, Swagger
```

**Nguyên tắc phụ thuộc:** `API → Application → Domain`, `Infrastructure → Application (implement interface) → Domain`. Domain không biết đến EF Core hay Redis.

**Pattern áp dụng:**
- **CQRS + MediatR**: mỗi API endpoint = 1 Command (ghi) hoặc 1 Query (đọc), tách biệt hoàn toàn.
- **Repository + Unit of Work**: qua `DbContext` của EF Core, không cần repository thủ công cho mọi bảng — chỉ bọc Unit of Work ở tầng transaction quan trọng (Booking flow).
- **FluentValidation**: validate input ở tầng Application trước khi chạm DB.

---

## 2. Mapping module ↔ nhóm bảng

| Module (Application layer) | Bảng liên quan | Trách nhiệm |
|---|---|---|
| `Catalog` | `Movies`, `Genres`, `Actors`, `Directors` + bảng nối | CRUD phim, tìm kiếm, lọc thể loại |
| `Cinema` | `Cinemas`, `Auditoriums`, `SeatTypes`, `Seats` | Quản lý rạp, phòng chiếu, sơ đồ ghế |
| `Scheduling` | `Showtimes`, `ShowtimeSeats` | Xếp lịch chiếu, kiểm tra trùng giờ, sinh ghế cho suất chiếu |
| `Booking` | `Bookings`, `Tickets`, `BookingSnacks` | Luồng đặt vé — module lõi, phức tạp nhất |
| `Catering` | `Snacks`, `CinemaSnacks` | Menu bắp nước theo từng rạp |
| `Identity` | `Users`, `Roles`, `UserRoles` | Đăng ký/đăng nhập, JWT, phân quyền |
| `Payment` | `Payments` | Tích hợp cổng thanh toán, xử lý webhook |

---

## 3. Luồng nghiệp vụ chính: Đặt vé (Booking Flow)

Đây là luồng quan trọng nhất, cần xử lý đúng để tránh bán trùng ghế.

### Bước 1 — Xem sơ đồ ghế
```
GET /api/showtimes/{id}/seats
```
- Query `ShowtimeSeats` JOIN `Seats` JOIN `SeatTypes`.
- Với mỗi ghế, kiểm tra thêm **Redis** xem có đang bị khóa tạm (`showtime:{id}:seat:{seatId}`) không, để trả về đúng trạng thái real-time (không chỉ dựa vào cột `status` trong Postgres).

### Bước 2 — Giữ ghế tạm thời (Hold Seat)
```
POST /api/bookings/hold
Body: { showtimeId, seatIds[] }
```
- **Không ghi Postgres.** Dùng Redis `SET NX EX 300` cho từng ghế:
  ```
  SET showtime:{showtimeId}:seat:{seatId} {userId} NX EX 300
  ```
  `NX` đảm bảo chỉ 1 user giữ được ghế; nếu key đã tồn tại → trả lỗi "ghế đã được giữ" ngay lập tức, không cần lock DB.
- Trả về `holdToken` (GUID) + thời gian hết hạn để FE hiển thị đồng hồ đếm ngược.
- **Idempotency:** nếu user gọi lại với cùng `holdToken`, không tạo hold mới.

### Bước 3 — Chọn bắp nước (tùy chọn)
```
POST /api/bookings/{holdToken}/snacks
Body: { items: [{ cinemaSnackId, quantity }] }
```
- Lưu tạm trong Redis (cùng key session với hold), chưa ghi `BookingSnacks`.

### Bước 4 — Tạo đơn & thanh toán
```
POST /api/bookings/checkout
Body: { holdToken, paymentMethod }
```
Đây là bước ghi Postgres, cần **transaction thực sự**:

1. Mở EF Core transaction.
2. Kiểm tra lại Redis: các ghế trong `holdToken` còn hợp lệ (chưa hết hạn, đúng user) không.
3. Insert `Bookings` (status = `pending`).
4. Insert `Tickets` cho từng ghế — nhờ `UNIQUE(showtime_seat_id)` trên `Tickets`, nếu 2 request race nhau chèn cùng 1 ghế, request sau sẽ bị DB reject bằng unique violation (lớp bảo vệ cuối cùng, ngoài Redis).
5. Update `ShowtimeSeats.status = 'reserved'` cho các ghế đó.
6. Insert `BookingSnacks` nếu có.
7. Gọi cổng thanh toán (VNPay/MoMo/ZaloPay) → tạo `Payments` (status = `pending`), lấy URL redirect.
8. Commit transaction.
9. Xóa các key Redis hold tương ứng (đã chuyển thành `reserved` bền vững trong DB).

**Nếu thanh toán thất bại hoặc timeout:** background job (mục 5) sẽ tự động hủy đơn sau X phút nếu `Payments.status` vẫn `pending`.

### Bước 5 — Webhook xác nhận thanh toán
```
POST /api/payments/webhook/{provider}
```
- Xác thực chữ ký webhook từ cổng thanh toán.
- Update `Payments.status`, `paid_at`, `metadata` (lưu nguyên payload JSON để đối soát).
- Nếu thành công: update `Bookings.status = 'success'`, sinh `qr_code` cho từng `Tickets`, gửi email/thông báo vé điện tử.
- Nếu thất bại: update `Bookings.status = 'cancelled'`, rollback `ShowtimeSeats.status = 'available'`.
- **Idempotency bắt buộc:** webhook có thể gọi trùng lặp — check `transaction_ref` đã xử lý chưa trước khi update.

---

## 4. Luồng nghiệp vụ phụ

### Xếp lịch chiếu (Admin)
```
POST /api/admin/showtimes
```
- Insert `Showtimes` — DB tự chặn trùng giờ bằng `EXCLUDE USING gist` (không cần check tay ở code, nhưng nên catch exception này và trả message rõ ràng thay vì lỗi 500 chung chung).
- Sau khi insert `Showtimes` thành công, **background job** sinh trước toàn bộ `ShowtimeSeats` (status = `available`) dựa trên `Seats` của phòng đó — chạy async (queue), không block request tạo lịch chiếu.

### Soft delete rạp (Admin)
```
DELETE /api/admin/cinemas/{id}
```
- Update `Cinemas.deleted_at = now()` — **không** gọi `DELETE` thật.
- Trigger DB tự cascade soft-delete `Auditoriums`, `CinemaSnacks` liên quan (đã cấu hình sẵn trong schema).
- Application layer không cần tự lo cascade, nhưng **mọi query danh sách phải luôn filter `WHERE deleted_at IS NULL`** — nên tạo EF Core global query filter để tránh quên:
  ```csharp
  modelBuilder.Entity<Cinema>().HasQueryFilter(c => c.DeletedAt == null);
  ```

### Đăng ký tài khoản
```
POST /api/auth/register
```
- Kiểm tra email trùng chỉ trong phạm vi user **chưa soft-delete** (đã có partial unique index ở DB, nhưng nên check trước ở Application để trả lỗi 400 rõ ràng thay vì để DB ném exception 500).
- Gán role mặc định `Customer` vào `UserRoles`.

---

## 5. Background Jobs (dùng Hangfire hoặc Quartz.NET)

| Job | Tần suất | Việc làm |
|---|---|---|
| `ExpireStalePendingBookings` | Mỗi 1 phút | Tìm `Bookings.status = 'pending'` quá 10 phút chưa thanh toán → hủy đơn, trả ghế về `available` |
| `GenerateShowtimeSeats` | Theo queue (khi tạo `Showtimes`) | Sinh trước `ShowtimeSeats` cho suất chiếu mới |
| `AutoCancelShowtimeOnMovieDelete` | Theo event (khi `Movies.deleted_at` được set) | Hủy các `Showtimes` sắp tới của phim đó (business rule cần xác nhận với bạn trước khi code) |
| `SyncPaymentStatus` | Mỗi 5 phút | Đối soát các `Payments.status = 'pending'` quá lâu bằng cách gọi API query trạng thái từ cổng thanh toán (phòng trường hợp lỡ webhook) |

---

## 6. Xử lý đồng thời & bảo vệ dữ liệu

| Rủi ro | Giải pháp |
|---|---|
| 2 user cùng đặt 1 ghế cùng lúc | Redis `SET NX` chặn ở bước hold; `UNIQUE(showtime_seat_id)` trên `Tickets` chặn ở bước insert (2 lớp) |
| Admin xếp trùng giờ chiếu | `EXCLUDE USING gist` chặn ở DB, không cần check tay |
| Webhook gọi trùng lặp | Check `transaction_ref` đã xử lý trước khi update |
| Xóa user còn booking | `ON DELETE RESTRICT` — DB tự chặn, backend chỉ cần bắt exception và trả message thân thiện |
| Quên filter soft-delete | EF Core Global Query Filter áp cho toàn bộ 7 bảng có `deleted_at` |

---

## 7. Cấu trúc API tổng hợp (gợi ý)

```
GET    /api/movies                       # Danh sách phim, filter theo genre/status
GET    /api/movies/{id}                  # Chi tiết phim
GET    /api/cinemas                      # Danh sách rạp
GET    /api/cinemas/{id}/showtimes       # Lịch chiếu theo rạp + ngày
GET    /api/showtimes/{id}/seats         # Sơ đồ ghế (kết hợp Redis realtime)
POST   /api/bookings/hold                # Giữ ghế tạm
POST   /api/bookings/{holdToken}/snacks  # Chọn bắp nước
POST   /api/bookings/checkout            # Tạo đơn + thanh toán
GET    /api/bookings/{id}                # Chi tiết đơn / vé điện tử
POST   /api/payments/webhook/{provider}  # Webhook cổng thanh toán
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/me/bookings            # Lịch sử đặt vé
```

---

## 8. Ghi chú triển khai theo 5 nhóm dev (bám theo phân chia trước đó)

| Dev | Module ASP.NET Core | Điểm cần phối hợp |
|---|---|---|
| A | `Catalog` (Movies, Genres, Directors) | Expose `MovieId` cho Dev C dùng trong `Scheduling` |
| B | `Cinema` (Actors, Cinemas, Auditoriums, Seats) | Expose `CinemaId`, `AuditoriumId` cho Dev C |
| C | `Scheduling` (Showtimes, SeatTypes, Seats, ShowtimeSeats) | Expose `ShowtimeId` cho Dev D; implement Redis hold logic |
| D | `Booking` (Bookings, Tickets, Snacks, BookingSnacks) | Cần `UserId` từ Dev E, `ShowtimeId` từ Dev C |
| E | `Identity` + `Payment` (Users, Roles, Payments) | `Payments` phụ thuộc `BookingId` từ Dev D nên code sau cùng |
