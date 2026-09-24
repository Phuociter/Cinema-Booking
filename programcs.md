# Báo Cáo Giải Thích Chi Tiết Cấu Hình Trong Program.cs

Tài liệu này giải thích chi tiết mục đích, ý nghĩa kiến trúc và tác dụng thực tế của từng dòng code được cấu hình trong [Program.cs](file:///d:/cinema/cinema2/Backend/MovieBooking.API/Program.cs).

---

## 1. Cấu hình AutoMapper

```csharp
builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());
```

- **Ý nghĩa kỹ thuật**: Đăng ký thư viện AutoMapper vào DI Container, đồng thời nạp hồ sơ ánh xạ [MappingProfile](file:///d:/cinema/cinema2/Backend/MovieBooking.Service/Mappings/MappingProfile.cs).
- **Tác dụng thực tế**: 
  - Tự động chuyển đổi dữ liệu hai chiều giữa các thực thể cơ sở dữ liệu (Entities: `Showtime`, `Movie`, `Auditorium`, `Cinema`...) và các đối tượng truyền dữ liệu (DTOs: `ShowtimeDto`, `ShowtimeSeatDto`...).
  - Giúp code sạch, tránh việc phải gán thủ công hàng chục thuộc tính (`dto.Title = entity.Title`), loại bỏ lỗi typo và ngăn chặn việc vô tình làm lộ các trường nhạy cảm trong Database ra ngoài API.

---

## 2. Đăng ký tầng Repositories (Kiến trúc 3 lớp)

```csharp
// 4. Register Repositories (3-layer architecture)
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IShowtimeRepository, ShowtimeRepository>();
builder.Services.AddScoped<IShowtimeSeatRepository, ShowtimeSeatRepository>();
```

### `builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));`
- **Ý nghĩa kỹ thuật**: Đăng ký mẫu Generic Repository mở (`open generic`) với vòng đời `Scoped` (mỗi HTTP Request nhận một instance độc lập và được giải phóng khi request kết thúc).
- **Tác dụng thực tế**: Cung cấp các thao tác CRUD cơ bản (`Add`, `Update`, `Delete`, `GetById`, `GetAll`) cho bất kỳ bảng dữ liệu nào trong database mà không cần phải viết lại code truy vấn lặp đi lặp lại.

### `builder.Services.AddScoped<IShowtimeRepository, ShowtimeRepository>();`
- **Ý nghĩa kỹ thuật**: Đăng ký Repository chuyên biệt cho bảng Suất chiếu (`showtimes`).
- **Tác dụng thực tế**: Đảm nhận các truy vấn phức tạp của lịch chiếu:
  - Nạp quan hệ bảng (`Include Movie, Auditorium, Cinema`).
  - Áp dụng các bộ lọc nghiệp vụ SQL (theo phim, theo rạp, theo ngày chính xác, theo khoảng ngày `dateFrom` đến `dateTo`).
  - Loại bỏ các suất chiếu quá khứ (`StartTime >= DateTime.UtcNow`).
  - Phân trang SQL hiệu năng cao (`Skip` / `Take`).

### `builder.Services.AddScoped<IShowtimeSeatRepository, ShowtimeSeatRepository>();`
- **Ý nghĩa kỹ thuật**: Đăng ký Repository chuyên biệt cho việc quản lý Ghế của suất chiếu.
- **Tác dụng thực tế**: Chịu trách nhiệm truy vấn sơ đồ 48 ghế thực tế của phòng chiếu tương ứng với suất chiếu được chọn, kiểm tra trạng thái ghế (đang trống, đang được tạm giữ, đã bán) để phục vụ việc hiển thị sơ đồ ghế và chọn chỗ.

---

## 3. Cấu hình Redis & Dịch vụ Redis Dùng Chung (Reusable Singleton)

```csharp
// 5. Register Redis Connection Multiplexer & Shared Redis Service (Singleton)
var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(sp =>
{
    var configuration = StackExchange.Redis.ConfigurationOptions.Parse(redisConnectionString, true);
    configuration.AbortOnConnectFail = false;
    return StackExchange.Redis.ConnectionMultiplexer.Connect(configuration);
});
builder.Services.AddSingleton<IRedisService, RedisService>();
```

### `var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";`
- **Ý nghĩa kỹ thuật**: Đọc chuỗi kết nối Redis từ [appsettings.json](file:///d:/cinema/cinema2/Backend/MovieBooking.API/appsettings.json). Nếu không tìm thấy, tự động dùng giá trị mặc định `localhost:6379`.
- **Tác dụng thực tế**: Đảm bảo tính linh hoạt môi trường: khi chạy local trên máy tính, chạy trong Docker container, hay đưa lên Cloud server chỉ cần đổi cấu hình mà không phải sửa code C#.

### `builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(...)`
- **Ý nghĩa kỹ thuật**: Đăng ký đối tượng quản lý kết nối socket Redis ở dạng **Singleton** (chỉ có duy nhất 1 kết nối mở trong toàn bộ vòng đời ứng dụng).
- **Cấu hình `AbortOnConnectFail = false`**: 
  - **Cực kỳ quan trọng**: Mặc định nếu Redis chưa kịp bật lúc API khởi động, `StackExchange.Redis` sẽ ném Exception làm sập (crash) toàn bộ ứng dụng ASP.NET.
  - Khi đặt `AbortOnConnectFail = false`, ứng dụng vẫn khởi động bình thường, và client Redis sẽ tự động âm thầm kết nối lại trong nền (auto-reconnect) ngay khi container Redis sẵn sàng.

### `builder.Services.AddSingleton<IRedisService, RedisService>();`
- **Ý nghĩa kỹ thuật**: Đăng ký dịch vụ dùng chung [IRedisService](file:///d:/cinema/cinema2/Backend/MovieBooking.Service/Interfaces/IRedisService.cs) dạng **Singleton**.
- **Tác dụng thực tế**:
  - Đóng gói toàn bộ thao tác Redis an toàn: `SetStringAsync` (hỗ trợ `SET NX EX`), `SetAsync<T>` / `GetAsync<T>` (tự động serialize/deserialize JSON), `RemoveAsync`, `ExistsAsync`.
  - Bất kỳ thành viên nào (Dev C giữ ghế 5 phút, Dev E giới hạn số lần đăng nhập sai, Dashboard cache doanh thu) chỉ việc inject `IRedisService` vào sử dụng, tuyệt đối không ai phải tự tạo kết nối Redis riêng lẻ.

---

## 4. Đăng ký Application Services (Tầng Nghiệp Vụ)

```csharp
// 6. Register Application Services
builder.Services.AddScoped<IScheduleService, ScheduleService>();
```

- **Ý nghĩa kỹ thuật**: Đăng ký Service nghiệp vụ quản lý lịch chiếu và ghế theo vòng đời `Scoped`.
- **Tác dụng thực tế**: 
  - Nằm ở tầng trung gian giữa Controller và Database Repository.
  - Kiểm tra và thực thi các quy tắc nghiệp vụ: ép buộc giới hạn `pageSize <= 20`, chuyển tiếp tham số lọc ngày (`dateFrom`, `dateTo`), điều phối dữ liệu ghế và trả về kết quả chuẩn hóa `PagedResult<ShowtimeDto>`.

---

## 5. Cấu hình CORS Policy (Cross-Origin Resource Sharing)

```csharp
// 6. Configure CORS Policy for Frontend (Vite / React)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:3001"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});
```

- **Ý nghĩa kỹ thuật**: Định nghĩa chính sách bảo mật CORS tên là `"AllowFrontend"`.
- **Tác dụng thực tế**:
  - Trình duyệt web có cơ chế bảo mật *Same-Origin Policy* mặc định chặn mọi HTTP request từ cổng này sang cổng khác (ví dụ: Frontend chạy ở `http://localhost:3001` gọi API sang Backend ở `http://localhost:5000`).
  - Khai báo này thông báo cho trình duyệt: cho phép các ứng dụng Frontend chạy ở các port `5173`, `3000`, `3001` được phép gửi request (`GET`, `POST`, `PUT`, `DELETE`), mang theo Headers và JWT Authentication token vào Backend mà không bị lỗi `blocked by CORS policy`.
