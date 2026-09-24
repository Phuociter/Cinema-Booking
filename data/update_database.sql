-- ============================================================
-- SCRIPT CẬP NHẬT TOÀN DIỆN VÀ LÀM GIÀU DỮ LIỆU CINEMA_DB
-- Bao gồm:
--   1. Chuẩn hóa font tiếng Việt có dấu UTF-8 (Thể loại, Phim, Bắp nước)
--   2. Phân bổ 100 cụm rạp phủ kín trọn vẹn 34 Tỉnh / Thành phố
--   3. Cập nhật đa dạng loại phòng chiếu (2D, 3D, IMAX, GOLDCLASS)
--   4. Sinh 36,000 suất chiếu đa dạng phủ trọn 30 ngày (nhiều khung giờ sáng/trưa/chiều/tối/đêm)
--   5. Khởi tạo toàn bộ ghế suất chiếu kèm trạng thái thực tế
-- Cách chạy:
--   docker exec -i cinema-postgres psql -U postgres -d cinema_db < data/update_database.sql
--   docker exec -i cinema-redis redis-cli FLUSHDB
-- ============================================================

BEGIN;

-- ============================================================
-- PHẦN 1: CHUẨN HÓA FONT TIẾNG VIỆT UTF-8
-- ============================================================

-- 1. Bảng Genres (Thể loại phim)
UPDATE genres SET name = 'Hành Động' WHERE name LIKE 'H%nh%ng';
UPDATE genres SET name = 'Kinh Dị' WHERE name LIKE 'Kinh D%';
UPDATE genres SET name = 'Hài' WHERE name LIKE 'H_i' OR name = 'Hài';
UPDATE genres SET name = 'Tình Cảm' WHERE name LIKE 'T%nh C%m';
UPDATE genres SET name = 'Viễn Tưởng' WHERE name LIKE 'Vi%n T%ng%';
UPDATE genres SET name = 'Hoạt Hình' WHERE name LIKE 'Ho%t H%nh%';
UPDATE genres SET name = 'Chính Kịch' WHERE name LIKE 'Ch%nh K%ch%';
UPDATE genres SET name = 'Tâm Lý' WHERE name LIKE 'T%m L%';
UPDATE genres SET name = 'Phiêu Lưu' WHERE name LIKE 'Phi%u L%u%';
UPDATE genres SET name = 'Kinh Điển' WHERE name LIKE 'Kinh %i%n%';
UPDATE genres SET name = 'Tài Liệu' WHERE name LIKE 'T%i Li%u%';
UPDATE genres SET name = 'Âm Nhạc' WHERE name LIKE '%m Nh%c%';

-- 2. Bảng Movies (100 phim)
UPDATE movies m
SET 
  title = (ARRAY['Bí Ẩn','Huyền Thoại','Vô Cực','Bóng Tối','Ánh Sáng','Hồi Sinh','Định Mệnh','Giông Bão','Ẩn Số','Vực Thẳm','Cơn Ác Mộng','Đế Chế','Ký Ức','Lời Nguyền','Chân Trời','Ngọn Lửa','Cơn Bão','Giấc Mơ','Vòng Xoáy','Tia Chớp'])[((sub.n - 1) / 5)::int % 20 + 1]
          || ' ' ||
          (ARRAY['Cuối Cùng','Vĩnh Cửu','Bất Tử','Sinh Tồn','Trở Lại'])[(sub.n - 1) % 5 + 1],
  overview = 'Bộ phim số ' || sub.n || ' mang đến một câu chuyện đầy kịch tính và cảm xúc, hứa hẹn chinh phục khán giả yêu điện ảnh.'
FROM (
  SELECT 
    id, 
    substring(id::text from 25)::int AS n
  FROM movies
) sub
WHERE m.id = sub.id;

