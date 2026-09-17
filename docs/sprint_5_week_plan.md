# 📋 Kế Hoạch Sprint 5 Tuần — Cinema Booking System
## Phân công Fullstack Vertical Ownership cho 5 Dev

> **Nguyên tắc xuyên suốt:** Mỗi Dev sở hữu 1 flow nghiệp vụ trọn vẹn (DB → Backend → Frontend) từ Tuần 1 đến Tuần 5, không đổi người giữa các tuần. Cuối mỗi tuần là 1 bản Release nội bộ — người phụ trách phải tự test đầu-cuối (E2E) phần việc của mình trước khi báo cáo "Done", không release kèm bug đã biết.
>
> **Định nghĩa "Done" chung cho mọi task:** API test qua Swagger/Postman trả đúng dữ liệu thật từ DB (không phải mock) + UI hiển thị đúng dữ liệu đó không lỗi console + đã tự đi lại toàn bộ luồng thao tác bằng tay ít nhất 1 lần trước khi báo cáo.
>
> **Khung dự án (5 tuần đầu) là Sprint 1 — Feature Complete / Code Freeze**, không phải bản nộp cuối cùng. Tổng deadline đồ án là 11 tuần: hết Tuần 5, toàn bộ tính năng phải chạy được đầu-cuối bằng dữ liệu thật, nhưng **Tuần 6-11 là Sprint 2 — Hardening, E2E stress test, viết báo cáo đồ án & rehearsal demo**, không phải thời gian buông lỏng. Nhãn "v1.0" ở Tuần 5 nghĩa là "đủ tính năng để test", không phải "đã sẵn sàng nộp".

## 🧱 Ngày 0 — Trước khi 5 Dev bắt đầu Tuần 1 (Tech Lead làm riêng)

Để tránh cả 5 dev cùng sửa vào file định tuyến/layout chung ngay từ ngày đầu (xung đột Git liên tục), cần chốt rõ quyền sở hữu file dùng chung:
- `App.jsx`, `Navbar.jsx`, `Footer.jsx`, `MainLayout.jsx`: **đã tồn tại sẵn trong code** (route cho 12 trang Client + 6 trang Admin, `<Toaster />`, tự ẩn Navbar/Footer ở `/admin/*`). Giao **Dev E bảo trì** — không cần ai dựng lại từ đầu, chỉ cần Dev E là người duy nhất được sửa các file này khi có route mới phát sinh; 4 dev còn lại chỉ import trang của mình vào route đã có sẵn, không tự sửa `App.jsx`.
- 4 file component con đã thống nhất trước đó: `SeatMap.jsx`, `BookingSummary.jsx`, `AccountTab.jsx`, `BookingHistoryTab.jsx` (rỗng, chỉ export placeholder) — kiểm tra đã tồn tại đúng vị trí trong code, nếu chưa thì Tech Lead tạo trước Tuần 1.
- Migration `InitialCreate` + seed 38.400 record, setup Redis local, cài `axios` + `.env` + khung 8 file `use*.js`.

**Quy tắc:** chỉ Dev E được sửa `App.jsx`/`MainLayout.jsx` trực tiếp; 4 dev còn lại thêm route/trang mới qua yêu cầu Dev E cập nhật, không tự ý sửa file này để tránh conflict xuyên suốt 5 tuần.

---

## 👤 DEV A — Flow Phim & Nghệ Thuật
**Sở hữu xuyên suốt:** `Movies`, `Genres`, `MovieGenres`, `Directors`, `MovieDirectors`, `Actors`, `MovieActors`

### Tuần 1 — Foundation Read APIs
| | Nội dung |
|---|---|
| **Input** | DB schema đã migrate + seed 38.400 record; route map `backend_api_routes_map.md` |
| **Việc BE** | `MovieService.cs`, `MoviesController.cs`: `GET /api/movies` (filter `now_showing`/`coming_soon`, search, phân trang), `GET /api/movies/{id}` (kèm Genres/Directors/Actors), `GET /api/genres` |
| **Việc FE** | `useMovies.js` (`getAllMovies`, `getMovieById`, `getGenres`); `Home.jsx` (banner + list phim); `Movies.jsx` (danh sách + filter thể loại) |
| **Output** | 2 API GET chạy thật qua Swagger trả đúng data seed; `Home.jsx`/`Movies.jsx` render danh sách phim thật, không dùng mock |
| **Test tự làm trước khi release** | Gọi API bằng Postman kiểm tra phân trang + filter đúng; mở FE, đổi filter thể loại, kiểm tra danh sách cập nhật đúng, không lỗi console |
| **DoD** | Trang chủ hiển thị đúng phim từ DB thật, click vào 1 phim không lỗi 404 |

