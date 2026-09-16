# 🗺️ Sơ Đồ Cấu Trúc Toàn Bộ API & Route Frontend (Project Cinema2)

Tài liệu này tổng hợp toàn bộ các API Endpoints, Contract giữa các phân hệ, Background Jobs và Route Frontend sẽ được triển khai trong hệ thống Cinema Booking, phân chia cụ thể theo 5 Dev (Dev A, B, C, D, E) và phân tầng truy cập (Public, Customer, Staff, Admin).

---

## 📊 1. TỔNG QUAN HỆ THỐNG API VÀ PHÂN QUYỀN TRUY CẬP

```text
/api
├── /auth                     (Dev E) ──► Đăng ký, Đăng nhập, Cấp JWT Token
├── /users                    (Dev E) ──► Quản lý thông tin tài khoản & danh sách User (Admin)
├── /payments                 (Dev E) ──► Tạo URL VNPay/MoMo, Webhook IPN Callback
├── /reports/revenue          (Dev E) ──► Báo cáo tổng doanh thu thanh toán
│
├── /movies                   (Dev A) ──► Danh sách phim, Chi tiết phim, Phim hot
├── /genres                   (Dev A) ──► Danh mục Thể loại phim
├── /directors                (Dev A) ──► Danh mục & Chi tiết Đạo diễn
├── /actors                   (Dev A) ──► Danh mục & Chi tiết Diễn viên
├── /reports/top-movies       (Dev A) ──► Báo cáo Top phim doanh thu cao nhất
│
├── /cinemas                  (Dev B) ──► Cụm rạp, Phòng chiếu, Menu rạp
├── /auditoriums              (Dev B) ──► Phòng chiếu & Sơ đồ ghế vật lý mẫu
├── /seat-types               (Dev B) ──► Loại ghế (Standard, VIP, Couple)
├── /reports/occupancy        (Dev B) ──► Báo cáo tỷ lệ lấp đầy ghế theo rạp
│
├── /showtimes                (Dev C) ──► Lập lịch chiếu (Admin), Hủy suất chiếu
├── /showtimes/{id}/seats     (Dev C) ──► Sơ đồ ghế suất chiếu real-time
├── /showtimes/{id}/hold-seats (Dev C) ──► Real-time Seat Hold Engine (Redis TTL 5m)
│
├── /snacks                   (Dev D) ──► Danh mục Bắp nước master & Menu rạp
├── /bookings                 (Dev D) ──► Luồng Đặt vé Transaction DB, Lịch sử đặt vé, Hủy đơn pending
└── /tickets                  (Dev D) ──► Xuất vé điện tử, Sinh mã QR Code, Soát vé Staff
```

---

## 📂 2. CHI TIẾT ENDPOINTS THEO TỪNG LẬP TRÌNH VIÊN

### 👤 DEV A: PHÂN HỆ PHIM & NGHỆ THUẬT (MOVIES & ARTS)

| Phương Thức | Endpoint URL | Quyền Hạn | Chức Năng Nghiệp Vụ |
|:---:|---|:---:|---|
| `GET` | `/api/movies` | **Public** | Lấy danh sách phim (lọc `status=now_showing/coming_soon`, tìm kiếm, phân trang) |
| `GET` | `/api/movies/{id}` | **Public** | Chi tiết phim (kèm danh sách `Genres`, `Directors`, `Actors`) |
| `POST` | `/api/movies` | **Admin** | Thêm phim mới (kèm upload poster, backdrop) |
| `PUT` | `/api/movies/{id}` | **Admin** | Cập nhật thông tin phim |
| `DELETE` | `/api/movies/{id}` | **Admin** | Soft delete phim (`deleted_at = now()`) |
| `GET` | `/api/genres` | **Public** | Lấy danh sách 12 thể loại phim |
| `GET` | `/api/directors` | **Public** | Danh sách đạo diễn |
| `GET` | `/api/directors/{id}` | **Public** | Chi tiết đạo diễn & các phim đã làm |
| `GET` | `/api/actors` | **Public** | Danh sách diễn viên |
| `GET` | `/api/actors/{id}` | **Public** | Chi tiết diễn viên & các phim đã đóng |
| `GET` | `/api/reports/top-movies` | **Admin** | Báo cáo Top 10 phim có doanh thu cao nhất |

---

### 👤 DEV B: PHÂN HỆ CỤM RẠP & GHẾ VẬT LÝ (CINEMAS & PHYSICAL SEATS)

