# 🔐 HƯỚNG DẪN KIẾN TRÚC & TÍCH HỢP HYBRID AUTHENTICATION
## (LOCAL DATABASE + CLERK SSO) — DÀNH CHO TOÀN BỘ DEV TEAM

> **Tài liệu tham chiếu:** Phân hệ Xác thực & Quản trị Người dùng (Dev E chủ trì, các Dev A-D phối hợp sử dụng).  
> **Phiên bản:** v1.1 — Cập nhật hỗ trợ đăng nhập xã hội qua Clerk SSO và đồng bộ tự động vào PostgreSQL.

---

## 🎯 1. TỔNG QUAN KIẾN TRÚC: HYBRID AUTH LÀ GÌ?

Trước đây, hệ thống chỉ hỗ trợ **Local Authentication** (Email & Password mã hóa BCrypt lưu trong PostgreSQL).  
Kiến trúc mới triển khai mô hình **Hybrid Authentication** (Kết hợp Đăng nhập nội bộ + Đăng nhập xã hội SSO qua Clerk):

1. **Người dùng truyền thống:** Tiếp tục đăng ký, đăng nhập bằng Email/Password thông thường qua `/api/auth/register` và `/api/auth/login`.
2. **Người dùng SSO (Google, Github...):** Đăng nhập qua widget Clerk ở Frontend ➔ Frontend nhận Clerk Session Token ➔ Gửi token về Backend `/api/auth/clerk-sync` ➔ Backend xác thực, tự động liên kết/tạo User trong DB và cấp lại **Internal JWT Token chuẩn** của hệ thống.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND (REACT)                                     │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│           Nhánh 1: Local Auth             │              Nhánh 2: Clerk SSO            │
│  • Nhập Email + Password                  │  • Bấm nút Đăng nhập Google / Clerk        │
│  • Gọi useAuth().login(payload)           │  • Nhận Clerk Session Token từ SDK Clerk   │
│  • Gửi POST /api/auth/login               │  • Gọi useAuth().loginWithClerk(token)     │
│                                           │  • Gửi POST /api/auth/clerk-sync           │
└─────────────────────┬─────────────────────┴──────────────────────┬─────────────────────┘
                      │                                            │
                      ▼                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (ASP.NET CORE 8 API)                              │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│           Scheme: InternalJwt             │             Scheme: ClerkJwt               │
│  • Đọc DB Users, Verify BCrypt Password   │  • Xác thực JWT Clerk qua JWKS URL         │
│  • Cấp JWT nội bộ (Secret Key)            │  • Kiểm tra claim email_verified == "true" │
│                                           │  • Tìm User theo ClerkId hoặc Email:       │
│                                           │    - Đã có Email ➔ Liên kết clerk_id       │
│                                           │    - Chưa có ➔ Tạo User mới (Customer)     │
│                                           │  • Cấp lại JWT NỘI BỘ (InternalJwt)        │
└─────────────────────┬─────────────────────┴──────────────────────┬─────────────────────┘
                      │                                            │
                      └──────────────────────┬─────────────────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    KẾT QUẢ ĐỒNG NHẤT                                   │
│  • Frontend luôn nhận được cùng 1 định dạng: { token: "<INTERNAL_JWT>", user: {...} }  │
│  • AuthContext lưu token vào localStorage ('cinema_access_token')                      │
│  • Mọi API phía sau (Đặt vé, Giữ ghế, Thanh toán) KHÔNG CẦN BIẾT user đăng nhập kiểu gì!│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ 2. THAY ĐỔI CƠ SỞ DỮ LIỆU (POSTGRESQL)