### Tuần 2 — Movie Detail & Admin CRUD
| | Nội dung |
|---|---|
| **Input** | Kết quả Tuần 1; API `GET /api/showtimes` của Dev C (để nhúng lịch chiếu vào trang chi tiết phim) |
| **Việc BE** | `POST /api/movies`, `PUT /api/movies/{id}`, `DELETE /api/movies/{id}` (soft delete) |
| **Việc FE** | `MovieDetail.jsx` (trailer, diễn viên, đạo diễn, lịch chiếu — gọi `useShowtimes` của Dev C); `admin/AdminMovies.jsx` (form thêm/sửa/xóa phim) |
| **Output** | Admin thêm được 1 phim mới từ UI, phim đó xuất hiện ngay ở `Home.jsx`; xóa phim thì biến mất khỏi danh sách (soft delete) |
| **Test tự làm** | Thêm/sửa/xóa 1 phim test qua Admin UI, xác nhận đồng bộ đúng xuống DB (`deleted_at` có giá trị khi xóa); kiểm tra `MovieDetail.jsx` không vỡ layout khi phim không có lịch chiếu |
| **DoD** | Toàn bộ CRUD phim hoạt động qua UI, không cần Postman để test tay |

### Tuần 3 — Hoàn thiện dữ liệu & phối hợp Hold flow
| | Nội dung |
|---|---|
| **Input** | Dev C đang xây dựng Hold Engine (Redis) — Dev A cần đảm bảo `MovieDetail.jsx` hiển thị đúng `showtimeId` để bấm sang `/booking/:showtimeId` |
| **Việc BE** | Rà soát lại query performance `GET /api/movies` (thêm index nếu cần khi data lớn); không có API mới |
| **Việc FE** | Nút "Đặt vé" trên `MovieDetail.jsx` link đúng sang `/booking/:showtimeId`; polish UI danh sách phim (loading state, empty state) |
| **Output** | Luồng bấm từ trang phim → chọn suất chiếu → sang trang đặt vé chạy mượt, không lỗi điều hướng |
| **Test tự làm** | Đi thử toàn bộ luồng: `Home` → `MovieDetail` → chọn suất chiếu → vào đúng `/booking/:id` |
| **DoD** | Không còn link chết, không còn state loading treo vô hạn |

### Tuần 4 — Báo cáo Top Movies
| | Nội dung |
|---|---|
| **Input** | `Bookings`/`Tickets` đã có dữ liệu thật từ Dev D (checkout flow đã chạy) |
| **Việc BE** | `GET /api/reports/top-movies` (Top 10 phim theo doanh thu/số vé bán, join `Movies` + `Tickets` + `Bookings`) |
| **Việc FE** | Không có UI riêng — API này được `Dashboard.jsx` của Dev E gọi |
| **Output** | API trả đúng Top 10 phim, có số liệu thật (không phải số 0 do thiếu join) |
| **Test tự làm** | Tạo vài đơn đặt vé test, gọi lại API xác nhận số liệu tăng đúng theo đơn vừa tạo |
| **DoD** | Dev E xác nhận gọi API này thành công, hiển thị đúng lên Dashboard |

### Tuần 5 — Bugfix & Final Polish
| | Nội dung |
|---|---|
| **Input** | Toàn bộ bug report từ Tuần 1-4 (của chính mình và feedback từ team khi test E2E) |
| **Việc BE + FE** | Sửa toàn bộ bug tồn đọng thuộc phạm vi Movie/Genre/Director/Actor; kiểm tra lại responsive UI |
| **Output** | Flow Phim & Nghệ thuật không còn bug đã biết |
| **Test tự làm** | Chạy lại toàn bộ luồng từ đầu (trang chủ → chi tiết phim → đặt vé) trên cả Chrome desktop và mobile viewport |
| **DoD** | Release cuối cùng: 0 bug đã biết, sẵn sàng demo |

---

## 👤 DEV B — Flow Cụm Rạp & Phòng Chiếu
**Sở hữu xuyên suốt:** `Cinemas`, `Auditoriums`, `SeatTypes`, `Seats`

