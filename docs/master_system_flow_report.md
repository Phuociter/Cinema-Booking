# 🧭 BÁO CÁO TỔNG THỂ KIẾN TRÚC & LUỒNG DỮ LIỆU TOÀN HỆ THỐNG
## DÀNH CHO TECH LEAD / PROJECT OWNER (CINEMA BOOKING SYSTEM)

> **Mục đích tài liệu:** Cung cấp cái nhìn toàn cảnh từ Giao diện Frontend (React) ➔ Tầng Xử lý Backend (ASP.NET Core 8 Web API) ➔ Cơ sở dữ liệu (PostgreSQL 16 & Redis), giúp Tech Lead nắm trọn luồng vận hành để điều phối và dẫn dắt 5 lập trình viên (Dev A-E).

---

## 🏛️ 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG 3 TẦNG (3-TIER ARCHITECTURE)

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           TẦNG 1: FRONTEND (REACT 19 / VITE)                      │
│  • Client Portal: Home, Movies, MovieDetail, Theaters, Releases, Profile          │
│  • Booking Flow: SeatLayout -> SeatMap (Dev C) + BookingSummary (Dev D)           │
│  • Admin Portal (6 Trang): Dashboard, Movies, Cinemas, Showtimes, Snacks, Users   │
│  • API Client Layer: axiosInstance (JWT interceptor) + 8 Domain Hooks             │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │ HTTP / RESTful JSON (CORS: 5173, 3000, 3001)
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                     TẦNG 2: BACKEND (.NET 8 WEB API - 3 LAYERS)                   │
│  • MovieBooking.API: Controllers, Middleware (Exception, Auth), Program.cs        │
│  • MovieBooking.Service: Business Logic, Redis Engine, Background Jobs            │
│  • MovieBooking.Data: AppDbContext (EF Core Npgsql), 22 Entities, Repositories    │
└────────────────────────────────────┬───────────┬──────────────────────────────────┘
                                     │           │
           PostgreSQL Connection     │           │   Redis Connection
           (Port 5432)               │           │   (Port 6379, TTL 5min)
                                     ▼           ▼
┌─────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│     TẦNG 3A: DATABASE POSTGRESQL 16     │ │       TẦNG 3B: REDIS IN-MEMORY        │
│  • 22 Bảng dữ liệu chuẩn hóa quan hệ    │ │  • Bộ nhớ đệm giữ ghế thời gian thực  │
│  • 38.400 bản ghi hạt giống (Seed Data) │ │  • Khóa tự hủy 5 phút (TTL 300s)      │
│  • Giao dịch tài chính ACID bền vững    │ │  • Triệt tiêu nghẽn ghi Database      │
└─────────────────────────────────────────┘ └───────────────────────────────────────┘
```

---

## 🔁 2. CHI TIẾT 5 LUỒNG DỮ LIỆU ĐẦU-CUỐI (END-TO-END FLOWS)

---

### 🌊 LUỒNG 1: KHÁM PHÁ PHIM & CHỌN CỤM RẠP (DEV A & DEV B)

Luồng khách hàng dạo trang chủ, tìm kiếm phim đang chiếu và xem thông tin rạp chiếu:

```text
[Khách Hàng] ──► Truy cập trang / hoặc /movies
      │
      ▼ (FE)
src/api/useMovies.js ──( GET /api/movies?status=now_showing )──► MoviesController
      │
      ▼ (BE)
MovieService.cs ──( Query EF Core )──► AppDbContext.Movies (Lọc DeletedAt == null)
      │
      ▼ (DB)
PostgreSQL ──► Trả danh sách Movies + Genres ──► Hiển thị lên lưới phim (Home.jsx)
```

- **Điểm chốt kỹ thuật:**
  - `Movies` và `Cinemas` áp dụng cơ chế **Xóa mềm (Soft Delete)**: `deleted_at IS NULL`.
  - Dev A phụ trách toàn bộ dữ liệu phim và thể loại.
  - Dev B phụ trách hiển thị danh sách rạp và phòng chiếu tại `Theaters.jsx`.

---

### 🌊 LUỒNG 2: XEM LỊCH & GIỮ GHẾ REAL-TIME TRÊN REDIS (DEV C)

Khách chọn suất chiếu ➔ Vào màn hình chọn ghế ➔ Giữ ghế 5 phút:

```text
[Khách Hàng] ──► Truy cập /booking/:showtimeId
      │
      ├── [Bước 1: Tải sơ đồ ghế thật]
      │   SeatMap.jsx ──( GET /api/showtimes/{id}/seats )──► ShowtimesController
      │   Backend truy vấn DB `ShowtimeSeats` ➔ Trả về danh sách 48 ghế (Thường, VIP, Couple)
      │
      └── [Bước 2: Khách click chọn tối đa 8 ghế (ví dụ: E1, E2)]
          SeatMap.jsx ──( POST /api/showtimes/{id}/hold-seats )──► ShowtimesController
          │
          ▼ (Backend - ScheduleService.cs)
          1. Kiểm tra số lượng ghế: seatIds.Count <= 8.
          2. Kiểm tra Redis: key `showtime:{id}:seat:{seatId}` đã có ai giữ chưa?
          3. Ghi vào Redis: Key tạm thời kèm thời hạn tự hủy đúng 5 phút (TTL 300s).
          4. Tính giá vé: BasePrice của suất chiếu + ExtraPrice của loại ghế.
          │
          ▼ (Response)
          Trả về: { holdToken, heldSeats, totalHoldPrice: 190000, expiresAt }
          FE bật đồng hồ đếm ngược 5:00 phút trên màn hình!