-- 3. Bảng Cinemas (100 cụm rạp phân bổ phủ kín 34 Tỉnh / Thành phố)
UPDATE cinemas c
SET
  city = (ARRAY[
    'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Đồng Nai', 'Hải Phòng',
    'Quảng Ninh', 'Bà Rịa-Vũng Tàu', 'Bình Định', 'Bình Dương', 'Đắk Lắk', 'Trà Vinh',
    'Yên Bái', 'Vĩnh Long', 'Kiên Giang', 'Hậu Giang', 'Hà Tĩnh', 'Phú Yên',
    'Đồng Tháp', 'Bạc Liêu', 'Hưng Yên', 'Khánh Hòa', 'Kon Tum', 'Lạng Sơn',
    'Nghệ An', 'Phú Thọ', 'Quảng Ngãi', 'Sóc Trăng', 'Sơn La', 'Tây Ninh',
    'Thái Nguyên', 'Tiền Giang', 'Thừa Thiên Huế', 'Lâm Đồng',
    -- Thêm các chi nhánh tại các thành phố lớn
    'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
    'Hồ Chí Minh', 'Hà Nội', 'Đồng Nai', 'Bình Dương', 'Bà Rịa-Vũng Tàu',
    'Hồ Chí Minh', 'Hà Nội', 'Khánh Hòa', 'Thừa Thiên Huế', 'Lâm Đồng',
    'Hồ Chí Minh', 'Hà Nội', 'Hồ Chí Minh', 'Hà Nội', 'Hồ Chí Minh', 'Hà Nội'
  ])[((sub.n - 1) % 55) + 1],
  name = (ARRAY['CineStar','MegaFilm','SilverScreen','MoonLight Cinema','Starlight Cinema','CineVN','Golden Screen','Skyline Cinema'])[(sub.n % 8) + 1]
         || ' ' ||
         (ARRAY[
           'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Đồng Nai', 'Hải Phòng',
           'Quảng Ninh', 'Bà Rịa-Vũng Tàu', 'Bình Định', 'Bình Dương', 'Đắk Lắk', 'Trà Vinh',
           'Yên Bái', 'Vĩnh Long', 'Kiên Giang', 'Hậu Giang', 'Hà Tĩnh', 'Phú Yên',
           'Đồng Tháp', 'Bạc Liêu', 'Hưng Yên', 'Khánh Hòa', 'Kon Tum', 'Lạng Sơn',
           'Nghệ An', 'Phú Thọ', 'Quảng Ngãi', 'Sóc Trăng', 'Sơn La', 'Tây Ninh',
           'Thái Nguyên', 'Tiền Giang', 'Thừa Thiên Huế', 'Lâm Đồng',
           'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
           'Hồ Chí Minh', 'Hà Nội', 'Đồng Nai', 'Bình Dương', 'Bà Rịa-Vũng Tàu',
           'Hồ Chí Minh', 'Hà Nội', 'Khánh Hòa', 'Thừa Thiên Huế', 'Lâm Đồng',
           'Hồ Chí Minh', 'Hà Nội', 'Hồ Chí Minh', 'Hà Nội', 'Hồ Chí Minh', 'Hà Nội'
         ])[((sub.n - 1) % 55) + 1]
         || ' - CN' || sub.n,
  address = 'Số ' || sub.n || ' đường Điện Ảnh, Quận ' || ((sub.n % 12) + 1)
FROM (
  SELECT 
    id, 
    substring(id::text from 25)::int AS n
  FROM cinemas
) sub
WHERE c.id = sub.id;

-- 4. Bảng Auditoriums (Phân bổ phòng 1 và 2, đa dạng hall_type 2D, 3D, IMAX, GOLDCLASS)
UPDATE auditoriums a
SET
  name = 'Phòng ' || CASE WHEN sub.rn % 2 = 1 THEN '1' ELSE '2' END,
  hall_type = CASE 
    WHEN sub.rn % 2 = 1 AND sub.rn % 4 = 1 THEN '2D'
    WHEN sub.rn % 2 = 1 AND sub.rn % 4 = 3 THEN 'IMAX'
    WHEN sub.rn % 2 = 0 AND sub.rn % 4 = 2 THEN '3D'
    ELSE 'GOLDCLASS'
  END
FROM (
  SELECT 
    id, 
    row_number() OVER (ORDER BY id) AS rn
  FROM auditoriums
) sub
WHERE a.id = sub.id;