### Tuần 1
| | Nội dung |
|---|---|
| **Input** | DB đã seed |
| **Việc BE** | `CinemaService.cs`, `CinemasController.cs`: `GET /api/cinemas` (lọc `city`), `GET /api/cinemas/{id}`, `GET /api/auditoriums/{id}/seats` |
| **Việc FE** | `useCinemas.js`; `Theaters.jsx` (danh sách rạp theo khu vực) |
| **Output** | Trang `/cinemas` hiển thị đúng danh sách rạp thật từ DB |
| **Test tự làm** | Lọc theo từng thành phố trong seed data, xác nhận đúng kết quả |
| **DoD** | Không có rạp nào hiển thị sai thành phố |

### Tuần 2
| | Nội dung |
|---|---|
| **Input** | Kết quả Tuần 1 |
| **Việc BE** | `POST /api/cinemas`, `POST /api/auditoriums` (tự sinh ma trận ghế vật lý theo `SeatType`); `DELETE /api/cinemas/{id}` (trigger cascade soft-delete `Auditoriums`) |
| **Việc FE** | `admin/AdminCinemas.jsx` (thêm rạp, thêm phòng chiếu, xem lại sơ đồ ghế vừa sinh) |
| **Output** | Admin tạo 1 rạp mới + 1 phòng chiếu, hệ thống tự sinh đúng số ghế theo cấu hình hàng/cột |
| **Test tự làm** | Tạo phòng 6x8, xác nhận đúng 48 ghế được insert vào `Seats`; xóa rạp, xác nhận `Auditoriums` liên quan tự soft-delete theo (test trigger DB) |
| **DoD** | Sinh ghế tự động không bị lệch số lượng, trigger cascade hoạt động đúng |

### Tuần 3
| | Nội dung |
|---|---|
| **Input** | Dev C cần API `GET /api/auditoriums/{id}/seats` ổn định để dựng `SeatMap.jsx` |
| **Việc BE** | Không có API mới — hỗ trợ Dev C nếu cần format dữ liệu ghế đúng chuẩn (`seatType.color_code` để FE tô màu) |
| **Việc FE** | Polish `Theaters.jsx` (thêm ảnh, mô tả rạp); không có task mới lớn |
| **Output** | Xác nhận `SeatMap.jsx` của Dev C dùng đúng data ghế của mình, không bị lệch định dạng |
| **Test tự làm** | Phối hợp Dev C test chung 1 lần: load `/booking/:showtimeId`, xem sơ đồ ghế đúng loại/màu |
| **DoD** | Dev C xác nhận không có vấn đề dữ liệu ghế |

### Tuần 4
| | Nội dung |
|---|---|
| **Input** | `ShowtimeSeats` đã có dữ liệu bán thật |
| **Việc BE** | `GET /api/reports/occupancy-rates` (tỷ lệ lấp đầy ghế theo từng rạp, join `ShowtimeSeats`) |
| **Việc FE** | Không có UI riêng — phục vụ `Dashboard.jsx` của Dev E |
| **Output** | API trả đúng % lấp đầy theo rạp |
| **Test tự làm** | Đặt vài vé test ở 1 rạp cụ thể, xác nhận % tăng đúng |
| **DoD** | Dev E xác nhận tích hợp thành công vào Dashboard |

### Tuần 5
| | Nội dung |
|---|---|
| **Việc BE + FE** | Sửa bug tồn đọng phạm vi Cinema/Auditorium/Seat; kiểm tra responsive `AdminCinemas.jsx` |
| **Test tự làm** | Chạy lại toàn bộ luồng tạo rạp → tạo phòng → xem sơ đồ ghế |
| **DoD** | 0 bug đã biết |

---

## 👤 DEV C — Flow Lịch Chiếu & Giữ Ghế Real-time
**Sở hữu xuyên suốt:** `Showtimes`, `ShowtimeSeats`

### Tuần 1
| | Nội dung |
|---|---|
| **Input** | Dữ liệu `Auditoriums`/`Seats` của Dev B (đã seed sẵn cho tuần 1, chưa cần API thật của Dev B chạy xong) |
| **Việc BE** | `ScheduleService.cs`, `ShowtimesController.cs`: `GET /api/showtimes` (lọc `movieId`/`cinemaId`/`date`), `GET /api/showtimes/{id}/seats` |
| **Việc FE** | `useShowtimes.js`; khung tĩnh `SeatMap.jsx` (chỉ render lưới ghế, chưa có click chọn) |
| **Output** | API trả đúng sơ đồ ghế thật (available/reserved) theo suất chiếu |
| **Test tự làm** | Gọi API với vài `showtimeId` khác nhau trong seed, xác nhận đúng số ghế/loại ghế |
| **DoD** | `SeatMap.jsx` render đúng lưới ghế tĩnh từ data thật |

