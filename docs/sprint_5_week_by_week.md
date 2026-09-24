# 📋 Kế Hoạch Sprint 5 Tuần Theo Từng Tuần (Jira-Ready Task Breakdown)
## Điều Phối & Phân Chia Task Jira Cho 5 Dev (Tuần 1 ➔ Tuần 5)

> **Mục đích tài liệu:** Chuẩn hóa toàn bộ các đầu việc trong `sprint_5_week_plan.md` thành định dạng **Jira Task (Summary, Issue Key, Type, Component, Assignee, Scope, DoD)** theo từng tuần. Tech Lead chỉ cần sao chép trực tiếp tên task và mô tả để tạo issue trên Jira.
>
> **Quy ước mã Task Jira:** `[W{Tuần}-{Dev}-{PhânHệ}] Tên Task`
> * Ví dụ: `[W1-DEVA-BE]` = Tuần 1, Dev A, mảng Backend; `[W1-DEVA-FE]` = Tuần 1, Dev A, mảng Frontend.
>
> **Định nghĩa "Done" chung (DoD):** API test qua Swagger/Postman trả data thật từ DB + UI render chuẩn không lỗi console + đã tự đi lại toàn bộ luồng thao tác bằng tay ít nhất 1 lần trước khi báo cáo.
> **Khung thời gian:** Tuần 1-5 là **Sprint 1 — Feature Complete v1.0 / Code Freeze**. Tuần 6-11 là **Sprint 2 — Hardening, E2E Stress Test, Báo cáo & Rehearsal demo**.

---

## 🧱 NGÀY 0: CHUẨN BỊ NỀN TẢNG (TECH LEAD LÀM RIÊNG TRƯỚC TUẦN 1)

### `[W0-LEAD-01]` Khởi tạo Git Repository, Branching Policy & Thiết lập CODEOWNERS
* **Type:** Task | **Assignee:** Tech Lead | **Component:** DevOps / Git
* **Mô tả chi tiết:**
  * Tạo file `.github/CODEOWNERS` gán quyền duyệt toàn bộ code cho `@Phuociter`.
  * Khóa nhánh `main` và nhánh `dev`, bắt buộc mở Pull Request và có review trước khi merge.
* **DoD:** File `.github/CODEOWNERS` tồn tại ở gốc repository, git remote nhận diện đúng owner.

### `[W0-LEAD-02]` Bàn giao quyền bảo trì Shared Layout & Định tuyến App.jsx cho Dev E
* **Type:** Task | **Assignee:** Tech Lead / Dev E | **Component:** Frontend Architecture
* **Mô tả chi tiết:**
  * Xác nhận `App.jsx`, `Navbar.jsx`, `Footer.jsx`, `MainLayout.jsx` đã cấu hình đủ 12 route Client và 6 route Admin.
  * Bàn giao quyền bảo trì duy nhất cho Dev E. Thông báo 4 Dev còn lại không tự ý sửa `App.jsx`.
* **DoD:** Các trang placeholder render thành công, không lỗi import hoặc gãy route.

### `[W0-LEAD-03]` Khởi tạo 4 Component con rỗng và Khung API Client 8 use*.js
* **Type:** Task | **Assignee:** Tech Lead | **Component:** Frontend
* **Mô tả chi tiết:**
  * Tạo/kiểm tra 4 component con: `SeatMap.jsx`, `BookingSummary.jsx`, `AccountTab.jsx`, `BookingHistoryTab.jsx`.
  * Tạo khung 8 file trong `src/api/` (`useMovies.js`, `useCinemas.js`, `useShowtimes.js`, `useBookings.js`, `useSnacks.js`, `useAccount.js`, `usePayments.js`, `useAdminDashboard.js`) kèm cấu hình `axiosInstance.js`.
* **DoD:** Cả 4 component con và 8 file hook export hợp lệ, không gây lỗi build `npm run dev`.