| Phương Thức | Endpoint URL | Quyền Hạn | Chức Năng Nghiệp Vụ |
|:---:|---|:---:|---|
| `GET` | `/api/cinemas` | **Public** | Lấy danh sách cụm rạp (lọc theo tỉnh/thành phố `city`) |
| `GET` | `/api/cinemas/{id}` | **Public** | Chi tiết cụm rạp & danh sách các phòng chiếu (`Auditoriums`) |
| `POST` | `/api/cinemas` | **Admin** | Thêm cụm rạp mới |
| `PUT` | `/api/cinemas/{id}` | **Admin** | Cập nhật thông tin cụm rạp |
| `DELETE` | `/api/cinemas/{id}` | **Admin** | Soft delete cụm rạp (Trigger tự động cascade xóa phòng chiếu) |
| `GET` | `/api/auditoriums/{id}/seats` | **Public** | Lấy sơ đồ ma trận ghế vật lý mẫu của 1 phòng chiếu |
| `POST` | `/api/auditoriums` | **Admin** | Thêm phòng chiếu mới & sinh tự động ma trận ghế vật lý |
| `GET` | `/api/seat-types` | **Public** | Lấy danh mục loại ghế (Standard, VIP, Couple) & phụ thu giá |
| `GET` | `/api/reports/occupancy-rates` | **Admin** | Báo cáo tỷ lệ lấp đầy ghế theo từng cụm rạp |

---

### 👤 DEV C: PHÂN HỆ LỊCH CHIẾU & ENGINE GHẾ SUẤT CHIẾU (SHOWTIMES & SEAT HOLD ENGINE)

| Phương Thức | Endpoint URL | Quyền Hạn | Chức Năng Nghiệp Vụ |
|:---:|---|:---:|---|
| `GET` | `/api/showtimes` | **Public** | Tra cứu lịch chiếu (Query params: `movieId`, `cinemaId`, `date`) |
| `GET` | `/api/showtimes/{id}` | **Public** | Chi tiết 1 suất chiếu (phim, phòng chiếu, giờ chiếu, base_price) |
| `GET` | `/api/showtimes/{id}/seats` | **Public** | **Core API:** Lấy sơ đồ ghế động thực tế của suất chiếu (status `available`/`reserved`/`locked`, giá vé) |
| `POST` | `/api/showtimes/{id}/hold-seats` | **Customer** | **Real-time Seat Hold:** Tạm giữ ghế 5 phút trong Redis (Validation: tối đa 8 ghế/lần hold), trả về `holdToken` + `heldSeats` (breakdown giá) + `totalHoldPrice` cho UI |
| `DELETE` | `/api/showtimes/{id}/hold-seats/{holdToken}` | **Customer** | Hủy tạm giữ ghế trong Redis trước khi hết 5 phút |
| `POST` | `/api/showtimes` | **Admin** | Tạo suất chiếu mới (tự động sao chép ghế vật lý sang `ShowtimeSeats` với status `available`) |
| `PUT` | `/api/showtimes/{id}/cancel` | **Admin** | Hủy suất chiếu (`status = 'cancelled'`) — *Không xóa cứng record DB* |

---

### 👤 DEV D: PHÂN HỆ ĐẶT VÉ & BẮP NƯỚC (BOOKINGS, SNACKS & BACKGROUND JOBS)

| Phương Thức | Endpoint URL | Quyền Hạn | Chức Năng Nghiệp Vụ |
|:---:|---|:---:|---|
| `GET` | `/api/snacks` | **Public** | Danh mục bắp nước master |
| `GET` | `/api/cinemas/{cinemaId}/snacks` | **Public** | Menu bắp nước và giá đang kinh doanh tại cụm rạp đã chọn |
| `POST` | `/api/cinemas/{cinemaId}/snacks` | **Admin** | Cấu hình giá và danh mục bắp nước cho rạp |
| `POST` | `/api/bookings` | **Customer** | **Core Transaction API:** Bắt buộc nhận `holdToken` từ Dev C -> Kiểm tra hợp lệ -> Khóa ghế `reserved` DB -> Tạo đơn hàng `pending` -> Sinh vé `Tickets` |
| `GET` | `/api/bookings/{id}` | **Customer** | Chi tiết đơn đặt vé (kèm danh sách ghế và bắp nước) |
| `GET` | `/api/bookings/my-bookings` | **Customer** | Lịch sử tất cả các đơn đặt vé của người dùng hiện tại |
| `PUT` | `/api/bookings/{id}/cancel` | **Customer** | Hủy đơn đặt vé khi còn ở trạng thái `pending` (gọi helper nhả ghế của Dev C) |
| `GET` | `/api/tickets/{id}/qr` | **Customer** | Lấy thông tin vé điện tử & mã QR Code để lưu vào profile |
| `JOB` | `ExpireStalePendingBookings` | **Background Job** | **Chủ trì bởi Dev D (Dev C hỗ trợ nhả ghế):** Quét 1 phút/lần để hủy đơn `Bookings` quá 10 phút `pending` và gọi `ScheduleService.ReleaseSeatsAsync` của Dev C |