### Tuần 2
| | Nội dung |
|---|---|
| **Input** | Kết quả Tuần 1 |
| **Việc BE** | `POST /api/showtimes` (tự sinh `ShowtimeSeats` khi tạo suất chiếu mới), `PUT /api/showtimes/{id}/cancel` |
| **Việc FE** | `admin/AdminShowtimes.jsx` (form xếp lịch chiếu, chọn phim + phòng + giờ) |
| **Output** | Admin tạo 1 suất chiếu mới, hệ thống tự sinh đúng số `ShowtimeSeats` = số ghế vật lý của phòng đó |
| **Test tự làm** | Tạo 2 suất chiếu trùng giờ cùng phòng, xác nhận bị chặn bởi exclusion constraint và trả lỗi rõ ràng (không phải lỗi 500 chung chung) |
| **DoD** | Sinh ghế đúng số lượng, chặn trùng lịch hoạt động |

### Tuần 3 — Redis Hold Engine (trọng tâm)
| | Nội dung |
|---|---|
| **Input** | Redis đã setup từ Ngày 0; contract Hold đã chốt |
| **Việc BE** | `POST /api/showtimes/{id}/hold-seats` (`SET NX EX`, validate ≤8 ghế, trả `holdToken` + breakdown giá); `DELETE .../hold-seats/{holdToken}` |
| **Việc FE** | Hoàn thiện `SeatMap.jsx`: click chọn ghế, gọi API hold, hiển thị đồng hồ đếm ngược 5 phút đồng bộ với `expiresAt` |
| **Output** | Chọn ghế trên UI → giữ được ghế thật trên Redis → đồng hồ đếm ngược chạy đúng |
| **Test tự làm** | Mở 2 tab trình duyệt, thử giữ cùng 1 ghế ở cả 2 tab — xác nhận tab thứ 2 bị từ chối đúng; đợi hết 5 phút, xác nhận ghế tự nhả |
| **DoD** | Không có race condition khi 2 người cùng chọn 1 ghế; countdown UI khớp chính xác với TTL Redis |

### Tuần 4
| | Nội dung |
|---|---|
| **Input** | Dev D cần `ReleaseSeatsAsync` để dùng trong checkout/background job |
| **Việc BE** | Viết `ScheduleService.ReleaseSeatsAsync(bookingId, seatIds)` (idempotent, expose cho Dev D gọi nội bộ) |
| **Việc FE** | Hỗ trợ Dev D test luồng end-to-end chọn ghế → checkout |
| **Output** | Dev D checkout thành công, gọi được `ReleaseSeatsAsync` khi cần hủy |
| **Test tự làm** | Phối hợp Dev D: giả lập checkout fail, xác nhận ghế nhả đúng về `available` |
| **DoD** | Dev D xác nhận tích hợp không lỗi |

### Tuần 5
| | Nội dung |
|---|---|
| **Việc BE + FE** | Sửa bug phạm vi Showtime/Seat; kiểm thử tải nhẹ (nhiều request hold cùng lúc) |
| **Test tự làm** | Test idempotency `ReleaseSeatsAsync` (giả lập webhook fail + background job cùng chạy 1 đơn) |
| **DoD** | 0 bug đã biết, không nhả nhầm ghế trong test race condition |

---

## 👤 DEV D — Flow Đặt Vé & Bắp Nước
**Sở hữu xuyên suốt:** `Bookings`, `Tickets`, `Snacks`, `CinemaSnacks`, `BookingSnacks`

### Tuần 1
| | Nội dung |
|---|---|
| **Input** | DB đã seed |
| **Việc BE** | `SnackService.cs`, `SnacksController.cs`: `GET /api/snacks`, `GET /api/cinemas/{cinemaId}/snacks` |
| **Việc FE** | `useSnacks.js`; khung tĩnh `BookingSummary.jsx` (chỉ hiện menu bắp nước, chưa có nút đặt vé) |
| **Output** | Menu bắp nước hiển thị đúng theo từng rạp |
| **Test tự làm** | Đổi rạp, xác nhận menu/giá bắp nước thay đổi đúng theo `CinemaSnacks` |
| **DoD** | Không có snack nào hiển thị sai giá |