### `[W0-LEAD-04]` Chạy Database Migration & Seed 38.400 Records (Kèm Group 6 Mock Pending Bookings)
* **Type:** Task | **Assignee:** Tech Lead | **Component:** Database / Backend
* **Mô tả chi tiết:**
  * Chạy `movie_booking_schema.sql` và `movie_booking_seed_data.sql` (chứa Group 6 seed 3 đơn pending trên Suất chiếu #2).
  * Khởi động Docker PostgreSQL (Port 5432) và Docker Redis (Port 6379, TTL 300s).
* **DoD:** DB có đủ 22 bảng, kiểm tra 3 đơn Bookings pending tồn tại sẵn trong DB để sẵn sàng cho Dev E test MoMo.

---

## 📅 TUẦN 1: FOUNDATION READ APIS & PUBLIC CLIENT READ
> **Mục tiêu phát hành cuối tuần:** **Bản Release nội bộ v0.1 — Foundation Read APIs** (Mỗi Dev demo API GET + trang UI tương ứng chạy bằng data thật, không mock).

### 1. Phân Hệ Phim & Nghệ Thuật (Dev A)
* **Task Jira: `[W1-DEVA-BE] Xây dựng Read APIs cho Phim và Thể loại (Movies & Genres)`**
  * **Type:** Task | **Assignee:** Dev A | **Component:** Backend
  * **Scope:** Viết `MovieService.cs`, `MoviesController.cs`: `GET /api/movies` (filter `now_showing`/`coming_soon`, search, phân trang), `GET /api/movies/{id}` (kèm Genres/Directors/Actors), `GET /api/genres`.
  * **DoD:** Gọi Swagger/Postman trả data thật từ seed DB; lọc status, search tên phim và phân trang hoạt động chính xác.
* **Task Jira: `[W1-DEVA-FE] Tích hợp useMovies.js và Dựng giao diện trang Home & Movies`**
  * **Type:** Task | **Assignee:** Dev A | **Component:** Frontend
  * **Scope:** Viết module `src/api/useMovies.js` (`getAllMovies`, `getMovieById`, `getGenres`); dựng `Home.jsx` (Banner Carousel, Movie Grid đang chiếu) và `Movies.jsx` (Lưới phim, bộ lọc thể loại, ô tìm kiếm).
  * **DoD:** Render dữ liệu phim thật từ DB; đổi bộ lọc thể loại danh sách tự cập nhật; responsive mobile/desktop, 0 lỗi console.

---

### 2. Phân Hệ Cụm Rạp & Phòng Chiếu (Dev B)
* **Task Jira: `[W1-DEVB-BE] Xây dựng Read APIs cho Cụm rạp, Phòng chiếu và Sơ đồ ghế vật lý`**
  * **Type:** Task | **Assignee:** Dev B | **Component:** Backend
  * **Scope:** Viết `CinemaService.cs`, `CinemasController.cs`: `GET /api/cinemas` (lọc `city`), `GET /api/cinemas/{id}`, `GET /api/auditoriums/{id}/seats`.
  * **DoD:** Swagger trả đúng danh sách 100 rạp và 48 ghế vật lý mẫu/phòng chiếu theo data seed.
* **Task Jira: `[W1-DEVB-FE] Tích hợp useCinemas.js và Dựng giao diện trang Theaters`**
  * **Type:** Task | **Assignee:** Dev B | **Component:** Frontend
  * **Scope:** Viết module `src/api/useCinemas.js` (`getAllCinemas`, `getCinemaById`, `getAuditoriumSeats`); dựng trang `Theaters.jsx` (danh sách cụm rạp gom theo thành phố, hiển thị phòng chiếu).
  * **DoD:** Lọc theo thành phố hiển thị chuẩn xác rạp tương ứng; click chọn rạp xem được thông tin chi tiết; không lỗi vỡ layout.

---

### 3. Phân Hệ Lịch Chiếu & Suất Chiếu (Dev C)
* **Task Jira: `[W1-DEVC-BE] Xây dựng Read APIs Lịch chiếu và Ghế suất chiếu`**
  * **Type:** Task | **Assignee:** Dev C | **Component:** Backend
  * **Scope:** Viết `ScheduleService.cs`, `ShowtimesController.cs`: `GET /api/showtimes` (lọc `movieId`, `cinemaId`, `date`), `GET /api/showtimes/{id}/seats`.
  * **DoD:** Swagger lọc đúng suất chiếu theo ngày; API seats trả về đúng 48 ghế kèm trạng thái `available`/`reserved`.
* **Task Jira: `[W1-DEVC-FE] Tích hợp useShowtimes.js và Dựng khung tĩnh sơ đồ ghế SeatMap`**
  * **Type:** Task | **Assignee:** Dev C | **Component:** Frontend
  * **Scope:** Viết module `src/api/useShowtimes.js` (`getShowtimes`, `getShowtimeSeats`); dựng `Releases.jsx` và khung tĩnh `components/booking/SeatMap.jsx` (chỉ render lưới ghế từ data thật, chưa click chọn).
  * **DoD:** `SeatMap.jsx` render đúng sơ đồ 48 ghế (A-F, 1-8), phân biệt màu sắc loại ghế Standard/VIP/Couple.

---

### 4. Phân Hệ Đặt Vé & Bắp Nước (Dev D)
* **Task Jira: `[W1-DEVD-BE] Xây dựng Read APIs Menu Bắp nước theo Cụm rạp`**
  * **Type:** Task | **Assignee:** Dev D | **Component:** Backend
  * **Scope:** Viết `SnackService.cs`, `SnacksController.cs`: `GET /api/snacks`, `GET /api/cinemas/{cinemaId}/snacks`.
  * **DoD:** Swagger trả đúng danh mục 10 món bắp nước đang kinh doanh tại cụm rạp đã chọn kèm đơn giá.
* **Task Jira: `[W1-DEVD-FE] Tích hợp useSnacks.js và Dựng khung tĩnh chọn bắp nước BookingSummary`**
  * **Type:** Task | **Assignee:** Dev D | **Component:** Frontend
  * **Scope:** Viết module `src/api/useSnacks.js` (`getAllSnacks`, `getCinemaSnacks`); dựng khung tĩnh `components/booking/BookingSummary.jsx` (chỉ hiển thị danh sách bắp nước và giá, chưa có nút đặt vé).
  * **DoD:** Đổi cụm rạp menu bắp nước tự cập nhật đúng giá; nút tăng/giảm số lượng hoạt động chính xác ở local state.

---

### 5. Phân Hệ Auth & Bảo Trì Giao Diện Chung (Dev E)
* **Task Jira: `[W1-DEVE-BE] Xây dựng phân hệ Authentication & JWT Token Generator`**
  * **Type:** Task | **Assignee:** Dev E | **Component:** Backend
  * **Scope:** Viết `AuthService.cs`, `AuthController.cs`: `POST /api/auth/register` (hash mật khẩu `PasswordHasher<User>`), `POST /api/auth/login`, `GET /api/auth/me`.
  * **DoD:** Đăng ký và đăng nhập trả chuỗi JWT Token hợp lệ; claim chứa UserId và Role; `GET /api/auth/me` trả đúng thông tin user đăng nhập.
* **Task Jira: `[W1-DEVE-FE] Tích hợp useAccount.js, Dựng Modal Auth & Bảo trì App.jsx Layout`**
  * **Type:** Task | **Assignee:** Dev E | **Component:** Frontend
  * **Scope:** Cấu hình `axiosInstance.js` (gắn Header Bearer Token, bắt lỗi 401); viết `useAccount.js`; dựng Modal Đăng ký / Đăng nhập trên Navbar; tiếp nhận quyền bảo trì `App.jsx` và Shared Layout.
  * **DoD:** Đăng nhập thành công lưu token vào `localStorage`; hiển thị tên user trên Header; bấm logout xóa token; route admin được bảo vệ.

---

## 📅 TUẦN 2: PHÂN HỆ QUẢN TRỊ VIÊN ADMIN CRUD
> **Mục tiêu phát hành cuối tuần:** **Bản Release nội bộ v0.2 — Admin CRUD** (Demo Admin Portal: tạo/sửa/xóa dữ liệu qua UI trực tiếp, không cần dùng Postman hay query DB).

### 1. Phân Hệ Phim & Nghệ Thuật (Dev A)
* **Task Jira: `[W2-DEVA-BE] Xây dựng CRUD APIs Quản lý Phim & Xóa mềm Soft Delete`**
  * **Type:** Task | **Assignee:** Dev A | **Component:** Backend
  * **Scope:** Viết `POST /api/movies` (thêm phim, validate duration > 0), `PUT /api/movies/{id}`, `DELETE /api/movies/{id}` (soft delete: set `deleted_at = now()`).
  * **DoD:** Gọi API xóa mềm phim thì `deleted_at` có giá trị; query `GET /api/movies` tự động không lấy phim đã bị xóa.
* **Task Jira: `[W2-DEVA-FE] Xây dựng trang AdminMovies và Hoàn thiện trang MovieDetail`**
  * **Type:** Task | **Assignee:** Dev A | **Component:** Frontend
  * **Scope:** Dựng `pages/admin/AdminMovies.jsx` (Form thêm/sửa phim, upload ảnh poster/backdrop, bảng phim kèm nút xóa); hoàn thiện `MovieDetail.jsx` (trailer YouTube, diễn viên, đạo diễn, nhúng lịch chiếu của Dev C).
  * **DoD:** Thêm phim mới từ Admin UI xuất hiện ngay ở `Home.jsx`; xóa phim biến mất khỏi Client; `MovieDetail.jsx` không vỡ khi phim chưa có lịch chiếu.

---

### 2. Phân Hệ Cụm Rạp & Phòng Chiếu (Dev B)
* **Task Jira: `[W2-DEVB-BE] Xây dựng APIs CRUD Rạp & Tự động sinh Ma trận Ghế vật lý`**
  * **Type:** Task | **Assignee:** Dev B | **Component:** Backend
  * **Scope:** Viết `POST /api/cinemas`, `DELETE /api/cinemas/{id}` (trigger cascade soft-delete Auditoriums), `POST /api/auditoriums` (tự động tính toán và sinh đúng 48 ghế vật lý theo hàng A-F, cột 1-8 và loại ghế).
  * **DoD:** Tạo phòng 6x8 tự insert đúng 48 ghế vào bảng `Seats`; xóa rạp thì toàn bộ phòng chiếu trực thuộc tự động soft delete theo.
* **Task Jira: `[W2-DEVB-FE] Xây dựng trang AdminCinemas quản trị Cụm rạp & Phòng chiếu`**
  * **Type:** Task | **Assignee:** Dev B | **Component:** Frontend
  * **Scope:** Dựng `pages/admin/AdminCinemas.jsx` (Form thêm rạp mới, form tạo phòng chiếu kèm cấu hình số hàng/cột ghế, modal xem sơ đồ ghế vật lý vừa sinh).
  * **DoD:** Tạo rạp và phòng chiếu thành công qua giao diện; modal sơ đồ ghế hiển thị trực quan đúng tọa độ và màu sắc loại ghế.

---

### 3. Phân Hệ Lịch Chiếu & Suất Chiếu (Dev C)
* **Task Jira: `[W2-DEVC-BE] Xây dựng APIs Tạo suất chiếu & Tự động nhân bản ShowtimeSeats`**
  * **Type:** Task | **Assignee:** Dev C | **Component:** Backend
  * **Scope:** Viết `POST /api/showtimes` (tự động nhân bản toàn bộ ghế vật lý của phòng sang `ShowtimeSeats` với `status = 'available'`), `PUT /api/showtimes/{id}/cancel`. Chặn trùng phòng trùng giờ bằng exclusion constraint.
  * **DoD:** Tạo 1 suất chiếu sinh đúng 48 bản ghi `ShowtimeSeats`; thử tạo 2 suất trùng giờ cùng phòng chiếu bị chặn và trả mã lỗi 400 rõ ràng.
* **Task Jira: `[W2-DEVC-FE] Xây dựng trang AdminShowtimes Quản lý và Xếp lịch chiếu`**
  * **Type:** Task | **Assignee:** Dev C | **Component:** Frontend
  * **Scope:** Dựng `pages/admin/AdminShowtimes.jsx` (Form xếp lịch chiếu: chọn phim, chọn rạp, chọn phòng, chọn ngày giờ bắt đầu; bảng danh sách suất chiếu kèm nút hủy suất).
  * **DoD:** Xếp lịch thành công hiển thị ngay trên bảng; chặn không cho chọn giờ chiếu trong quá khứ; hiển thị cảnh báo khi phòng bị trùng lịch.

---

### 4. Phân Hệ Đặt Vé & Bắp Nước (Dev D)
* **Task Jira: `[W2-DEVD-BE] Xây dựng APIs Cấu hình Danh mục & Bảng giá Bắp nước theo rạp`**
  * **Type:** Task | **Assignee:** Dev D | **Component:** Backend
  * **Scope:** Viết `POST /api/cinemas/{cinemaId}/snacks` (cập nhật bảng giá và trạng thái bật/tắt bán của từng món ăn tại cụm rạp đã chọn).
  * **DoD:** API cập nhật giá snack theo rạp hoạt động chuẩn; kiểm tra ràng buộc giá không được âm.
* **Task Jira: `[W2-DEVD-FE] Xây dựng trang AdminSnacks Cấu hình thực đơn rạp`**
  * **Type:** Task | **Assignee:** Dev D | **Component:** Frontend
  * **Scope:** Dựng `pages/admin/AdminSnacks.jsx` (Chọn cụm rạp, form chỉnh sửa đơn giá, switch bật/tắt trạng thái kinh doanh của món bắp nước).
  * **DoD:** Sửa giá snack trên Admin UI, mở `BookingSummary.jsx` phía Client thấy giá mới cập nhật ngay lập tức.

---

### 5. Phân Hệ Auth & Profile Người Dùng (Dev E)
* **Task Jira: `[W2-DEVE-BE] Xây dựng APIs Cập nhật Profile & Đổi mật khẩu tài khoản`**
  * **Type:** Task | **Assignee:** Dev E | **Component:** Backend
  * **Scope:** Viết `PUT /api/users/profile` (cập nhật họ tên, SĐT, avatar), `PUT /api/users/change-password` (xác thực mật khẩu cũ bằng `PasswordHasher<User>`, hash mật khẩu mới).
  * **DoD:** Đổi mật khẩu thành công; thử đăng nhập lại bằng mật khẩu cũ bị từ chối; mật khẩu mới đăng nhập thành công.
* **Task Jira: `[W2-DEVE-FE] Xây dựng giao diện AccountTab trong trang Profile`**
  * **Type:** Task | **Assignee:** Dev E | **Component:** Frontend
  * **Scope:** Dựng component `components/profile/AccountTab.jsx` trong `pages/Profile.jsx` (Form đổi thông tin cá nhân, form đổi mật khẩu kèm validate độ dài và khớp mật khẩu xác nhận).
  * **DoD:** Cập nhật thông tin thành công hiển thị thông báo Toast; đổi mật khẩu tự động đăng xuất và yêu cầu đăng nhập lại.

---

## 📅 TUẦN 3: ENGINE GIỮ GHẾ REAL-TIME (REDIS) & GỠ BLOCK THANH TOÁN
> **Mục tiêu phát hành cuối tuần:** **Bản Release nội bộ v0.3 — Seat Hold Engine** (Demo giữ ghế real-time: 2 tab trình duyệt tranh nhau 1 ghế, countdown UI 5:00 khớp chính xác TTL Redis).

### 1. Phân Hệ Lịch Chiếu & Giữ Ghế (Dev C - Chủ Công)
* **Task Jira: `[W3-DEVC-BE] Xây dựng Real-time Seat Hold Engine trên Redis (TTL 300s)`**
  * **Type:** Task | **Assignee:** Dev C | **Component:** Backend / Redis
  * **Scope:** Viết `POST /api/showtimes/{id}/hold-seats` (dùng Redis `SET NX EX`, TTL 300s, validate tối đa 8 ghế, tính `totalHoldPrice = basePrice + extraPrice`, trả về `holdToken` + `heldSeats`), viết `DELETE .../hold-seats/{holdToken}`.
  * **DoD:** 2 client cùng hold 1 ghế thì client thứ 2 nhận lỗi 409 Conflict; sau 5 phút Redis tự hủy key, ghế tự nhả về trạng thái trống.
* **Task Jira: `[W3-DEVC-FE] Hoàn thiện Tương tác Chọn ghế & Đồng hồ đếm ngược trong SeatMap`**
  * **Type:** Task | **Assignee:** Dev C | **Component:** Frontend
  * **Scope:** Hoàn thiện `components/booking/SeatMap.jsx`: Click chọn/bỏ chọn tối đa 8 ghế; gọi API hold-seats nhận `holdToken`; hiển thị đồng hồ đếm ngược 5:00 phút đồng bộ với `expiresAt`.
  * **DoD:** Mở 2 tab trình duyệt chọn trùng ghế bị chặn; hết 5 phút đồng hồ báo hết hạn và tự động hủy vùng chọn ghế.

---

### 2. Phân Hệ Phim & Nghệ Thuật (Dev A)
* **Task Jira: `[W3-DEVA-FE] Kết nối luồng Chọn suất chiếu MovieDetail sang Booking Flow`**
  * **Type:** Task | **Assignee:** Dev A | **Component:** Frontend / Backend
  * **Scope:** Nút "Đặt vé" trên `MovieDetail.jsx` điều hướng chính xác sang route `/booking/:showtimeId`; rà soát hiệu năng query `GET /api/movies` (thêm Index nếu cần).
  * **DoD:** Người dùng đi từ `Home` ➔ `MovieDetail` ➔ Click suất chiếu ➔ Vào đúng sơ đồ ghế của suất chiếu đó, không bị link chết.

---

### 3. Phân Hệ Cụm Rạp & Phòng Chiếu (Dev B)
* **Task Jira: `[W3-DEVB-FE] Chuẩn hóa bảng mã màu ghế SeatType và Polish UI Theaters`**
  * **Type:** Task | **Assignee:** Dev B | **Component:** Frontend
  * **Scope:** Chuẩn hóa format dữ liệu ghế (`seatType.color_code`) để Dev C hiển thị màu đồng nhất trên `SeatMap.jsx`; polish giao diện `Theaters.jsx` (thêm ảnh rạp, tiện ích, bản đồ chỉ đường).
  * **DoD:** Sơ đồ ghế của Dev C tô màu chuẩn xác theo mã màu từ API của Dev B; giao diện `Theaters.jsx` mượt mà, responsive tốt.

---

### 4. Phân Hệ Đặt Vé & Bắp Nước (Dev D)
* **Task Jira: `[W3-DEVD-FE] Hoàn thiện Giao diện Tính tổng tiền giỏ hàng BookingSummary`**
  * **Type:** Task | **Assignee:** Dev D | **Component:** Frontend
  * **Scope:** Hoàn thiện UI `BookingSummary.jsx`: Nhận `holdToken` và `heldSeats` từ Dev C, chọn số lượng combo bắp nước, tính tổng tiền theo công thức `totalAmount = totalHoldPrice + Sum(snack.price * qty)`.
  * **DoD:** Hiển thị chi tiết tiền ghế + tiền bắp nước; tổng tiền tự động nhảy đúng khi tăng giảm snack; chặn bấm đặt vé nếu chưa có ghế.
* **Task Jira: `[W3-DEVD-DB] Viết Script SQL Seed 3 đơn Bookings Pending gỡ block Dev E`**
  * **Type:** Task | **Assignee:** Dev D | **Component:** Database
  * **Scope:** Viết và thực thi Group 6 trong `movie_booking_seed_data.sql`: Seed 3 đơn `Bookings (pending)` kèm `Tickets` và `BookingSnacks` trên **Suất chiếu #2** (`...0049` đến `...0053`), cập nhật trạng thái ghế sang `reserved`.
  * **DoD:** DB có sẵn 3 mã đơn `BK-MOMO-TEST-001/002/003` để Dev E sử dụng ngay vào ngày đầu Tuần 4 mà không phải chờ checkout code xong. Đã xác nhận với Dev C rằng Suất chiếu #2 không được dùng làm demo ở Tuần 1-2; comment trong file seed ghi rõ lý do các ghế này reserved vĩnh viễn.

---

### 5. Phân Hệ Auth & Quản Trị Người Dùng (Dev E)
* **Task Jira: `[W3-DEVE-BE] Xây dựng API Quản lý danh sách người dùng cho Admin`**
  * **Type:** Task | **Assignee:** Dev E | **Component:** Backend
  * **Scope:** Viết `GET /api/users` (phân trang, lọc theo role, che giấu trường `PasswordHash`), chuẩn bị khung `PaymentService.cs` và `PaymentsController.cs`.
  * **DoD:** Swagger trả về danh sách DTO người dùng an toàn; token Customer gọi endpoint này bị chặn bằng lỗi 403 Forbidden.
* **Task Jira: `[W3-DEVE-FE] Xây dựng trang AdminUsers Quản trị Tài khoản hệ thống`**
  * **Type:** Task | **Assignee:** Dev E | **Component:** Frontend
  * **Scope:** Dựng trang `pages/admin/AdminUsers.jsx` (Bảng hiển thị người dùng, badge phân quyền Customer/Staff/Admin, ô tìm kiếm theo email).
  * **DoD:** Chỉ tài khoản có role Admin mới truy cập được trang; danh sách người dùng hiển thị đầy đủ thông tin.

---

## 📅 TUẦN 4: CHECKOUT TRANSACTION & TÍCH HỢP THANH TOÁN SANDBOX
> **Mục tiêu phát hành cuối tuần:** **Bản Release nội bộ v0.4 — Booking Transaction** (Demo đặt vé thật đầu-cuối: chọn ghế, chọn bắp nước, transaction ACID rollback đúng khi lỗi, tạo đơn pending).

### 1. Phân Hệ Đặt Vé & Bắp Nước (Dev D - Chủ Công)
* **Task Jira: `[W4-DEVD-BE] Xây dựng Core Booking Transaction PostgreSQL ACID`**
  * **Type:** Task | **Assignee:** Dev D | **Component:** Backend / Database
  * **Scope:** Viết `POST /api/bookings` (Xác thực `holdToken` Redis ➔ Khóa ghế `reserved` DB ➔ Tạo đơn `Bookings` pending ➔ Sinh vé `Tickets` ➔ Thêm `BookingSnacks` ➔ Xóa key Redis; bọc toàn bộ trong PostgreSQL Transaction). Viết `GET /api/bookings/{id}`, `GET /api/bookings/my-bookings`, `PUT /api/bookings/{id}/cancel`.
  * **DoD:** Đặt vé thành công xóa key Redis và chuyển ghế thành `reserved`; cố tình gây lỗi giữa transaction (ví dụ seat đã reserved) toàn bộ DB rollback sạch sẽ, không lưu rác.
* **Task Jira: `[W4-DEVD-FE] Nối BookingSummary vào API Booking thật và Xây dựng BookingHistoryTab`**
  * **Type:** Task | **Assignee:** Dev D | **Component:** Frontend
  * **Scope:** Kết nối nút "Tiến Hành Đặt Vé" trên `BookingSummary.jsx` gọi `POST /api/bookings`; dựng component `components/profile/BookingHistoryTab.jsx` trong `pages/Profile.jsx` (Hiển thị danh sách đơn đã đặt).
  * **DoD:** Đặt vé thành công chuyển hướng sang màn hình thanh toán; mở Profile xem lại được đơn hàng vừa đặt với status `pending`.

---

### 2. Phân Hệ Thanh Toán Online Sandbox (Dev E - Chủ Công)
* **Task Jira: `[W4-DEVE-BE] Tích hợp Cổng thanh toán MoMo Sandbox & Webhook IPN Callback`**
  * **Type:** Task | **Assignee:** Dev E | **Component:** Backend
  * **Scope:** Sử dụng 3 đơn pending có sẵn từ Tuần 3: Viết `POST /api/payments/create-url` (Tạo bản ghi `Payments (pending)`, sinh URL MoMo Sandbox kèm chữ ký HMAC-SHA256); viết `POST /api/payments/callback` (Xác thực chữ ký webhook, cập nhật `Payments` và `Bookings` thành `success` hoặc `failed`, gọi `ReleaseSeatsAsync` nếu fail).
  * **DoD:** Tạo URL MoMo thành công; giả lập webhook thành công đơn hàng chuyển sang `success`; webhook có tính idempotent (gọi 2 lần không lỗi).
* **Task Jira: `[W4-DEVE-FE] Xây dựng trang tiếp nhận kết quả thanh toán PaymentCallback`**
  * **Type:** Task | **Assignee:** Dev E | **Component:** Frontend
  * **Scope:** Dựng `pages/PaymentCallback.jsx`: Đón query parameters từ MoMo redirect về, gọi API verify, hiển thị màn hình chúc mừng vé thành công hoặc thông báo thanh toán thất bại kèm nút quay về Profile.
  * **DoD:** Giao diện hiển thị đúng mã đơn hàng, tổng tiền thanh toán và trạng thái thành công/thất bại trực quan.

---

### 3. Phân Hệ Lịch Chiếu & Giữ Ghế (Dev C)
* **Task Jira: `[W4-DEVC-BE] Xây dựng Helper Nhả ghế Idempotent ReleaseSeatsAsync`**
  * **Type:** Task | **Assignee:** Dev C | **Component:** Backend
  * **Scope:** Viết `ScheduleService.ReleaseSeatsAsync(bookingId, seatIds)`: Nhả các ghế thuộc đúng `bookingId` đó từ `reserved` về `available`; bọc điều kiện kiểm tra atomic để đảm bảo tính Idempotent.
  * **DoD:** Gọi 2 lần liên tiếp trên cùng 1 đơn hàng không bị lỗi và không nhả nhầm ghế của đơn hàng mới.
* **Task Jira: `[W4-DEVC-TEST] Kiểm thử Luồng Hủy vé / Rollback ghế với Dev D và Dev E`**
  * **Type:** Task | **Assignee:** Dev C | **Participants:** Dev D, Dev E | **Component:** Testing / Integration
  * **Scope:** Dev C chủ trì test logic `ReleaseSeatsAsync` khi phối hợp với Dev D (hủy đơn pending) và Dev E (giả lập MoMo callback thất bại); kiểm tra ghế có được nhả về trạng thái `available` trên `SeatMap.jsx` ngay lập tức không.
  * **DoD:** Ghế được giải phóng hiển thị lại màu xanh (`available`) cho người khác chọn bình thường; Dev D và Dev E cùng nghiệm thu đạt chuẩn.

---

### 4. Phân Hệ Phim & Nghệ Thuật (Dev A)
* **Task Jira: `[W4-DEVA-BE] Xây dựng API Báo cáo Top 10 Phim Doanh Thu Cao Nhất`**
  * **Type:** Task | **Assignee:** Dev A | **Component:** Backend
  * **Scope:** Viết `GET /api/reports/top-movies` (Query EF Core: Join `Movies` + `Tickets` + `Bookings`, nhóm theo phim, tính tổng doanh thu và số vé bán ra, sắp xếp giảm dần, lấy Top 10).
  * **DoD:** Swagger trả về dữ liệu thống kê thật từ các đơn vé đã đặt; Dev E xác nhận gọi thành công để ghép vào Dashboard.

---

### 5. Phân Hệ Cụm Rạp & Phòng Chiếu (Dev B)
* **Task Jira: `[W4-DEVB-BE] Xây dựng API Báo cáo Tỷ lệ lấp đầy ghế theo từng Cụm rạp`**
  * **Type:** Task | **Assignee:** Dev B | **Component:** Backend
  * **Scope:** Viết `GET /api/reports/occupancy-rates` (Query EF Core: Join `Cinemas` + `Auditoriums` + `ShowtimeSeats`, tính tỷ lệ % giữa ghế `reserved` trên tổng số ghế).
  * **DoD:** Swagger trả về danh sách rạp kèm tỷ lệ phần trăm lấp đầy chính xác; Dev E xác nhận tích hợp thành công.

---

## 📅 TUẦN 5: ĐÓNG GÓI TÍNH NĂNG (V1.0 FEATURE COMPLETE & CODE FREEZE)
> **Mục tiêu phát hành cuối tuần:** **Bản Release nội bộ v1.0 — Feature Complete (Sprint 1 kết thúc)**. Demo thanh toán Sandbox thật, vé QR, Dashboard tổng hợp — đủ tính năng để test, chuẩn bị bước vào Sprint 2.

### 1. Phân Hệ Auth, Thanh Toán & Dashboard (Dev E - Chủ Công)
* **Task Jira: `[W5-DEVE-BE] Xây dựng API Báo cáo Tổng Doanh Thu Hệ Thống`**
  * **Type:** Task | **Assignee:** Dev E | **Component:** Backend
  * **Scope:** Viết `GET /api/reports/revenue` (Thống kê tổng doanh thu từ bảng `Payments` theo ngày/tháng, tỷ lệ thanh toán qua MoMo/VNPay).
  * **DoD:** Swagger trả đúng số liệu doanh thu thực tế, không có lỗi null hoặc sai lệch tính toán.
* **Task Jira: `[W5-DEVE-FE] Xây dựng trang Admin Dashboard Tổng hợp Biểu đồ Thống kê`**
  * **Type:** Task | **Assignee:** Dev E | **Component:** Frontend
  * **Scope:** Dựng `pages/admin/Dashboard.jsx`: Dùng thư viện biểu đồ (Chart.js / Recharts) kết nối API doanh thu (Dev E), top 10 phim (Dev A) và tỷ lệ lấp đầy rạp (Dev B).
  * **DoD:** Biểu đồ hiển thị đẹp mắt, trực quan; số liệu đồng bộ chuẩn xác từ cả 3 API; không lỗi console.

---

### 2. Phân Hệ Đặt Vé & Bắp Nước (Dev D - Chủ Công)
* **Task Jira: `[W5-DEVD-BE] Xây dựng Background Job Tự Động Hủy Đơn Pending Quá Hạn`**
  * **Type:** Task | **Assignee:** Dev D | **Component:** Backend / Background Jobs
  * **Scope:** Viết Background Service `ExpireStalePendingBookings` chạy định kỳ 1 phút/lần: Quét các đơn `Bookings` có status `pending` quá 10 phút, đổi status thành `cancelled`, gọi `ScheduleService.ReleaseSeatsAsync` của Dev C.
  * **DoD:** Tạo 1 đơn pending rồi bỏ dở, sau 10 phút đơn tự động đổi sang `cancelled` và các ghế tự động nhả về `available`.
* **Task Jira: `[W5-DEVD-FE] Xây dựng API & Giao diện Xuất vé điện tử QR Code`**
  * **Type:** Task | **Assignee:** Dev D | **Component:** Backend / Frontend
  * **Scope:** Viết `GET /api/tickets/{id}/qr` (Mã hóa thông tin vé thành chuỗi Base64/QR code); cập nhật `BookingHistoryTab.jsx` hiển thị hình ảnh mã QR Code của từng chiếc vé.
  * **DoD:** Mở modal chi tiết vé hiển thị hình ảnh mã QR sắc nét; dùng camera điện thoại quét mã QR ra đúng thông tin vé.

---

### 3. Phân Hệ Lịch Chiếu & Giữ Ghế (Dev C)
* **Task Jira: `[W5-DEVC-TEST] Kiểm thử tải đa luồng Redis Hold & Đảm bảo Idempotency Nhả ghế`**
  * **Type:** Task | **Assignee:** Dev C | **Component:** Testing / Concurrency
  * **Scope:** 
    * Dùng công cụ kiểm thử giả lập 50 request cùng tranh giữ 1 ghế hot trên Redis.
    * Kiểm thử tính Idempotent của `ScheduleService.ReleaseSeatsAsync(bookingId, seatIds)` trên **cả 3 nguồn kích hoạt đồng thời**: (1) Khách chủ động hủy đơn pending (`PUT /api/bookings/{id}/cancel`), (2) Cổng thanh toán gửi Webhook báo fail (`POST /api/payments/callback`), và (3) Background Job quét dọn đơn quá hạn (`ExpireStalePendingBookings`).
  * **DoD:** 0 lỗi race condition; ghế chỉ được cấp cho 1 người duy nhất; `ReleaseSeatsAsync` chỉ thực thi nhả ghế đúng 1 lần duy nhất cho tiến trình chuyển trạng thái `Bookings.status = 'cancelled'` thành công, 2 tiến trình còn lại dừng an toàn (0 rows affected), không bao giờ nhả nhầm ghế của đơn mới.

---

### 4. Phân Hệ Phim & Nghệ Thuật (Dev A)
* **Task Jira: `[W5-DEVA-POLISH] Sửa toàn bộ Bug tồn đọng phân hệ Phim & Tối ưu Responsive UI`**
  * **Type:** Task | **Assignee:** Dev A | **Component:** Fullstack Polish
  * **Scope:** Rà soát toàn bộ bug report từ Tuần 1-4 thuộc phạm vi Movie/Genre/Director/Actor; tối ưu layout trên mobile viewport (375px) và desktop (1440px); thêm Skeleton Loading.
  * **DoD:** 0 bug tồn đọng; giao diện mượt mà, không bị vỡ layout trên mọi kích thước màn hình.

---

### 5. Phân Hệ Cụm Rạp & Phòng Chiếu (Dev B)
* **Task Jira: `[W5-DEVB-POLISH] Sửa toàn bộ Bug tồn đọng phân hệ Rạp & Kiểm thử Trigger Cascade`**
  * **Type:** Task | **Assignee:** Dev B | **Component:** Fullstack Polish
  * **Scope:** Rà soát toàn bộ bug report từ Tuần 1-4 thuộc phạm vi Cinema/Auditorium/Seat; kiểm thử trigger xóa mềm phòng chiếu khi xóa rạp; hoàn thiện giao diện `Theaters.jsx` và `AdminCinemas.jsx`.
  * **DoD:** 0 bug tồn đọng; toàn bộ luồng tạo rạp ➔ tạo phòng ➔ xem sơ đồ ghế chạy trơn tru.

---

## 📌 BẢNG TỔNG HỢP MÃ TICKET JIRA THEO TUẦN (MASTER JIRA BOARD CHEATSHEET)

| Mã Ticket Jira | Tên Task Chuẩn Bị Đưa Lên Jira | Dev Phụ Trách | Component | Sprint Target |
|---|---|:---:|:---:|:---:|
| **`[W0-LEAD-01]`** | Khởi tạo Git Repository, Branching Policy & Thiết lập CODEOWNERS | **Tech Lead** | DevOps | Ngày 0 |
| **`[W0-LEAD-02]`** | Bàn giao quyền bảo trì Shared Layout & Định tuyến App.jsx cho Dev E | **Tech Lead** | Architecture | Ngày 0 |
| **`[W0-LEAD-03]`** | Khởi tạo 4 Component con rỗng và Khung API Client 8 use*.js | **Tech Lead** | Frontend | Ngày 0 |
| **`[W0-LEAD-04]`** | Chạy Database Migration & Seed 38.400 Records (kèm Group 6) | **Tech Lead** | Database | Ngày 0 |
| **`[W1-DEVA-BE]`** | Xây dựng Read APIs cho Phim và Thể loại (Movies & Genres) | **Dev A** | Backend | Tuần 1 (v0.1) |
| **`[W1-DEVA-FE]`** | Tích hợp useMovies.js và Dựng giao diện trang Home & Movies | **Dev A** | Frontend | Tuần 1 (v0.1) |
| **`[W1-DEVB-BE]`** | Xây dựng Read APIs Cụm rạp, Phòng chiếu và Ghế vật lý mẫu | **Dev B** | Backend | Tuần 1 (v0.1) |
| **`[W1-DEVB-FE]`** | Tích hợp useCinemas.js và Dựng giao diện trang Theaters | **Dev B** | Frontend | Tuần 1 (v0.1) |
| **`[W1-DEVC-BE]`** | Xây dựng Read APIs Lịch chiếu và Ghế suất chiếu ShowtimeSeats | **Dev C** | Backend | Tuần 1 (v0.1) |
| **`[W1-DEVC-FE]`** | Tích hợp useShowtimes.js và Dựng khung tĩnh sơ đồ ghế SeatMap | **Dev C** | Frontend | Tuần 1 (v0.1) |
| **`[W1-DEVD-BE]`** | Xây dựng Read APIs Menu Bắp nước theo Cụm rạp | **Dev D** | Backend | Tuần 1 (v0.1) |
| **`[W1-DEVD-FE]`** | Tích hợp useSnacks.js và Dựng khung tĩnh chọn bắp nước BookingSummary | **Dev D** | Frontend | Tuần 1 (v0.1) |
| **`[W1-DEVE-BE]`** | Xây dựng phân hệ Authentication & JWT Token Generator | **Dev E** | Backend | Tuần 1 (v0.1) |
| **`[W1-DEVE-FE]`** | Tích hợp useAccount.js, Dựng Modal Auth & Bảo trì App.jsx Layout | **Dev E** | Frontend | Tuần 1 (v0.1) |
| **`[W2-DEVA-BE]`** | Xây dựng CRUD APIs Quản lý Phim & Xóa mềm Soft Delete | **Dev A** | Backend | Tuần 2 (v0.2) |
| **`[W2-DEVA-FE]`** | Xây dựng trang AdminMovies và Hoàn thiện trang MovieDetail | **Dev A** | Frontend | Tuần 2 (v0.2) |
| **`[W2-DEVB-BE]`** | Xây dựng APIs CRUD Rạp & Tự động sinh Ma trận Ghế vật lý | **Dev B** | Backend | Tuần 2 (v0.2) |
| **`[W2-DEVB-FE]`** | Xây dựng trang AdminCinemas quản trị Cụm rạp & Phòng chiếu | **Dev B** | Frontend | Tuần 2 (v0.2) |
| **`[W2-DEVC-BE]`** | Xây dựng APIs Tạo suất chiếu & Tự động nhân bản ShowtimeSeats | **Dev C** | Backend | Tuần 2 (v0.2) |
| **`[W2-DEVC-FE]`** | Xây dựng trang AdminShowtimes Quản lý và Xếp lịch chiếu | **Dev C** | Frontend | Tuần 2 (v0.2) |
| **`[W2-DEVD-BE]`** | Xây dựng APIs Cấu hình Danh mục & Bảng giá Bắp nước theo rạp | **Dev D** | Backend | Tuần 2 (v0.2) |
| **`[W2-DEVD-FE]`** | Xây dựng trang AdminSnacks Cấu hình thực đơn rạp | **Dev D** | Frontend | Tuần 2 (v0.2) |
| **`[W2-DEVE-BE]`** | Xây dựng APIs Cập nhật Profile & Đổi mật khẩu tài khoản | **Dev E** | Backend | Tuần 2 (v0.2) |
| **`[W2-DEVE-FE]`** | Xây dựng giao diện AccountTab trong trang Profile | **Dev E** | Frontend | Tuần 2 (v0.2) |
| **`[W3-DEVC-BE]`** | Xây dựng Real-time Seat Hold Engine trên Redis (TTL 300s) | **Dev C** | Backend/Redis | Tuần 3 (v0.3) |
| **`[W3-DEVC-FE]`** | Hoàn thiện Tương tác Chọn ghế & Đồng hồ đếm ngược trong SeatMap | **Dev C** | Frontend | Tuần 3 (v0.3) |
| **`[W3-DEVA-FE]`** | Kết nối luồng Chọn suất chiếu MovieDetail sang Booking Flow | **Dev A** | Fullstack | Tuần 3 (v0.3) |
| **`[W3-DEVB-FE]`** | Chuẩn hóa bảng mã màu ghế SeatType và Polish UI Theaters | **Dev B** | Frontend | Tuần 3 (v0.3) |
| **`[W3-DEVD-FE]`** | Hoàn thiện Giao diện Tính tổng tiền giỏ hàng BookingSummary | **Dev D** | Frontend | Tuần 3 (v0.3) |
| **`[W3-DEVD-DB]`** | Viết Script SQL Seed 3 đơn Bookings Pending gỡ block Dev E | **Dev D** | Database | Tuần 3 (v0.3) |
| **`[W3-DEVE-BE]`** | Xây dựng API Quản lý danh sách người dùng cho Admin | **Dev E** | Backend | Tuần 3 (v0.3) |
| **`[W3-DEVE-FE]`** | Xây dựng trang AdminUsers Quản trị Tài khoản hệ thống | **Dev E** | Frontend | Tuần 3 (v0.3) |
| **`[W4-DEVD-BE]`** | Xây dựng Core Booking Transaction PostgreSQL ACID | **Dev D** | Backend/DB | Tuần 4 (v0.4) |
| **`[W4-DEVD-FE]`** | Nối BookingSummary vào API Booking thật và Xây dựng BookingHistoryTab | **Dev D** | Frontend | Tuần 4 (v0.4) |
| **`[W4-DEVE-BE]`** | Tích hợp Cổng thanh toán MoMo Sandbox & Webhook IPN Callback | **Dev E** | Backend | Tuần 4 (v0.4) |
| **`[W4-DEVE-FE]`** | Xây dựng trang tiếp nhận kết quả thanh toán PaymentCallback | **Dev E** | Frontend | Tuần 4 (v0.4) |
| **`[W4-DEVC-BE]`** | Xây dựng Helper Nhả ghế Idempotent ReleaseSeatsAsync | **Dev C** | Backend | Tuần 4 (v0.4) |
| **`[W4-DEVC-TEST]`**| Kiểm thử Luồng Hủy vé / Rollback ghế với Dev D và Dev E | **Dev C** | Testing | Tuần 4 (v0.4) |
| **`[W4-DEVA-BE]`** | Xây dựng API Báo cáo Top 10 Phim Doanh Thu Cao Nhất | **Dev A** | Backend | Tuần 4 (v0.4) |
| **`[W4-DEVB-BE]`** | Xây dựng API Báo cáo Tỷ lệ lấp đầy ghế theo từng Cụm rạp | **Dev B** | Backend | Tuần 4 (v0.4) |
| **`[W5-DEVE-BE]`** | Xây dựng API Báo cáo Tổng Doanh Thu Hệ Thống | **Dev E** | Backend | Tuần 5 (v1.0) |
| **`[W5-DEVE-FE]`** | Xây dựng trang Admin Dashboard Tổng hợp Biểu đồ Thống kê | **Dev E** | Frontend | Tuần 5 (v1.0) |
| **`[W5-DEVD-BE]`** | Xây dựng Background Job Tự Động Hủy Đơn Pending Quá Hạn | **Dev D** | Backend | Tuần 5 (v1.0) |
| **`[W5-DEVD-FE]`** | Xây dựng API & Giao diện Xuất vé điện tử QR Code | **Dev D** | Fullstack | Tuần 5 (v1.0) |
| **`[W5-DEVC-TEST]`**| Kiểm thử tải đa luồng Redis Hold & Đảm bảo Idempotency Nhả ghế | **Dev C** | QA/Testing | Tuần 5 (v1.0) |
| **`[W5-DEVA-POLISH]`**| Sửa toàn bộ Bug tồn đọng phân hệ Phim & Tối ưu Responsive UI | **Dev A** | Polish | Tuần 5 (v1.0) |
| **`[W5-DEVB-POLISH]`**| Sửa toàn bộ Bug tồn đọng phân hệ Rạp & Kiểm thử Trigger Cascade | **Dev B** | Polish | Tuần 5 (v1.0) |

---

## 🎯 QUY TẮC BÁO CÁO & DEMO CUỐI TUẦN TRÊN JIRA
1. **Chuyển Status "Done":** Chỉ được kéo ticket sang cột **Done** khi đáp ứng đủ tiêu chuẩn DoD ghi trong task: Có dữ liệu thật từ DB, UI không lỗi console, tự chạy tay E2E thành công.
2. **Demo bằng UI sống:** Buổi nghiệm thu cuối tuần bắt buộc demo trực tiếp bằng giao diện chạy thật trên browser, không dùng slide mô tả.
3. **Cập nhật Blocker kịp thời:** Nếu task bị kẹt hoặc phát sinh lỗi do dependency của Dev khác, gắn ngay label `blocked` trên Jira và tag Dev liên quan để giải quyết trong ngày.
