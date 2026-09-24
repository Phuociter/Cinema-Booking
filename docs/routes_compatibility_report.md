# 🔍 BÁO CÁO ĐỐI SOÁT KIẾN TRÚC & PHÂN TÍCH ĐỘ LỆCH (GAP ANALYSIS)
## HỆ THỐNG ĐẶT VÉ XEM PHIM: DATABASE ↔ BACKEND API ↔ FRONTEND APP

> **Phương pháp kiểm tra:** Quét và đối chiếu trực tiếp giữa mã nguồn thực tế tại kho lưu trữ (`movie_booking_schema.sql`, `cinema2/Frontend/src/App.jsx`, `cinema2/Frontend/src/pages/SeatLayout.jsx`, `cinema2/Frontend/package.json`) với tài liệu thiết kế kiến trúc [backend_api_routes_map.md](file:///d:/cinema/cinema2/docs/backend_api_routes_map.md) và [frontend_routes_and_api_map.md](file:///d:/cinema/cinema2/docs/frontend_routes_and_api_map.md).

---

## 📊 1. BẢNG TỔNG HỢP HIỆN TRẠNG TƯƠNG THÍCH

| Tầng Hệ Thống | Hiện Trạng Kiểm Tra Thực Tế | Đánh Giá | Tình Trạng Kỹ Thuật |
|---|---|:---:|---|
| **1. Database (PostgreSQL 16)** | Container `cinema-postgres` đã nạp đủ 22 bảng, 38.400 bản ghi seed. Khớp toàn bộ UUID PK/FK và phân quyền 5 Devs. | 🟢 **PASS (100%)** | Đã sẵn sàng phục vụ Backend. |
| **2. Backend API Contracts** | Hợp đồng kỹ thuật Hold ↔ Checkout (`holdToken`), Redis TTL 5m, Max 8 ghế, Background Job và phân định 5 Devs đã chốt cứng. | 🟢 **PASS (100%)** | Đã ban hành Hợp đồng kỹ thuật chính thức. |
| **3. Frontend Code Thực Tế (`cinema2/Frontend`)** | Định tuyến `App.jsx` đã chuẩn hóa xong. UI components vẫn đang dùng mock data, các file hook `src/api/` chưa viết logic, chưa cài `axios`. | 🟡 **ĐÃ CẤU HÌNH ROUTE (CẦN CODE LOGIC)** | **Cần kết nối API thật & thay mock data.** |

---

## 🗄️ 2. CHI TIẾT TẦNG DATABASE: 🟢 PASS (100% TƯƠNG THÍCH)

- **Đồng bộ khóa chính/ngoại:** 100% Primary Key và Foreign Key dùng kiểu `UUID`, tương thích hoàn hảo với kiểu `Guid` trong C# Web API và chuỗi UUID trong Frontend.
- **Ranh giới sở hữu (Ownership) 5 Devs:**
  - **Dev A (Phim & Nghệ thuật):** `Movies`, `Genres`, `MovieGenres`, `Directors`, `MovieDirectors`, `Actors`, `MovieActors`.
  - **Dev B (Rạp & Phòng chiếu):** `Cinemas`, `Auditoriums`, `SeatTypes`, `Seats`.
  - **Dev C (Lịch chiếu & Ghế động):** `Showtimes`, `ShowtimeSeats`.
  - **Dev D (Đặt vé & Bắp nước):** `Bookings`, `Tickets`, `Snacks`, `CinemaSnacks`, `BookingSnacks`.
  - **Dev E (Người dùng & Thanh toán):** `Users`, `Roles`, `UserRoles`, `Payments`.
- **Logic trạng thái & Xóa (Khớp 100% `movie_booking_schema.sql`):**
  - Danh mục dùng Soft Delete (`deleted_at IS NULL`): `Movies`, `Cinemas`, `Auditoriums`, `Seats`, `Snacks`, `CinemaSnacks`, `SeatTypes`.
  - Giao dịch dùng `status`, không bao giờ xóa cứng:
    - `Showtimes.status`: `'scheduled'`, `'cancelled'`, `'completed'`.
    - `Bookings.status`: `'pending'`, `'success'`, `'cancelled'` *(chuẩn schema gốc, không dùng `confirmed`)*.
    - `ShowtimeSeats.status`: **Duy nhất 2 trạng thái bền vững trong DB là `'available'` và `'reserved'`**. Trạng thái giữ chỗ tạm thời (`locked`) được lưu 100% trong Redis (TTL 5 phút), tuyệt đối không lưu Postgres nhằm triệt tiêu nghẽn ghi (write contention).

---

## ⚙️ 3. CHI TIẾT TẦNG BACKEND CONTRACTS: 🟢 PASS (100% TƯƠNG THÍCH)

- **Hợp đồng Hold-Seats (Dev C) ↔ Checkout (Dev D):**
  - Giữ ghế qua `POST /api/showtimes/{id}/hold-seats`: Nhận danh sách ghế (Validation: 1 đến tối đa 8 ghế/lần hold), lưu Redis cache với TTL 5 phút, trả về `holdToken` kèm chi tiết giá từng ghế (`heldSeats: [{ seatId, seatCode, seatType, price }]`) và `totalHoldPrice`.
  - Đặt vé qua `POST /api/bookings`: Nhận `holdToken` và `snackItems: []`, kiểm tra tính hợp lệ của token trong Redis, tính tổng tiền nhất quán: `totalAmount = totalHoldPrice + sum(snack.price * qty)`.
- **Background Job giải phóng đơn hết hạn:**
  - `ExpireStalePendingBookings` do **Dev D chủ trì**, quét đơn `pending` quá 10 - 15 phút để chuyển trạng thái `cancelled`.
  - Dev D gọi phương thức dùng chung `ReleaseSeatsAsync` do **Dev C phụ trách** để hoàn trả ghế về `available`.
- **Danh mục Admin APIs chính thức (6 phân hệ quản trị):**
  - `/admin/dashboard`: `GET /api/reports/revenue` (Dev E), `GET /api/reports/top-movies` (Dev A), `GET /api/reports/occupancy-rates` (Dev B).
  - `/admin/movies`: `POST /api/movies`, `PUT /api/movies/{id}`, `DELETE /api/movies/{id}` (Dev A).
  - `/admin/cinemas`: `POST /api/cinemas`, `POST /api/auditoriums`, `GET /api/auditoriums/{id}/seats` (Dev B).
  - `/admin/showtimes`: `POST /api/showtimes`, `PUT /api/showtimes/{id}/cancel` (Dev C).
  - `/admin/snacks`: `POST /api/cinemas/{cinemaId}/snacks`, `GET /api/snacks` (Dev D).
  - `/admin/users`: `GET /api/users` (Dev E).

---

## 🖥️ 4. BẢNG ĐỐI SOÁT HIỆN TRẠNG FRONTEND (`src/App.jsx` & UI)

### 4.1. Tình trạng Định tuyến trong `src/App.jsx` (Đã chuẩn hóa hoàn tất)

| Route Chuẩn Kiến Trúc | Component Đang Render | Trạng Thái Định Tuyến | Ghi Chú Kỹ Thuật |
|---|---|:---:|---|
| `/` | `pages/Home.jsx` | 🟢 **Khớp** | Trang chủ hiển thị banner, phim hot, trailer. |
| `/movies` | `pages/Movies.jsx` | 🟢 **Khớp** | Danh mục toàn bộ phim, tìm kiếm & bộ lọc thể loại. |
| `/movie/:id` | `pages/MovieDetail.jsx` | 🟢 **Khớp** | Chi tiết phim (kèm route fallback `/movies/:id`). |
| `/cinemas` | `pages/Theaters.jsx` | 🟢 **Khớp** | Cụm rạp & suất chiếu (kèm route fallback `/theaters`). |
| `/booking/:showtimeId` | `pages/SeatLayout.jsx` | 🟢 **Khớp** | Chọn ghế & đặt vé (kèm route fallback `/movies/book/...`). |
| `/releases` | `pages/Releases.jsx` | 🟢 **Khớp** | Lịch chiếu phim theo ngày. |
| `/favorites` | `pages/Favorite.jsx` | 🟢 **Khớp** | Danh sách phim yêu thích. |
| `/profile` | `pages/Profile.jsx` | 🟢 **Khớp** | Trang cá nhân & xem vé đã đặt (kèm route fallback `/my-booking`). |
| `/payment/callback` | `pages/PaymentCallback.jsx` | 🟢 **Khớp** | Tiếp nhận kết quả thanh toán MoMo / VNPay Sandbox. |
| `/admin/dashboard` | `pages/admin/Dashboard.jsx` | 🟢 **Khớp** | Trung tâm điều hành chỉ số & doanh thu. |
| `/admin/movies` | `pages/admin/AdminMovies.jsx` | 🟢 **Khớp** | Quản lý danh mục phim (Dev A). |
| `/admin/cinemas` | `pages/admin/AdminCinemas.jsx` | 🟢 **Khớp** | Quản lý rạp và phòng chiếu (Dev B). |
| `/admin/showtimes` | `pages/admin/AdminShowtimes.jsx` | 🟢 **Khớp** | Xếp lịch chiếu phim (Dev C). |
| `/admin/snacks` | `pages/admin/AdminSnacks.jsx` | 🟢 **Khớp** | Cấu hình danh mục bắp nước từng rạp (Dev D). |
| `/admin/users` | `pages/admin/AdminUsers.jsx` | 🟢 **Khớp** | Quản lý tài khoản và phân quyền (Dev E). |

> **📌 Ghi chú kiến trúc về phạm vi nghiệp vụ dự án:**
> Hệ thống tập trung 100% vào **Website Đặt Vé Xem Phim Trực Tuyến**, chủ động **loại bỏ tính năng máy quét vé tại rạp (`/staff/checkin`)**:
> 1. Khách hàng sau khi thanh toán thành công sẽ lưu và xem thông tin vé trực tiếp trên trang `/profile`.
> 2. Đơn hàng quá hạn thanh toán (`pending`) được Background Job `ExpireStalePendingBookings` tự động xử lý giải phóng ghế.
> 3. Không phát sinh vai trò `Staff`, đơn giản hóa mô hình bảo mật chỉ gồm `Customer` và `Admin`.

### 4.2. Độ lệch về Tầng Dữ liệu & UI Component (`src/pages/SeatLayout.jsx`)

- **Hiện trạng mã nguồn thực tế:**
  - `SeatLayout.jsx` đang nạp dữ liệu giả lập từ biến `dummyShowsData` (10 hàng x 14 ghế = 140 ghế, giá 100k).
- **Yêu cầu kỹ thuật cần làm:**
  - Gỡ bỏ hoàn toàn `dummyShowsData`.
  - Đấu nối API `GET /api/showtimes/{showtimeId}/seats` của Dev C để render lưới ghế thực tế từ Database (6 hàng x 8 cột = 48 ghế).
  - Tích hợp gọi API `POST /api/showtimes/{showtimeId}/hold-seats` khi chọn ghế để nhận `holdToken` và đếm ngược thời gian giữ ghế 5 phút.

### 4.3. Độ lệch về Tầng Giao tiếp API (`src/api/` & Dependencies)

- **Dependencies (`package.json`):** Thư viện mạng `axios` **chưa được cài đặt**.
- **Mã nguồn trong `src/api/`:** Hiện chỉ có các file khung rỗng (skeleton) và file `axiosInstance.js`. Cần 5 Dev bắt tay viết các hàm nghiệp vụ.

---

## 🛠️ 5. KẾ HOẠCH HÀNH ĐỘNG TIẾP THEO

1. **Cài đặt thư viện mạng:** Chạy lệnh `npm install axios` tại `cinema2/Frontend`.
2. **Phân công 5 Dev triển khai hàm gọi API vào thư mục `src/api/`:**
   - **Dev A:** `useMovies.js`
   - **Dev B:** `useCinemas.js`
   - **Dev C:** `useShowtimes.js`
   - **Dev D:** `useBookings.js`, `useSnacks.js`
   - **Dev E:** `useAccount.js`, `usePayments.js`, `useAdminDashboard.js`
3. **Thay thế Mock Data trong các trang UI:**
   - Thay mock data trong `Home.jsx`, `MovieDetail.jsx`, `Theaters.jsx`, `SeatLayout.jsx` bằng các hooks trong `src/api/`.