-- 5. Bảng Snacks (100 món bắp nước)
UPDATE snacks s
SET
  name = (ARRAY['Bắp Rang Bơ','Combo Nước Ngọt','Snack Khoai Tây','Hot Dog Phô Mai','Kẹo Dẻo Trái Cây','Nachos Sốt Phô Mai','Trà Sữa Trân Châu','Nước Ngọt Có Gas','Bánh Mì Que','Pop Corn Caramel'])[(sub.n % 10) + 1]
         || ' - ' ||
         (ARRAY['Nhỏ','Vừa','Lớn','Đặc Biệt','Combo Đôi'])[(sub.n % 5) + 1],
  description = 'Món ăn vặt yêu thích khi xem phim, thơm ngon và tiện lợi.'
FROM (
  SELECT 
    id, 
    substring(id::text from 25)::int AS n
  FROM snacks
) sub
WHERE s.id = sub.id;

-- ============================================================
-- PHẦN 2: TÁI TẠO SUẤT CHIẾU 30 NGÀY ĐA DẠNG KHUNG GIỜ
-- ============================================================

-- 1. Xóa các suất chiếu cũ chưa có vé đặt
DELETE FROM showtimes 
WHERE id NOT IN (
    SELECT DISTINCT ss.showtime_id 
    FROM showtimeseats ss 
    JOIN tickets t ON t.showtime_seat_id = ss.id
);

-- 2. Bảng tạm 200 phòng chiếu kèm số thứ tự rạp và số thứ tự phòng (1 hoặc 2)
CREATE TEMP TABLE temp_audis AS
SELECT 
    a.id AS auditorium_id,
    c.id AS cinema_id,
    substring(c.id::text from 25)::int AS cinema_no,
    CASE WHEN a.name = 'Phòng 1' THEN 1 ELSE 2 END AS room_no,
    a.hall_type
FROM auditoriums a
JOIN cinemas c ON a.cinema_id = c.id;

-- 3. Bảng tạm khung giờ chiếu đa dạng, tự nhiên theo từng phòng
-- Phòng 1: 08:30, 11:15, 14:00, 16:45, 19:30, 22:15 (cách 165 phút > max thời lượng 144p)
-- Phòng 2: 09:15, 12:00, 14:45, 17:30, 20:15, 23:00 (cách 165 phút)
CREATE TEMP TABLE temp_room_slots AS
SELECT room_no, slot_no, slot_time FROM (VALUES 
    (1, 1, TIME '08:30:00'),
    (1, 2, TIME '11:15:00'),
    (1, 3, TIME '14:00:00'),
    (1, 4, TIME '16:45:00'),
    (1, 5, TIME '19:30:00'),
    (1, 6, TIME '22:15:00'),
    (2, 1, TIME '09:15:00'),
    (2, 2, TIME '12:00:00'),
    (2, 3, TIME '14:45:00'),
    (2, 4, TIME '17:30:00'),
    (2, 5, TIME '20:15:00'),
    (2, 6, TIME '23:00:00')
) AS s(room_no, slot_no, slot_time);

-- 4. Bảng tạm chứa danh sách 100 phim hiện có
CREATE TEMP TABLE temp_movies AS
SELECT 
    id AS movie_id, 
    COALESCE(duration_min, 100) AS duration_min,
    row_number() OVER (ORDER BY id) AS movie_no
FROM movies
WHERE deleted_at IS NULL;

-- 4b. Bảng tạm phân bổ phim hoạt động cho từng ngày (20 phim ngày thường, 24 phim cuối tuần)
-- Giúp danh sách phim mỗi ngày thay đổi đa dạng, bám sát vòng đời chiếu rạp thực tế
CREATE TEMP TABLE temp_day_movies AS
SELECT 
    d.day_offset,
    row_number() OVER (PARTITION BY d.day_offset ORDER BY sub.ptype, sub.movie_no) AS rn,
    sub.movie_no
