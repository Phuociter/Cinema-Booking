# 🗺️ Sơ Đồ Cấu Trúc Routes Frontend & Phân Hệ API Client (Project Cinema2)

Tài liệu này chuẩn hóa toàn bộ cấu trúc thư mục gọi API phía Frontend (`cinema2/Frontend/src/api/`), phân chia quyền sở hữu file độc lập cho 5 Dev (tương tự mô hình ảnh mẫu) và bảng ánh xạ giữa Route giao diện với các hàm API Backend tương ứng.

---

## 📁 1. CẤU TRÚC THƯ MỤC API PHÍA FRONTEND (`src/api/`)

Toàn bộ các cuộc gọi API qua mạng từ ứng dụng React đều được đóng gói tập trung vào thư mục `src/api/`, chia theo từng Domain chuyên biệt. **Tuyệt đối không gọi axios tự do rải rác trong các Component.**

```text
cinema2/Frontend/src/api/
├── axiosInstance.js       ──► Cấu hình Axios Base URL, JWT Bearer Interceptor & Xử lý lỗi
├── index.js               ──► File barrel export toàn bộ API modules
│
├── useAccount.js          (Dev E) ──► Đăng ký, Đăng nhập, Profile, Đổi mật khẩu, Quản lý Users
├── useMovies.js           (Dev A) ──► Danh sách Phim, Chi tiết Phim, Thể loại, Đạo diễn, Diễn viên, Top Phim
├── useCinemas.js          (Dev B) ──► Cụm rạp, Phòng chiếu, Sơ đồ ghế mẫu, Loại ghế, Tỷ lệ lấp đầy
├── useShowtimes.js        (Dev C) ──► Tra cứu lịch chiếu, Sơ đồ ghế dynamic, Tạm giữ ghế 5p (Redis)
├── useBookings.js         (Dev D) ──► Đặt vé (Transaction DB), Lịch sử đặt vé, Hủy đơn, Xuất vé QR
├── useSnacks.js           (Dev D) ──► Danh mục bắp nước master & Menu bắp nước theo từng rạp
├── usePayments.js         (Dev E) ──► Tạo URL MoMo/VNPay Sandbox, Kiểm tra trạng thái thanh toán
└── useAdminDashboard.js   (Dev E) ──► Tổng hợp dữ liệu biểu đồ báo cáo cho trang Admin Dashboard
```

---

## 👥 2. QUY TẮC PHÂN CÔNG SỞ HỮU FILE API CHO 5 DEV (STRICT OWNERSHIP)

Mỗi Dev chỉ được phép viết code và bảo trì file API thuộc phân hệ của mình, triệt tiêu hoàn toàn rủi ro xung đột mã nguồn (Git Conflict):

| File API Module            |     Người Sở Hữu      | Các Hàm Chức Năng Cốt Lõi                                                                                                                                        | Backend Controller Tương Ứng                                        |
| -------------------------- | :-------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **`useMovies.js`**         |       **Dev A**       | `getAllMovies`, `getMovieById`, `createMovie`, `updateMovie`, `deleteMovie`, `getGenres`, `getDirectors`, `getActors`, `getTopMoviesReport`                      | `MoviesController`, `GenresController`, `ReportsController`         |
| **`useCinemas.js`**        |       **Dev B**       | `getAllCinemas`, `getCinemaById`, `createCinema`, `updateCinema`, `deleteCinema`, `getAuditoriumSeats`, `createAuditorium`, `getSeatTypes`, `getOccupancyReport` | `CinemasController`, `AuditoriumsController`, `SeatTypesController` |
| **`useShowtimes.js`**      |       **Dev C**       | `getShowtimes`, `getShowtimeById`, `getShowtimeSeats`, `holdSeats`, `releaseHoldSeats`, `createShowtime`, `cancelShowtime`                                       | `ShowtimesController`                                               |
| **`useBookings.js`**       |       **Dev D**       | `createBooking`, `getBookingById`, `getMyBookings`, `cancelBooking`, `getTicketQr`                                                                               | `BookingsController`, `TicketsController`                           |
| **`useSnacks.js`**         |       **Dev D**       | `getAllSnacks`, `getCinemaSnacks`, `updateCinemaSnacks`                                                                                                          | `SnacksController`, `CinemaSnacksController`                        |
| **`useAccount.js`**        |       **Dev E**       | `register`, `login`, `getProfile`, `updateProfile`, `changePassword`, `getUsers`                                                                                 | `AuthController`, `UsersController`                                 |
| **`usePayments.js`**       |       **Dev E**       | `createPaymentUrl`, `getPaymentStatus`, `getRevenueReport`                                                                                                       | `PaymentsController`                                                |
| **`useAdminDashboard.js`** | **Dev E** _(Chủ trì)_ | `getDashboardMetrics` _(kết nối API của Dev A, B, E)_                                                                                                            | `ReportsController`                                                 |

---

## 🗺️ 3. BẢNG ÁNH XẠ TOÀN DIỆN (FE ROUTE ↔ COMPONENT ↔ API MODULE ↔ BACKEND)

### A. CLIENT PORTAL (Giao Diện Dành Cho Khách Hàng)