---

### 👤 DEV E: PHÂN HỆ AUTH, SECURITY & THANH TOÁN (AUTH & PAYMENTS)

| Phương Thức | Endpoint URL | Quyền Hạn | Chức Năng Nghiệp Vụ |
|:---:|---|:---:|---|
| `POST` | `/api/auth/register` | **Public** | Đăng ký tài khoản mới (Hash mật khẩu `PasswordHasher<User>`, cấp quyền Customer) |
| `POST` | `/api/auth/login` | **Public** | Đăng nhập Email/Password -> Trả chuỗi JWT Token |
| `GET` | `/api/auth/me` | **Customer** | Lấy thông tin profile người dùng đang đăng nhập từ Token Claims |
| `PUT` | `/api/users/profile` | **Customer** | Cập nhật thông tin cá nhân (Họ tên, số điện thoại, avatar) |
| `PUT` | `/api/users/change-password` | **Customer** | Đổi mật khẩu tài khoản (`PasswordHasher<User>`) |
| `GET` | `/api/users` | **Admin** | Quản lý danh sách người dùng hệ thống (Khách hàng, Nhân viên, Admin) |
| `POST` | `/api/payments/create-url` | **Customer** | Sinh URL redirect sang cổng thanh toán VNPay / MoMo Sandbox |
| `POST` | `/api/payments/callback` | **Public Webhook** | **Webhook Callback API:** Tiếp nhận phản hồi từ cổng thanh toán, xác thực chữ ký HMAC-SHA256, chốt vé hoặc nhả ghế |
| `GET` | `/api/payments/{bookingId}` | **Customer** | Kiểm tra trạng thái giao dịch thanh toán của đơn hàng |
| `GET` | `/api/reports/revenue` | **Admin** | Báo cáo tổng doanh thu thanh toán theo ngày/tháng |

---

## 🤝 3. HỢP ĐỒNG DỮ LIỆU (API CONTRACT) GIỮA BƯỚC HOLD (DEV C) VÀ CHECKOUT (DEV D)

Để tránh lệch dữ liệu khi Dev C và Dev D phát triển độc lập, định dạng dữ liệu giữa 2 API được chốt cứng như sau:

### 1. Bước Hold Ghế (Dev C sở hữu API `POST /api/showtimes/{id}/hold-seats`):
* **Quy tắc Validation:** Giới hạn tối đa **8 ghế / 1 lần hold** (`seatIds.Count <= 8`) để ngăn chặn tấn công chiếm dụng toàn bộ rạp (Denial of Inventory attack).
* **Request Body:**
  ```json
  {
    "seatIds": [
      "00000006-0000-0000-0000-000000000001",
      "00000006-0000-0000-0000-000000000002"
    ]
  }
  ```
* **Response Output (Bổ sung Breakdown giá chi tiết từng ghế cho UI hiển thị ngay lập tức):**
  ```json
  {
    "holdToken": "htk-9a8b7c6d-5e4f-3a2b-1c0d-ef1234567890",
    "showtimeId": "00000008-0000-0000-0000-000000000001",
    "heldSeats": [
      {
        "seatId": "00000006-0000-0000-0000-000000000001",
        "seatCode": "E1",
        "seatType": "VIP",
        "price": 95000
      },
      {
        "seatId": "00000006-0000-0000-0000-000000000002",
        "seatCode": "E2",
        "seatType": "VIP",
        "price": 95000
      }
    ],
    "totalHoldPrice": 190000,
    "expiresAt": "2026-09-16T12:05:00Z"
  }
  ```

