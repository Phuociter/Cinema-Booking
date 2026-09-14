# 🎬 Cinema – Web Đặt Vé Xem Phim

Một ứng dụng web đặt vé xem phim được phát triển bằng **ReactJS** (Vite + Tailwind CSS) và Backend **.NET / ASP.NET Core** kết hợp cơ sở dữ liệu **PostgreSQL**.
Hệ thống hỗ trợ xem trailer, chọn suất chiếu, chọn ghế trực quan, đặt vé và thanh toán trực tuyến.

---

## 🚀 Công nghệ sử dụng
- ⚡ **Vite** – Bundler siêu nhanh cho React.
- ⚛ **ReactJS (React 19)** – Thư viện UI hiện đại.
- 🎨 **Tailwind CSS 4** – Thiết kế giao diện responsive và hiện đại.
- 🐘 **PostgreSQL 16** – Hệ quản trị cơ sở dữ liệu quan hệ (21 bảng chuẩn hóa).
- 🐳 **Docker & Docker Compose** – Triển khai môi trường Database và Backend nhanh chóng.
- 🎥 **YouTube Data API + react-youtube** – Xem trailer phim chất lượng cao.
- 🛠 **React Router** – Điều hướng Single Page Application.
- 🔥 **Lucide-react** – Bộ icon chất lượng cao.

---

## ✨ Tính năng chính
- 📽 **Xem trailer** với giao diện tùy chỉnh.
- 🎟 **Đặt vé xem phim** nhanh chóng và trực quan.
- 🗓 **Chọn suất chiếu** và sơ đồ ghế ngồi chi tiết.
- ❤️ **Lưu phim yêu thích**.
- 📱 **Responsive** mượt mà trên mọi kích thước màn hình.
- 🎨 Giao diện hiện đại, hiệu ứng thị giác tối ưu.

---

## 📚 Hướng Dẫn Tài Liệu & Phân Chia Task Cho Team (5 Devs)

Để các thành viên trong team làm việc độc lập, song song và không bị xung đột mã nguồn, vui lòng đọc tài liệu theo đúng thứ tự sau:

### 1. Thứ tự đọc tài liệu (Reading Roadmap)

| Thứ tự | Tài liệu | Mục tiêu & Nội dung |
|:---:|---|---|
| **Bước 1** | [docs/team_task_assignment_and_business_logic.md](docs/team_task_assignment_and_business_logic.md) | **Bắt buộc đọc đầu tiên**: Nắm sơ đồ luồng nghiệp vụ (Đặt vé, Thanh toán, Đăng ký/Đăng nhập) và xem chi tiết nhiệm vụ của mình (Dev A, B, C, D, hay E). |
| **Bước 2** | [data/movie_booking_schema.sql](data/movie_booking_schema.sql) | **Đối chiếu CSDL**: Tìm đến nhóm bảng phụ trách (Group 1 đến Group 5) để nắm rõ tên bảng, cột, khóa ngoại và quy tắc Soft Delete / Status. |
| **Bước 3** | [docs/aspnet_project_structure_setup.md](docs/aspnet_project_structure_setup.md) | **Cẩm nang code & tra cứu**: Tham khảo code mẫu C# của 22 Entities, DbContext Fluent API, cách dùng `DateTime.UtcNow`, JWT và xử lý ngoại lệ Middleware. |
| **Bước 4** | [docs/aspnet_backend_business_flow.md](docs/aspnet_backend_business_flow.md) | **Tài liệu nâng cao (Tùy chọn)**: Dành cho Dev C/D muốn tìm hiểu sâu về cơ chế giữ ghế bằng Redis và background job Hangfire. |


## 🐳 Hướng dẫn cài đặt & chạy Cơ sở dữ liệu (PostgreSQL qua Docker)

### 1. Cấu hình biến môi trường
Tạo file `.env` tại thư mục gốc của dự án hoặc bên trong thư mục `Backend/`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=cinema_db
POSTGRES_PORT=5432
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters_long
```

---

### 2. Khởi chạy PostgreSQL Container
Tại thư mục gốc dự án (`d:\cinema\cinema2`), chạy lệnh:

```bash
docker compose up postgres -d
```

Kiểm tra trạng thái container:
```bash
docker ps
```

---

### 3. Nạp dữ liệu & Khởi tạo Database Schema (21 bảng)

**Chạy bằng PowerShell (Windows):**
```powershell
Get-Content ./data/movie_booking_schema.sql -Raw -Encoding utf8 | docker exec -i cinema-postgres psql -U postgres -d cinema_db
```

**Chạy bằng Git Bash / Linux / macOS:**
```bash
docker exec -i cinema-postgres psql -U postgres -d cinema_db < ./data/movie_booking_schema.sql
```

**Kiểm tra danh sách bảng đã tạo:**
```bash
docker exec -it cinema-postgres psql -U postgres -d cinema_db -c "\dt"
```

---

### 4. Kết nối qua DBeaver / GUI Tools
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `cinema_db`
- **Username**: `postgres`
- **Password**: `postgres` (hoặc giá trị trong file `.env`)
- *Lưu ý trong DBeaver*: Tích chọn ô **`Show all databases`** trong cấu hình kết nối để hiển thị `cinema_db`. Toàn bộ 21 bảng nằm trong mục `Schemas` -> `public` -> `Tables`.

---

### 5. Dừng hoặc khởi động lại Database
- Dừng container: `docker compose stop postgres`
- Khởi động lại: `docker compose start postgres`
- Dừng và gỡ bỏ container: `docker compose down` (dữ liệu vẫn được bảo lưu an toàn trong Docker Volume `pgdata`)

---

## 💻 Hướng dẫn chạy Frontend

1. Di chuyển vào thư mục Frontend:
   ```bash
   cd Frontend
   ```
2. Cài đặt các gói phụ thuộc (nếu chưa cài):
   ```bash
   npm install
   ```
3. Khởi chạy máy chủ phát triển (cổng 3001):
   ```bash
   npm run dev
   ```
4. Mở trình duyệt tại: `http://localhost:3001`