```

- **Điểm chốt kỹ thuật:**
  - **Tuyệt đối không ghi DB ở bước này.** Toàn bộ việc giữ ghế 5 phút diễn ra trên Redis để tránh nghẽn ghi khi hàng trăm người cùng tranh ghế hot.
  - Sau 5 phút, Redis tự động xóa key, ghế tự động nhả cho người khác chọn.

---

### 🌊 LUỒNG 3: CHỌN BẮP NƯỚC, TẠO ĐƠN & GIAO DỊCH DATABASE (DEV D)

Khách chọn bắp nước, xem tổng tiền và bấm nút "Tiến Hành Đặt Vé":

```text
[Khách Hàng] ──► Tại BookingSummary.jsx (Dev D)
      │
      ├── Load menu bắp nước: GET /api/cinemas/{id}/snacks (Dev D)
      │
      └── Khách bấm "Đặt Vé" (Gửi holdToken nhận từ Dev C + danh sách snack)
          POST /api/bookings ──► BookingsController
          │
          ▼ (Backend - BookingService.cs mở DATABASE TRANSACTION)
          ├── 1. Xác thực `holdToken` còn hạn trong Redis không? (Nếu hết hạn: 400 Bad Request)
          ├── 2. Khóa ghế chính thức: UPDATE ShowtimeSeats SET status = 'reserved'
          ├── 3. Tạo bản ghi: INSERT INTO Bookings (status = 'pending', booking_code = 'BK-...')
          ├── 4. Sinh vé điện tử: INSERT INTO Tickets (cho từng ghế, gắn showtime_seat_id)
          ├── 5. Thêm bắp nước: INSERT INTO BookingSnacks
          ├── 6. Tạo giao dịch chờ: INSERT INTO Payments (status = 'pending')
          ├── 7. COMMIT TRANSACTION trong PostgreSQL!
          └── 8. Xóa key giữ ghế tạm thời trong Redis.
          │
          ▼ (Response)
          Trả về: 200 OK { bookingId, bookingCode: 'BK-89421A', totalAmount: 290000 }
```

- **Điểm chốt kỹ thuật:**
  - Công thức tính tiền bất biến: `totalAmount = totalHoldPrice + sum(snack.price * qty)`.
  - Toàn bộ bước này được bọc trong **PostgreSQL ACID Transaction**. Nếu bất kỳ bước nào lỗi (ví dụ lỗi sinh vé), toàn bộ sẽ Rollback, ghế không bị mất.

---

### 🌊 LUỒNG 4: THANH TOÁN ONLINE & XỬ LÝ WEBHOOK CALLBACK (DEV E)

Khách chuyển sang cổng MoMo / VNPay Sandbox và nhận kết quả vé:

```text
[Khách Hàng] ──► Bấm thanh toán MoMo
      │
      ▼
Client ──( POST /api/payments/create-url )──► PaymentsController (Dev E)
Backend sinh URL thanh toán MoMo Sandbox ➔ Redirect khách sang quét mã MoMo
      │
      ▼
Khách quét mã thành công trên App MoMo Sandbox (SĐT: 0968143221 | OTP: 000000)
      │
      ▼ (Cổng MoMo gọi Webhook ngầm về máy chủ)
MoMo Server ──( POST /api/payments/callback )──► PaymentsController
      │
      ▼ (PaymentService.cs xác thực)
Kiểm tra chữ ký số HMAC-SHA256:
├── NẾU THÀNH CÔNG:
│   ├── UPDATE Payments SET status = 'success', paid_at = now()
│   ├── UPDATE Bookings SET status = 'success'
│   └── Hoàn tất! Khách vào /profile xem danh sách vé đã đặt.
│
└── NẾU THẤT BẠI / HỦY THANH TOÁN:
    ├── UPDATE Payments SET status = 'failed'
    ├── UPDATE Bookings SET status = 'cancelled'
    └── Gọi helper `ReleaseSeatsAsync` (Dev C) để rollback ghế:
        UPDATE ShowtimeSeats SET status = 'available'