| Route URL              | Component Trang                                      | Dev Phụ Trách UI  | API Module Được Sử Dụng                                                                                                                                                                                                                           | Backend Endpoint Gọi Thực Tế                                                                                                               |
| ---------------------- | ---------------------------------------------------- | :---------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                    | `pages/Home.jsx`                                     |     **Dev A**     | `useMovies.getAllMovies`<br>`useCinemas.getAllCinemas`                                                                                                                                                                                            | `GET /api/movies?status=now_showing`<br>`GET /api/cinemas`                                                                                 |
| `/movies`              | `pages/Movies.jsx`                                   |     **Dev A**     | `useMovies.getAllMovies`<br>`useMovies.getGenres`                                                                                                                                                                                                 | `GET /api/movies`<br>`GET /api/genres`                                                                                                     |
| `/movies/:id`          | `pages/MovieDetail.jsx`                              |     **Dev A**     | `useMovies.getMovieById`<br>`useShowtimes.getShowtimes`                                                                                                                                                                                           | `GET /api/movies/{id}`<br>`GET /api/showtimes?movieId={id}`                                                                                |
| `/theaters`            | `pages/Theaters.jsx`                                 |     **Dev B**     | `useCinemas.getAllCinemas`                                                                                                                                                                                                                        | `GET /api/cinemas`                                                                                                                         |
| `/booking/:showtimeId` | `pages/SeatLayout.jsx`<br>_(Khung do Dev C quản lý)_ | **Dev C & Dev D** | • **Dev C (Sơ đồ ghế):** `components/booking/SeatMap.jsx` (`useShowtimes.getShowtimeSeats`, `holdSeats`)<br>• **Dev D (Bắp nước & Checkout):** `components/booking/BookingSummary.jsx` (`useSnacks.getCinemaSnacks`, `useBookings.createBooking`) | • `GET /api/showtimes/{id}/seats`<br>• `POST /api/showtimes/{id}/hold-seats`<br>• `GET /api/cinemas/{id}/snacks`<br>• `POST /api/bookings` |
| `/payment/callback`    | `pages/PaymentCallback.jsx`                          | **Dev E & Dev D** | `usePayments.getPaymentStatus`<br>`useBookings.getTicketQr`                                                                                                                                                                                       | `GET /api/payments/{bookingId}`<br>`GET /api/tickets/{id}/qr`                                                                              |
| `/profile`             | `pages/Profile.jsx`<br>_(Khung do Dev E quản lý)_    | **Dev E & Dev D** | • **Dev E (Tab Tài khoản):** `components/profile/AccountTab.jsx` (`useAccount.getProfile`, `updateProfile`, `changePassword`)<br>• **Dev D (Tab Vé của tôi):** `components/profile/BookingHistoryTab.jsx` (`useBookings.getMyBookings`)           | • `GET /api/auth/me`<br>• `PUT /api/users/profile`<br>• `PUT /api/users/change-password`<br>• `GET /api/bookings/my-bookings`              |

---

### B. ADMIN PORTAL (Giao Diện Dành Cho Quản Trị Viên)

| Route URL          | Component Trang                  | Dev Phụ Trách UI | API Module Được Sử Dụng                                                                                   | Backend Endpoint Gọi Thực Tế                                                                      |
| ------------------ | -------------------------------- | :--------------: | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/admin/dashboard` | `pages/admin/Dashboard.jsx`      |    **Dev E**     | `useAdminDashboard.getDashboardMetrics`                                                                   | `GET /api/reports/revenue`<br>`GET /api/reports/top-movies`<br>`GET /api/reports/occupancy-rates` |
| `/admin/movies`    | `pages/admin/AdminMovies.jsx`    |    **Dev A**     | `useMovies.getAllMovies`<br>`useMovies.createMovie`<br>`useMovies.updateMovie`<br>`useMovies.deleteMovie` | `GET /api/movies`<br>`POST /api/movies`<br>`PUT /api/movies/{id}`<br>`DELETE /api/movies/{id}`    |
| `/admin/cinemas`   | `pages/admin/AdminCinemas.jsx`   |    **Dev B**     | `useCinemas.getAllCinemas`<br>`useCinemas.createCinema`<br>`useCinemas.createAuditorium`                  | `GET /api/cinemas`<br>`POST /api/cinemas`<br>`POST /api/auditoriums`                              |
| `/admin/showtimes` | `pages/admin/AdminShowtimes.jsx` |    **Dev C**     | `useShowtimes.getShowtimes`<br>`useShowtimes.createShowtime`<br>`useShowtimes.cancelShowtime`             | `GET /api/showtimes`<br>`POST /api/showtimes`<br>`PUT /api/showtimes/{id}/cancel`                 |
| `/admin/snacks`    | `pages/admin/AdminSnacks.jsx`    |    **Dev D**     | `useSnacks.getAllSnacks`<br>`useSnacks.updateCinemaSnacks`                                                | `GET /api/snacks`<br>`POST /api/cinemas/{id}/snacks`                                              |
| `/admin/users`     | `pages/admin/AdminUsers.jsx`     |    **Dev E**     | `useAccount.getUsers`                                                                                     | `GET /api/users`                                                                                  |

---

## 💻 4. HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG CHO TEAM

### 1. Cài đặt thư viện `axios`:

Mở terminal tại thư mục `cinema2/Frontend` và chạy:

```bash
npm install axios
```

### 2. Cấu hình biến môi trường `.env` trong `Frontend`:

Thêm dòng sau vào tệp `cinema2/Frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Ví dụ cách Component gọi API chuẩn mực:

```jsx
// Ví dụ trong component MovieDetail.jsx
import React, { useEffect, useState } from "react";
import { useMovies, useShowtimes } from "../api";

const MovieDetail = ({ movieId }) => {
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const movieData = await useMovies.getMovieById(movieId);
        const showtimesData = await useShowtimes.getShowtimes({ movieId });
        setMovie(movieData);
        setShowtimes(showtimesData);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu phim:", error.message);
      }
    };
    fetchData();
  }, [movieId]);

  return (
    <div>
      {movie && <h1>{movie.title}</h1>}
      {/* Render showtimes */}
    </div>
  );
};

export default MovieDetail;
```