FROM generate_series(0, 29) d(day_offset)
CROSS JOIN LATERAL (
    -- 4 Phim bom tấn trụ rạp suốt tháng trong khung giờ vàng
    SELECT 1 AS ptype, m AS movie_no FROM generate_series(1, 4) m
    UNION ALL
    -- 16 Phim luân phiên trượt theo ngày (mỗi ngày thêm 3 phim mới, phim cũ hạ rạp)
    SELECT 2 AS ptype, (((d.day_offset * 3 + i) % 92) + 5) AS movie_no FROM generate_series(0, 15) i
    UNION ALL
    -- 4 Phim Sneak-preview chỉ chiếu vào cuối tuần (Thứ 6, Thứ 7, Chủ Nhật)
    SELECT 3 AS ptype, 97 + ((d.day_offset + k) % 4) AS movie_no FROM generate_series(0, 3) k
    WHERE EXTRACT(DOW FROM CURRENT_DATE + d.day_offset) IN (0, 5, 6)
) sub;

CREATE TEMP TABLE temp_day_counts AS
SELECT day_offset, COUNT(*) AS total_movies_in_day
FROM temp_day_movies
GROUP BY day_offset;

-- 5. Sinh 36,000 suất chiếu: 30 ngày x 200 phòng x 6 ca = 1,200 suất/ngày
-- Mỗi phim có 48-60 suất chiếu/ngày trải đều sáng-trưa-chiều-tối khắp các rạp
CREATE TEMP TABLE temp_new_showtimes AS
SELECT 
    gen_random_uuid() AS id,
    m.movie_id,
    a.auditorium_id,
    d.day_offset,
    ((CURRENT_DATE + d.day_offset) + s.slot_time)::timestamptz AS start_time,
    (((CURRENT_DATE + d.day_offset) + s.slot_time)::timestamptz + (m.duration_min || ' minutes')::interval) AS end_time,
    CASE 
      WHEN a.hall_type = 'IMAX' THEN 120000
      WHEN a.hall_type = 'GOLDCLASS' THEN 150000
      WHEN a.hall_type = '3D' THEN 95000
      ELSE 75000
    END::numeric AS base_price,
    'scheduled'::varchar(20) AS status
FROM generate_series(0, 29) AS d(day_offset)
JOIN temp_day_counts dc ON dc.day_offset = d.day_offset
CROSS JOIN temp_audis a
JOIN temp_room_slots s ON a.room_no = s.room_no
JOIN temp_day_movies dm ON dm.day_offset = d.day_offset 
     AND dm.rn = (((a.cinema_no * 3 + a.room_no * 5 + s.slot_no * 7) % dc.total_movies_in_day) + 1)
JOIN temp_movies m ON m.movie_no = dm.movie_no;

-- 6. Insert vào bảng Showtimes (bỏ qua nếu trùng khung giờ với suất chiếu đã có vé)
INSERT INTO showtimes (id, movie_id, auditorium_id, start_time, end_time, base_price, status)
SELECT t.id, t.movie_id, t.auditorium_id, t.start_time, t.end_time, t.base_price, t.status
FROM temp_new_showtimes t
WHERE NOT EXISTS (
    SELECT 1 FROM showtimes ex 
    WHERE ex.auditorium_id = t.auditorium_id 
    AND tstzrange(ex.start_time, ex.end_time) && tstzrange(t.start_time, t.end_time)
);

-- 7. Sinh toàn bộ ghế cho các suất chiếu mới tạo
-- Các suất chiếu hôm nay và ngày mai đặt trước một số ghế VIP trung tâm để tạo tính chân thực
INSERT INTO showtimeseats (id, showtime_id, seat_id, status)
SELECT 
    gen_random_uuid(),
    t.id,
    se.id,
    CASE 
      WHEN t.day_offset <= 1 AND se.seat_code IN ('D4','D5','E4','E5','C3','C4','C5') THEN 'reserved'
      ELSE 'available'
    END
FROM temp_new_showtimes t
JOIN seats se ON se.auditorium_id = t.auditorium_id
WHERE EXISTS (SELECT 1 FROM showtimes st WHERE st.id = t.id);

COMMIT;