### 2. Bước Checkout Tạo Đơn Đặt Vé (Dev D sở hữu API `POST /api/bookings`):
* **Request Body (Bắt buộc phải truyền `holdToken` nhận từ Dev C):**
  ```json
  {
    "holdToken": "htk-9a8b7c6d-5e4f-3a2b-1c0d-ef1234567890",
    "snackItems": [
      {
        "cinemaSnackId": "0000000b-0000-0000-0000-000000000001",
        "quantity": 2
      }
    ]
  }
  ```
* **Response Output (`totalAmount` = `totalHoldPrice` từ bước Hold + Tổng tiền bắp nước):**
  ```json
  {
    "bookingId": "0000000d-0000-0000-0000-000000000001",
    "bookingCode": "BK-89421A",
    "totalAmount": 290000,
    "status": "pending",
    "createdAt": "2026-09-16T12:00:00Z"
  }
  ```
  *(📌 **Công thức tính tổng tiền bắt buộc cho Dev D:** `totalAmount = totalHoldPrice + Sum(snackItem.price * quantity)`).*

---

## 🖥️ 4. SƠ ĐỒ GIAO DIỆN FRONTEND & PHÂN CÔNG UI CHO 5 DEV (FULLSTACK OWNERSHIP)

### A. CLIENT PORTAL (Giao Diện Khách Hàng)

| Route Trang Client | Phụ Trách UI Chính | APIs Kết Nối Phía Backend | Chức Năng Giao Diện |
|---|:---:|---|---|
| `/` | **Dev A** | `GET /api/movies?status=now_showing`, `GET /api/cinemas` (Dev B) | Trang chủ (Banner Carousel 9 phim, bộ lọc rạp) |
| `/movie/:id` | **Dev A** | `GET /api/movies/{id}`, `GET /api/showtimes` (Dev C) | Chi tiết phim (Trailer, Diễn viên, Đạo diễn, Lịch chiếu) |
| `/cinemas` | **Dev B** | `GET /api/cinemas`, `GET /api/cinemas/{id}` | Danh sách cụm rạp theo khu vực & Chi tiết phòng chiếu |
| `/booking/:showtimeId` | **Dev C & Dev D** | • **Dev C (Sơ đồ ghế):** `GET /api/showtimes/{id}/seats`, `POST /api/showtimes/{id}/hold-seats`<br>• **Dev D (Checkout):** `GET /api/cinemas/{id}/snacks`, `POST /api/bookings` | **Màn hình cốt lõi:** Chọn ghế 3D dynamic (hiển thị ngay tổng tiền & đếm ngược 5 phút) + Chọn bắp nước + Bấm Đặt vé |
| `/payment/callback` | **Dev E & Dev D** | `POST /api/payments/callback` (Dev E), `GET /api/tickets/{id}/qr` (Dev D) | Kết quả thanh toán & Hiển thị mã QR Code vé điện tử |
| `/profile` | **Dev E & Dev D** | `PUT /api/users/profile` (Dev E), `GET /api/bookings/my-bookings` (Dev D) | Đổi mật khẩu/thông tin cá nhân & Xem Lịch sử đặt vé |

---

### B. ADMIN PORTAL (Giao Diện Quản Trị Viên)

| Route Trang Admin | Phụ Trách UI | APIs Kết Nối Phía Backend | Ghi Chú Phụ Thuộc (Dependency) |
|---|:---:|---|---|
| `/admin/dashboard` | **Dev E** | `GET /api/reports/revenue`, `GET /api/reports/top-movies` (Dev A), `GET /api/reports/occupancy-rates` (Dev B) | **⚠️ Dependency:** Dev E làm Dashboard ở Tuần 5 sau khi Dev A và Dev B xong API Báo cáo ở Tuần 4 |
| `/admin/movies` | **Dev A** | `POST /api/movies`, `PUT /api/movies/{id}`, `DELETE /api/movies/{id}` | Độc lập (Dev A tự làm cả FE lẫn BE) |
| `/admin/cinemas` | **Dev B** | `POST /api/cinemas`, `POST /api/auditoriums`, `GET /api/auditoriums/{id}/seats` | Độc lập (Dev B tự làm cả FE lẫn BE) |
| `/admin/showtimes` | **Dev C** | `POST /api/showtimes`, `PUT /api/showtimes/{id}/cancel` | Độc lập (Dev C tự làm cả FE lẫn BE) |
| `/admin/snacks` | **Dev D** | `POST /api/cinemas/{cinemaId}/snacks`, `GET /api/snacks` | Độc lập (Dev D tự làm cả FE lẫn BE) |
| `/admin/users` | **Dev E** | `GET /api/users` | Độc lập |
