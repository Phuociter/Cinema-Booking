# [PR] [W1-DEVC] Xây dựng Read APIs Lịch chiếu, Ghế suất chiếu & Dựng sơ đồ ghế SeatMap

> **Jira Tasks liên quan:**
> * `[W1-DEVC-BE]` Xây dựng Read APIs Lịch chiếu và Ghế suất chiếu
> * `[W1-DEVC-FE]` Tích hợp useShowtimes.js và Dựng khung tĩnh sơ đồ ghế SeatMap

---

## 1. Mục tiêu của PR (Why & What)

PR này hoàn thành trọn bộ 2 Task Jira của **Dev C trong Tuần 1** thuộc Phân Hệ Lịch Chiếu & Suất Chiếu:
* **Người dùng:** Có thể duyệt lịch chiếu 30 ngày trên toàn quốc, lọc rạp theo tỉnh/thành, chọn khung giờ xem phim và xem trực tiếp sơ đồ 48 ghế thực tế của phòng chiếu.
* **Hệ thống:** Ứng dụng mô hình **Redis Cache-Aside** giúp phản hồi tức thì (< 5ms) danh sách suất chiếu, tối ưu hóa truy vấn cơ sở dữ liệu và xử lý trọn vẹn dữ liệu cho 100 cụm rạp trên 34 tỉnh/thành phố.

---

## 2. Luồng hoạt động của tính năng (User Journey & System Logic)

```
[Trang Lịch Chiếu: Chọn ngày] 
       │ (1. Gọi API /api/showtimes lấy danh sách phim trong ngày)
       ▼
[Modal Rạp: Chọn Tỉnh/Thành & Giờ Chiếu] 
       │ (2. Phân loại phòng chiếu: 2D, 3D, IMAX, GOLDCLASS)
       ▼
[Trang Đặt Vé: Sơ Đồ Ghế] 
       │ (3. Gọi API /api/showtimes/{id}/seats nạp sơ đồ 48 ghế thật)
       ▼
[Chọn ghế & Tạm tính tiền theo loại ghế Standard / VIP / Couple]
```

### Cơ chế Tối ưu Backend (Redis Cache-Aside)
1. Khi có request tra cứu lịch chiếu, hệ thống kiểm tra cache **Redis** trước.
2. Nếu đã có dữ liệu trong Redis (**Cache Hit**): Trả về ngay lập tức, không truy vấn Database.
3. Nếu chưa có (**Cache Miss**): Truy vấn **PostgreSQL** (chỉ lấy suất chiếu hợp lệ `scheduled`, lọc ngày chuẩn UTC), lưu kết quả vào Redis với hạn 5 phút (TTL), sau đó trả về client.

---

## 3. Tóm tắt các thay đổi chính (What Changed)

### Giao diện người dùng (Frontend)
* **Trang Lịch Chiếu Toàn Quốc (`Releases.jsx`):**
  * Thanh lịch 30 ngày (chia 2 tầng trực quan, mỗi tầng 15 ngày).
  * Ô tìm kiếm phim theo tên real-time.
  * Hiển thị thẻ phim kèm thời lượng, độ tuổi, số lượng rạp và số suất chiếu thực tế trong ngày.
* **Modal Chọn Rạp & Suất Chiếu (`CityShowtimeModal.jsx`):**
  * Lọc rạp theo 34 tỉnh/thành phố và theo định dạng phòng chiếu (`2D`, `3D`, `IMAX`, `GOLDCLASS`).
  * Danh sách giờ chiếu phân theo từng rạp, kèm nút bấm điều hướng thẳng vào phòng chiếu.
* **Sơ Đồ Ghế Phòng Chiếu (`SeatMap.jsx` & `SeatLayout.jsx`):**
  * Mô phỏng màn hình cong và ma trận chuẩn 48 ghế (6 hàng A-F × 8 cột).
  * Phân biệt rõ loại ghế: Thường (A-D), VIP (E), Ghế đôi (F) và Ghế đã có người đặt (icon khóa).
  * Cho phép bấm chọn/bỏ chọn ghế, tự động tính tổng tiền theo giá từng ghế.

