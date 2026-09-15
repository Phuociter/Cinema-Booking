# 🚀 Hướng Dẫn Cấu Hình Môi Trường & Khởi Tạo Database (Project Cinema2)

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường, chạy container PostgreSQL trong Docker, khởi tạo 21 bảng CSDL và nạp dữ liệu mồi (Seed Data) cho dự án Cinema2.

---

## 🛠️ 1. Yêu Cầu Môi Trường (Prerequisites)

* **Docker Desktop**: Đã bật và đang chạy.
* **.NET 8 SDK**: Đã cài đặt trên máy.
* **Node.js (v20 trở lên)**: Dùng cho ứng dụng Frontend React 19 / Vite 7.
* **DBeaver** (Tùy chọn): Công cụ quản trị CSDL trực quan.
* **MoMo Developer Test Tool**: Tải ứng dụng/công cụ test MoMo tại [MoMo Developers](https://developers.momo.vn/v3/download/) để test luồng thanh toán Sandbox.

---

## ⚙️ 2. Cấu Hình Biến Môi Trường (`.env`)

Tệp cấu hình `.env` được đặt tại thư mục gốc `d:\cinema\cinema2\.env`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=cinema_db
POSTGRES_PORT=5432
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters_long
```

---

## 🐳 3. Khởi Động Container PostgreSQL

Mở terminal tại thư mục `d:\cinema\cinema2` và thực thi lệnh:

```bash
docker compose up postgres -d
```

*Kiểm tra container đang chạy:*
```bash
docker ps
```
*(Bạn sẽ thấy container `cinema-postgres` hoạt động tại cổng `5432`).*

---

## 🗄️ 4. Hướng Dẫn Khởi Tạo CSDL & Nạp Dữ Liệu Mồi (Seed Data)

### 📌 Phương Án A: Dùng Windows PowerShell (Khuyên Dùng Trên Windows)

Đứng tại thư mục `d:\cinema\cinema2` và chạy 2 lệnh sau:

**Bước 1: Khởi tạo 21 bảng CSDL (Schema):**(khi đang đứng ở folder cinema2)
```powershell
Get-Content ./data/movie_booking_schema.sql -Raw -Encoding utf8 | docker exec -i cinema-postgres psql -U postgres -d cinema_db
```

**Bước 2: Nạp toàn bộ dữ liệu mồi (Seed Data):**
```powershell
Get-Content ./data/movie_booking_seed_data.sql -Raw -Encoding utf8 | docker exec -i cinema-postgres psql -U postgres -d cinema_db
```

---

### 📌 Phương Án B: Dùng Git Bash / WSL / Linux / macOS

Đứng tại thư mục `d:\cinema\cinema2` và chạy 2 lệnh sau:

**Bước 1: Khởi tạo 21 bảng CSDL (Schema):**
```bash
docker exec -i cinema-postgres psql -U postgres -d cinema_db < ./data/movie_booking_schema.sql
```

**Bước 2: Nạp toàn bộ dữ liệu mồi (Seed Data):**
```bash
docker exec -i cinema-postgres psql -U postgres -d cinema_db < ./data/movie_booking_seed_data.sql
```

---

## 🔑 5. Danh Sách Tài Khoản Mẫu (Default Login Accounts)

Sau khi nạp file Seed thành công, bạn có thể dùng các tài khoản sau để đăng nhập và test hệ thống:

| Vai Trò (Role) | Email | Mật Khẩu (Password) | Ghi Chú |
|---|---|---|---|
| **Admin** | `admin@example.com` | `admin` | Tài khoản Quản trị viên hệ thống |
| **Customer (Demo 1)** | `khachhang1@example.com` | `123456` | Khách hàng mẫu số 1 |
| **Customer (Demo 2-20)** | `khachhang2@example.com` ... `khachhang20@example.com` | `123456` | Danh sách 19 khách hàng mẫu tiếp theo |

---

## 💻 6. Hướng Dẫn Khởi Chạy Backend & Frontend

### 1. Khởi chạy Backend ASP.NET Core 8 Web API:
```bash
cd d:\cinema\cinema2\Backend\MovieBooking.API
dotnet run
```
* Trang Swagger UI tra cứu API sẽ chạy tại: `http://localhost:5000/swagger` (hoặc port được gán tự động).

### 2. Khởi chạy Frontend React 19 / Vite 7:
```bash
cd d:\cinema\cinema2\Frontend
npm run dev
```
* Giao diện Website sẽ chạy tại: `http://localhost:3001`

---

## 🔌 7. Cấu Hình Kết Nối Công Cụ DBeaver (Tùy Chọn)

* **Host:** `localhost`
* **Port:** `5432`
* **Database:** `cinema_db`
* **Username:** `postgres`
* **Password:** `postgres`
* **⚠️ LƯU Ý BẮT BUỘC:** Trong phần thiết lập kết nối của DBeaver (Driver Properties / PostgreSQL settings), hãy tích chọn ô **`Show all databases`** để DBeaver hiển thị `cinema_db` và 21 bảng trong schema `public`.

---

## 💳 8. Kiểm Thử Luồng Thanh Toán MoMo (Sandbox Testing)

* **Tài liệu & Công cụ Test MoMo:** Truy cập trang tải ứng dụng/công cụ giả lập thanh toán tại [MoMo Developers](https://developers.momo.vn/v3/download/).
* **Tài Khoản Test MoMo Sandbox Dùng Chung:**
  - **Số điện thoại:** `0968143221`
  - **Mã xác thực (OTP):** `000000`
  - **Mật khẩu (PIN):** `000000`
* **Mục đích:** Đăng nhập vào App MoMo Sandbox để thực hiện quét mã QR/thanh toán thử nghiệm và kiểm thử tiếp nhận IPN Webhook tự động trong quá trình phát triển.