```

---

### 🌊 LUỒNG 5: HỦY ĐƠN TỰ ĐỘNG BẰNG BACKGROUND JOB (DEV D & DEV C)

Xử lý trường hợp khách bấm đặt vé nhưng bỏ dở không chịu quét mã MoMo:

```text
Job: ExpireStalePendingBookings (Dev D chủ trì)
│ (Chạy định kỳ mỗi 1 - 2 phút)
▼
1. Quét Database: Tìm các đơn Bookings có status == 'pending' VÀ tạo quá 10 phút trước.
2. Với mỗi đơn hết hạn:
   ├── Gán Bookings.status = 'cancelled'.
   └── Gọi helper `ScheduleService.ReleaseSeatsAsync(showtimeSeatIds)` (Dev C)
       ➔ Trả các ghế liên quan về trạng thái 'available'.
3. Giải phóng hoàn toàn kho ghế cho người dùng khác đặt vé!
```

---

## 📊 3. MA TRẬN PHÂN CÔNG & QUẢN LÝ CHO TECH LEAD

| Dev | Phân Hệ Chính | Các Bảng DB Sở Hữu | Backend Service & Controller | Frontend Hooks & Pages |
|:---:|---|---|---|---|
| **Dev A** | **Phim & Nghệ thuật** | `Movies`, `Genres`, `MovieGenres`, `Directors`, `MovieDirectors`, `Actors`, `MovieActors` | `MovieService.cs`<br>`MoviesController.cs` | `useMovies.js`<br>• `Home.jsx`<br>• `Movies.jsx`<br>• `MovieDetail.jsx`<br>• `admin/AdminMovies.jsx` |
| **Dev B** | **Rạp & Phòng chiếu** | `Cinemas`, `Auditoriums`, `SeatTypes`, `Seats` | `CinemaService.cs`<br>`CinemasController.cs` | `useCinemas.js`<br>• `Theaters.jsx`<br>• `admin/AdminCinemas.jsx` |
| **Dev C** | **Lịch chiếu & Giữ ghế** | `Showtimes`, `ShowtimeSeats` | `ScheduleService.cs`<br>`ShowtimesController.cs` | `useShowtimes.js`<br>• `Releases.jsx`<br>• `SeatMap.jsx`<br>• `admin/AdminShowtimes.jsx` |
| **Dev D** | **Đặt vé & Bắp nước** | `Bookings`, `Tickets`, `Snacks`, `CinemaSnacks`, `BookingSnacks` | `BookingService.cs`<br>`BookingsController.cs`<br>`SnacksController.cs` | `useBookings.js`, `useSnacks.js`<br>• `BookingSummary.jsx`<br>• `BookingHistoryTab.jsx`<br>• `admin/AdminSnacks.jsx` |
| **Dev E** | **Auth, Thanh toán & Dashboard** | `Users`, `Roles`, `UserRoles`, `Payments` | `AuthService.cs`<br>`PaymentService.cs`<br>`AuthController.cs`<br>`PaymentsController.cs`<br>`ReportsController.cs` | `useAccount.js`, `usePayments.js`<br>• Modal Login/Register<br>• `AccountTab.jsx`<br>• `PaymentCallback.jsx`<br>• `admin/AdminUsers.jsx`<br>• `admin/Dashboard.jsx` |

---

## 📋 4. CHECKLIST DÀNH CHO TECH LEAD ĐIỀU PHỐI HÀNG TUẦN

### Giai đoạn Tuần 1: Khởi động nền tảng (Foundation Read APIs & Auth)
- [ ] Kiểm tra cả 5 Dev đã clone nhánh `dev` về máy cá nhân.
- [ ] Xác nhận Dev A, B, C, D hoàn thành các API `GET` và gọi thử từ Swagger / Postman.
- [ ] Xác nhận Dev E hoàn thành API `Register` / `Login`, test sinh token JWT thành công.
- [ ] Kiểm tra 4 file component con (`SeatMap`, `BookingSummary`, `AccountTab`, `BookingHistoryTab`) được giữ nguyên vị trí, không ai sửa đè file cha.

### Giai đoạn Tuần 2 - 3: Lắp ghép nghiệp vụ lõi (Hold Redis & Checkout Transaction)
- [ ] Bật container Redis (`docker compose up -d redis`).
- [ ] Kiểm tra Hợp đồng `holdToken`: Dev C trả về đúng JSON format, Dev D nhận đúng `holdToken` để tạo đơn.
- [ ] Kiểm tra Database Transaction của Dev D: Thử cố tình tạo lỗi khi lưu vé xem DB có rollback nhả ghế không.

### Giai đoạn Tuần 4 - 5: Thanh toán, Báo cáo & Đóng gói (Polish & Release)
- [ ] Dev E tích hợp MoMo Sandbox, test thanh toán bằng app MoMo Developer.
- [ ] Kích hoạt Background Job `ExpireStalePendingBookings` của Dev D để tự hủy đơn rác.
- [ ] Dev E ghép 2 API báo cáo của Dev A (`top-movies`) và Dev B (`occupancy-rates`) lên `Dashboard.jsx`.
- [ ] Chạy kiểm thử toàn diện: `dotnet build` phía Backend và `npm run build` phía Frontend để đảm bảo 0 lỗi.