### Tuần 2
| | Nội dung |
|---|---|
| **Việc BE** | `POST /api/cinemas/{cinemaId}/snacks` (Admin cấu hình giá/menu) |
| **Việc FE** | `admin/AdminSnacks.jsx` |
| **Output** | Admin thêm/sửa giá snack cho từng rạp qua UI |
| **Test tự làm** | Sửa giá 1 snack, xác nhận `BookingSummary.jsx` hiển thị giá mới ngay |
| **DoD** | Đồng bộ giá đúng giữa Admin và Client |

### Tuần 3
| | Nội dung |
|---|---|
| **Input** | Chờ Dev C hoàn thiện Hold Engine — tuần này chuẩn bị trước, chưa tích hợp thật |
| **Việc BE** | Viết khung `BookingService.cs`, `BookingsController.cs` (chưa nối Redis thật, dùng giả lập `holdToken` để test riêng) |
| **Việc FE** | Hoàn thiện UI `BookingSummary.jsx`: chọn số lượng snack, tính tổng tiền tạm thời (chưa gọi API thật) |
| **Output** | Sẵn sàng nối vào Hold API thật ngay khi Dev C xong |
| **Test tự làm** | Test tính tổng tiền đúng công thức trên UI với dữ liệu giả lập |
| **DoD** | Code sẵn sàng, chỉ cần đổi endpoint giả lập sang thật ở Tuần 4 |
| **Việc thêm (gỡ block Dev E Tuần 4)** | Viết sẵn script SQL seed **3 đơn `Bookings` mẫu ở trạng thái `pending`** (kèm `Tickets` tương ứng), chạy độc lập với code checkout thật — để Dev E có `bookingId` thật test cổng MoMo/VNPay ngay từ đầu Tuần 4 mà không phải chờ `POST /api/bookings` code xong. **Trước khi chạy:** đối chiếu các `showtime_seat_id` dùng trong script không trùng với ghế đang dùng làm demo ở nơi khác (đặc biệt suất chiếu Dev C dùng để test Tuần 1); thêm comment trong file seed ghi rõ các ghế này "reserved vĩnh viễn để test thanh toán, không dùng cho test Hold Engine" |

### Tuần 4 — Checkout Transaction (trọng tâm)
| | Nội dung |
|---|---|
| **Input** | Hold Engine thật của Dev C đã xong |
| **Việc BE** | `POST /api/bookings` (verify `holdToken` thật qua Redis, transaction ACID: reserved ghế → tạo `Bookings` → sinh `Tickets` → `BookingSnacks` → xóa Redis key); `GET /api/bookings/{id}`, `GET /api/bookings/my-bookings`, `PUT /api/bookings/{id}/cancel` |
| **Việc FE** | Nối `BookingSummary.jsx` vào API thật; `BookingHistoryTab.jsx` trong `Profile.jsx` |
| **Output** | Đặt vé thành công thật từ đầu đến cuối, ra `bookingCode` thật, xem được lại trong lịch sử |
| **Test tự làm** | Đặt vé thật 3-5 lần với các trường hợp khác nhau (có/không có snack); cố tình gây lỗi giữa transaction (ví dụ seat đã reserved) để test rollback |
| **DoD** | Transaction rollback đúng khi lỗi, không để ghế bị "treo" ở trạng thái sai |

### Tuần 5
| | Nội dung |
|---|---|
| **Việc BE** | `GET /api/tickets/{id}/qr`; Background Job `ExpireStalePendingBookings` (gọi `ReleaseSeatsAsync` của Dev C) |
| **Việc FE** | Hiển thị QR code vé trong `BookingHistoryTab.jsx` |
| **Test tự làm** | Tạo 1 đơn `pending` rồi bỏ dở, đợi job chạy, xác nhận đơn tự `cancelled` + ghế nhả đúng |
| **DoD** | 0 bug đã biết, job chạy đúng chu kỳ, không nhả nhầm ghế |

---

## 👤 DEV E — Flow Auth, Thanh Toán & Dashboard
**Sở hữu xuyên suốt:** `Users`, `Roles`, `UserRoles`, `Payments`

### Tuần 1
| | Nội dung |
|---|---|
| **Việc BE** | `AuthService.cs`, `AuthController.cs`: `POST /api/auth/register` (`PasswordHasher<User>`), `POST /api/auth/login`, `GET /api/auth/me` |
| **Việc FE** | `useAccount.js`; Modal Đăng ký/Đăng nhập toàn hệ thống |
| **Output** | Đăng ký + đăng nhập thật, nhận JWT hợp lệ |
| **Test tự làm** | Đăng ký 1 tài khoản test, login, gọi `GET /api/auth/me` với token, xác nhận đúng claims |
| **DoD** | Token hoạt động đúng cho các API `[Authorize]` khác của team |