Toàn bộ migration đã được tích hợp gọn vào **[data/update_database.sql](file:///d:/cinema/cinema2/data/update_database.sql)**.

### Chi tiết thay đổi bảng `users`:
* **`password_hash`:** Chuyển sang cho phép `NULL` (vì user tạo từ Clerk SSO không có mật khẩu nội bộ).
* **`auth_provider`:** `VARCHAR(20) NOT NULL DEFAULT 'local'` (giá trị: `'local'` hoặc `'clerk'`).
* **`clerk_id`:** `VARCHAR(100) NULL` kèm ràng buộc duy nhất `uq_users_clerk_id`.
* **Constraint toàn vẹn:** `chk_users_has_at_least_one_auth` bảo đảm mọi user bắt buộc phải có ít nhất 1 cách đăng nhập:
  $$\text{password\_hash IS NOT NULL} \quad\lor\quad \text{clerk\_id IS NOT NULL}$$

### Lệnh chạy cập nhật Database cho Dev mới:
```bash
docker exec -i cinema-postgres psql -U postgres -d cinema_db < data/update_database.sql
```

---

## ⚙️ 3. BACKEND: CƠ CHẾ DUAL JWT & ENDPOINT MỚI

### A. Cấu hình Dual Authentication Schemes ([Program.cs](file:///d:/cinema/cinema2/Backend/MovieBooking.API/Program.cs))
Backend được cấu hình 2 scheme JWT chạy song song:
1. **`InternalJwt` (Default Scheme):** Dùng để bảo vệ tất cả các API của Dev A, B, C, D, E (`/api/bookings`, `/api/movies`, `/api/payments`...).
2. **`ClerkJwt`:** Dùng riêng cho endpoint đồng bộ Clerk SSO. Scheme này đọc cấu hình `CLERK_FRONTEND_API_URL` từ file `.env` để tự động tải public keys (JWKS) từ server Clerk về giải mã và kiểm tra chữ ký token.

### B. Endpoint Đồng Bộ Tài Khoản: `POST /api/auth/clerk-sync`
* **Quyền hạn:** `[Authorize(AuthenticationSchemes = "ClerkJwt")]` — Bắt buộc phải đính kèm token Clerk ở Header:
  ```http
  Authorization: Bearer <clerk_session_token>
  ```
* **Quy trình xử lý nghiệp vụ:**
  1. Trích xuất claims: `sub` (Clerk ID), `email`, `email_verified`, `name`.
  2. **Bảo mật Account Linking:** Bắt buộc kiểm tra claim `email_verified == "true"`. Nếu email chưa xác thực, từ chối ngay với mã `400 Bad Request` để phòng chống tấn công mạo danh email.
  3. **Truy vấn DB:**
     * *Trường hợp 1 (Đã đồng bộ trước đó):* Tìm thấy theo `ClerkId` ➔ Cập nhật họ tên, avatar và cấp JWT nội bộ.
     * *Trường hợp 2 (User cũ dùng Email Local nay đăng nhập Google/Clerk):* Tìm thấy theo `Email` ➔ Tự động gắn thêm `clerk_id = sub` (Account Linking), giữ nguyên `password_hash` cũ. User từ nay có thể đăng nhập bằng **cả 2 cách**.
     * *Trường hợp 3 (User hoàn toàn mới):* Tạo bản ghi mới trong bảng `Users` với `auth_provider = "clerk"`, `password_hash = null`, và tự động gán vai trò **`Customer`** qua helper `AssignCustomerRoleAsync`.
  4. Bọc `try / catch (DbUpdateException)` để bắt trường hợp race condition khi 2 request sync bắn tới cùng thời điểm.
  5. Cấp phát và trả về **Internal JWT Token** có hạn dùng 24h chứa `UserId` (Guid) và `Role`.

### C. Lưu ý khi gọi `POST /api/auth/login` thông thường
Hàm `Login` nội bộ đã được gia cố:
* Nếu user đăng nhập bằng email nhưng tài khoản đó được tạo qua Clerk (`password_hash == null`), hệ thống sẽ trả về `401 Unauthorized` kèm thông báo: *"Tài khoản này được đăng ký qua Google/Clerk. Vui lòng đăng nhập bằng phương thức liên kết."* thay vì bị crash 500 do hàm BCrypt.

---

## 💻 4. FRONTEND: SERVICE & CONTEXT HOOKS

### A. Cấu hình Axios Request Interceptor ([axiosInstance.js](file:///d:/cinema/cinema2/Frontend/src/api/axiosInstance.js))
Interceptor được tinh chỉnh để tôn trọng Header truyền thủ công:
* Nếu request đã có sẵn `headers.Authorization` (như khi truyền Clerk token vào hàm `clerkSync`), interceptor sẽ **không ghi đè** bằng token cũ trong `localStorage`.

### B. Hàm API Client ([useAccount.js](file:///d:/cinema/cinema2/Frontend/src/api/useAccount.js))
```javascript
export const accountApi = {
  // Đồng bộ Clerk Session Token với Backend MovieBooking API
  async clerkSync(clerkToken) {
    return request(() =>
      axiosInstance.post(
        '/auth/clerk-sync',
        {},
        {
          headers: {
            Authorization: `Bearer ${clerkToken}`,
          },
        }
      )
    );
  },
  // ... các hàm login, register, getProfile giữ nguyên
};
```

### C. State Quản lý Đăng nhập ([AuthContext.jsx](file:///d:/cinema/cinema2/Frontend/src/auth/AuthContext.jsx))
Bổ sung hàm `loginWithClerk(clerkToken)` vào hook `useAuth()`:
```javascript
const { user, isAuthenticated, login, register, loginWithClerk, logout } = useAuth();
```
* Khi gọi `loginWithClerk(token)`, Context sẽ gọi `accountApi.clerkSync`, nhận về Internal JWT + User Info, tự động lưu vào `localStorage` dưới key `cinema_access_token` và cập nhật state React toàn cục.

---

## 🛠️ 5. HƯỚNG DẪN CHO CÁC DEV KHI LÀM VIỆC TIẾP

### 👤 Dành cho Dev E (Hoàn thiện UI Auth & Profile):
1. **Gắn nút Đăng nhập Clerk vào `AuthModal.jsx`:**
   * Trong modal đăng nhập, thêm nút *"Đăng nhập với Google / Clerk"*.
   * Lấy token từ Clerk (ví dụ qua hook `useClerk()` hoặc `useSession()` của `@clerk/clerk-react`):
     ```javascript
     const { session } = useSession();
     const { loginWithClerk } = useAuth();
     
     const handleClerkSuccess = async () => {
       const clerkToken = await session.getToken();
       await loginWithClerk(clerkToken);
       // Đã có token nội bộ -> đóng modal, chuyển hướng!
     };
     ```
2. **Xử lý `AccountTab.jsx` (Tuần 2):**
   * Nếu user có `auth_provider === 'clerk'`, ẩn form "Đổi mật khẩu" hoặc hiển thị thành "Tạo mật khẩu đăng nhập nội bộ".

### 👥 Dành cho Dev A, Dev B, Dev C, Dev D:
* **KHÔNG CẦN SỬA ĐỔI BẤT KỲ CODE NÀO.**
* Toàn bộ API nghiệp vụ (`/api/bookings`, `/api/showtimes/hold-seats`, `/api/cinemas`...) tiếp tục gọi như bình thường:
  ```javascript
  // axiosInstance sẽ tự động đính kèm token nội bộ
  const booking = await bookingApi.createBooking(payload);
  ```
* Dù khách đăng nhập bằng Clerk hay Email/Password, Backend luôn nhận diện được `UserId` và `Customer Role` qua `User.FindFirst(ClaimTypes.NameIdentifier)`.

---

## 📌 6. CHECKLIST BIẾN MÔI TRƯỜNG (.ENV) CẦN CÓ

Khi clone repo hoặc setup máy mới, cần cấu hình các biến sau:

**Backend (`Backend/MovieBooking.API/.env` hoặc `launchSettings.json`):**
```ini
JWT_SECRET=super_secret_key_for_dev_1234567890
CLERK_FRONTEND_API_URL=https://[domain-clerk-của-bạn].clerk.accounts.dev
```

**Frontend (`Frontend/.env`):**
```ini
VITE_API_BASE_URL=http://localhost:5000/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```
*(Nếu `VITE_CLERK_PUBLISHABLE_KEY` chưa được điền, `main.jsx` sẽ tự động fallback chạy chế độ Local Auth thuần túy mà không bị lỗi crash app).*