### Xử lý Logic & API (Backend)
* **ShowtimesController:** Cung cấp 3 API RESTful chuẩn:
  * `GET /api/showtimes`: Lọc theo phim, rạp, ngày chiếu, hỗ trợ phân trang chuẩn `page`/`pageSize`.
  * `GET /api/showtimes/{id}`: Xem thông tin chi tiết một ca chiếu.
  * `GET /api/showtimes/{id}/seats`: Lấy toàn bộ 48 ghế kèm trạng thái và giá tiền của suất chiếu.
* **ScheduleService & RedisService:**
  * Chuẩn hóa logic phân trang và sinh cache key tách biệt theo từng trang (`:p{page}:s{pageSize}`).
  * Quản lý kết nối Redis phân tán với đầy đủ hàm get, set, xóa theo prefix.
* **ShowtimeRepository:**
  * Lọc trạng thái `ShowtimeStatus.Scheduled` (loại bỏ hoàn toàn magic string).
  * Xử lý bộ lọc thời gian chuẩn UTC.
  * Thêm hàm `ExistsAsync` kiểm tra nhanh suất chiếu tồn tại trước khi load ghế.

### Cơ sở dữ liệu & Hạ tầng (Database & Docker)
* **Docker Compose:** Bổ sung container `redis` (image `redis:7-alpine`, port `6379`) và volume lưu trữ.
* **Script Dữ Liệu (`update_database.sql`):**
  * Chuẩn hóa tên 100 cụm rạp, 200 phòng chiếu và 100 combo bắp nước.
  * Sinh 36.000 suất chiếu đa dạng phủ trọn 30 ngày (20 phim ngày thường, 24 phim cuối tuần, phim luân phiên theo vòng đời chiếu rạp thực tế).
  * Khởi tạo sẵn 1.727.952 bản ghi ghế tương ứng cho các suất chiếu.

---

## 4. Hướng dẫn chạy thử khi nhận PR (Step-by-step Setup)

Dành cho các thành viên trong nhóm sau khi `pull` code về:

### Bước 1: Khởi động Docker (Database + Redis)
```bash
docker compose up -d
```
> Đảm bảo cả 2 container `cinema-postgres` và `cinema-redis` đang chạy bình thường.

### Bước 2: Nạp dữ liệu mới vào PostgreSQL
```bash
docker cp data/update_database.sql cinema-postgres:/tmp/update_database.sql
docker exec -i cinema-postgres psql -U postgres -d cinema_db -f /tmp/update_database.sql
```

### Bước 3: Dọn sạch cache Redis cũ
```bash
docker exec -i cinema-redis redis-cli FLUSHDB
```

### Bước 4: Khởi động Backend
```bash
cd Backend/MovieBooking.API
dotnet run
```
> API chạy tại: `http://localhost:5000` (Swagger: `http://localhost:5000/swagger`)

### Bước 5: Khởi động Frontend
```bash
cd Frontend
npm run dev
```
> Truy cập web tại: `http://localhost:3000` (hoặc cổng hiển thị trên terminal).

---

## 5. Cấu hình môi trường cần lưu ý (Environment Variables)

* **Backend (`Backend/MovieBooking.API/appsettings.json`):**
  ```json
  "ConnectionStrings": {
    "Redis": "localhost:6379"
  }
  ```
* **Frontend (`Frontend/.env`):**
  ```bash
  VITE_API_BASE_URL=http://localhost:5000/api
  ```

---

## 6. Danh sách kiểm tra chất lượng (Checklist)
- [x] Không còn magic string trong code backend (`ShowtimeStatus.Scheduled`).
- [x] Cache key Redis không bị xung đột phân trang.
- [x] Khung giờ chiếu và sơ đồ ghế hiển thị đúng dữ liệu thật từ database.
- [x] Đã kiểm tra build backend (.NET 8) và frontend (Vite/React) không có lỗi biên dịch.