### Tuần 2
| | Nội dung |
|---|---|
| **Việc BE** | `PUT /api/users/profile`, `PUT /api/users/change-password` |
| **Việc FE** | `AccountTab.jsx` trong `Profile.jsx` |
| **Output** | Đổi thông tin cá nhân/mật khẩu thành công |
| **Test tự làm** | Đổi mật khẩu, logout, login lại bằng mật khẩu mới xác nhận đúng |
| **DoD** | Không đổi được mật khẩu cũ, đổi mật khẩu mới hoạt động |

### Tuần 3
| | Nội dung |
|---|---|
| **Việc BE** | `GET /api/users` (Admin), chuẩn bị khung `PaymentService.cs`/`PaymentsController.cs` (chưa tích hợp cổng thật) |
| **Việc FE** | `admin/AdminUsers.jsx` |
| **Output** | Admin xem được danh sách user (DTO, không lộ `PasswordHash`) |
| **Test tự làm** | Gọi API bằng token Customer (không phải Admin), xác nhận bị 403 |
| **DoD** | Phân quyền Admin-only hoạt động đúng |

### Tuần 4
| | Nội dung |
|---|---|
| **Việc BE** | `POST /api/payments/create-url` (tạo `Payments` record, tích hợp MoMo/VNPay Sandbox), `POST /api/payments/callback` (webhook, xác thực HMAC), `GET /api/payments/{bookingId}` |
| **Việc FE** | `PaymentCallback.jsx` |
| **Output** | Thanh toán thật qua Sandbox, webhook cập nhật đúng trạng thái |
| **Test tự làm** | Test cả 2 nhánh: thanh toán thành công và thất bại/hủy — xác nhận `Bookings`/`ShowtimeSeats` cập nhật đúng ở cả 2 trường hợp |
| **DoD** | Webhook idempotent (gọi trùng không tạo lỗi), rollback ghế đúng khi thanh toán fail |

### Tuần 5
| | Nội dung |
|---|---|
| **Việc BE** | `GET /api/reports/revenue` |
| **Việc FE** | `admin/Dashboard.jsx` (ghép API của mình + `top-movies` của Dev A + `occupancy-rates` của Dev B) |
| **Test tự làm** | Xác nhận cả 3 API trả đúng số liệu thật lên Dashboard, không có số 0 do lỗi join |
| **DoD** | Dashboard hiển thị đầy đủ, 0 bug đã biết, sẵn sàng demo |

---

## 📅 Lịch Release Hàng Tuần

| Tuần | Release nội bộ | Nội dung báo cáo |
|---|---|---|
| 1 | v0.1 — Foundation Read APIs | Mỗi dev demo API GET + trang UI tương ứng chạy bằng data thật |
| 2 | v0.2 — Admin CRUD | Demo Admin Portal: tạo/sửa/xóa dữ liệu qua UI, không cần Postman |
| 3 | v0.3 — Seat Hold Engine | Demo giữ ghế real-time (2 tab tranh nhau 1 ghế), countdown UI |
| 4 | v0.4 — Booking Transaction | Demo đặt vé thật đầu-cuối, có snack, có rollback khi lỗi |
| 5 | v1.0 — Feature Complete (Sprint 1 kết thúc) | Demo thanh toán Sandbox thật, vé QR, Dashboard tổng hợp — **đủ tính năng để test, chưa phải bản nộp cuối.** Từ Tuần 6, chuyển sang Sprint 2 (hardening, stress test, viết báo cáo, rehearsal) đến hết Tuần 11 |

**Quy tắc báo cáo cuối tuần (bắt buộc từng người):**
1. Demo trực tiếp bằng UI thật, không dùng slide mô tả.
2. Nêu rõ bug đã gặp trong tuần và cách đã sửa (không chỉ báo "xong", phải chứng minh đã tự test).
3. Nêu rõ phần phụ thuộc dev khác (nếu có) đã xác nhận tích hợp thành công chưa.
4. Không release nếu còn bug đã biết — nếu chưa xong, báo cáo rõ lý do và kế hoạch bù vào tuần sau, không im lặng mang bug sang tuần tiếp.
