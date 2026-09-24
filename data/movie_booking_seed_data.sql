-- ============================================================
-- MOVIE TICKET BOOKING APP - SEED DATA (PostgreSQL)
-- Run AFTER movie_booking_schema.sql (needs Genres/SeatTypes tables
-- to exist; this file inserts its own Genres/SeatTypes rows, and
-- assumes the Roles seed from the schema file already ran).
--
-- Row counts:
--   Directors 100 | Actors 100 | Movies 100 | Cinemas 100 | Snacks 100
--   Genres 12 | SeatTypes 3 | Auditoriums 200 (2/cinema) | Seats 9,600
--   Showtimes 800 (4 slots x 200 auditoriums) | ShowtimeSeats 38,400
--   CinemaSnacks 1,000 (10/cinema) | Users 21 (1 admin + 20 demo)
--
-- Admin login:   admin@example.com  /  password: admin
-- Demo customer: khachhang1@example.com .. khachhang20@example.com / password: 123456
-- (bcrypt hashes via pgcrypto crypt()+gen_salt('bf'); BCrypt.Net-Next
-- on the API side verifies these correctly regardless of cost factor,
-- since bcrypt embeds the cost in the hash string itself.)
--
-- Images: all poster/backdrop/avatar/cinema/snack images use
-- picsum.photos (seeded, deterministic) and i.pravatar.cc (avatar
-- placeholders) — both are free placeholder-image services meant for
-- exactly this use, so links always resolve and carry no IP risk.
-- Movie/actor/director/cinema names are procedurally generated and
-- fictional — not real films, real people, or real VN cinema brands.
--
-- Deterministic IDs: every row's UUID is built from a fixed 8-hex
-- table prefix + a zero-padded sequence number, e.g.
-- '00000003-0000-0000-0000-000000000042' = Movie #42. This makes
-- every FK reference a plain, debuggable literal instead of relying
-- on gen_random_uuid() output you can't predict ahead of the insert.
--
-- Table prefix key:
--   1 Directors  2 Actors      3 Movies        4 Cinemas
--   5 Auditoriums 6 Seats      7 SeatTypes     8 Showtimes
--   9 Snacks     a ShowtimeSeats  b CinemaSnacks  c Users
-- ============================================================

BEGIN;

-- ============================================================
-- GENRES (12) + SEATTYPES (3)
-- ============================================================

INSERT INTO Genres (name) VALUES
('Hành Động'), ('Kinh Dị'), ('Hài'), ('Tình Cảm'), ('Viễn Tưởng'), ('Hoạt Hình'),
('Chính Kịch'), ('Tâm Lý'), ('Phiêu Lưu'), ('Kinh Điển'), ('Tài Liệu'), ('Âm Nhạc');

INSERT INTO SeatTypes (id, name, color_code, extra_price) VALUES
('00000007-0000-0000-0000-000000000001', 'Standard', '#A0A0A0', 0),
('00000007-0000-0000-0000-000000000002', 'VIP',      '#FFD700', 20000),
('00000007-0000-0000-0000-000000000003', 'Couple',   '#FF69B4', 50000);

-- ============================================================
-- GROUP 1 (Dev A): DIRECTORS, ACTORS, MOVIES
-- ============================================================

INSERT INTO Directors (id, name, photo_url)
SELECT
    ('00000001-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
    (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương'])[((n-1)/15)::int % 15 + 1]
        || ' ' ||
    (ARRAY['Văn An','Thị Bình','Minh Châu','Quốc Dũng','Thu Hà','Hoàng Long','Ngọc Mai','Tuấn Nam','Thanh Phong','Kim Quyên','Đức Sơn','Bảo Trâm','Việt Trung','Hải Yến','Xuân Nghi'])[(n-1) % 15 + 1],
    'https://i.pravatar.cc/300?img=' || ((n % 70) + 1)
FROM generate_series(1, 100) AS n;

INSERT INTO Actors (id, name, profile_path)
SELECT
    ('00000002-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
    (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương'])[((n-1)/15)::int % 15 + 1]
        || ' ' ||
    (ARRAY['Gia Bảo','Khánh Chi','Duy Khang','Mỹ Duyên','Anh Khoa','Ngọc Lan','Bá Lộc','Thùy Linh','Hữu Nghĩa','Diễm My','Trọng Phúc','Cẩm Tú','Nhật Vy','Thế Vinh','Yến Nhi'])[(n-1) % 15 + 1],
    'https://i.pravatar.cc/300?img=' || (((n + 35) % 70) + 1)
FROM generate_series(1, 100) AS n;

INSERT INTO Movies (id, title, original_title, overview, duration_min, age_rating, poster_url, backdrop_url, trailer_url, release_date, rating_score, status)
SELECT
    ('00000003-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
    (ARRAY['Bí Ẩn','Huyền Thoại','Vô Cực','Bóng Tối','Ánh Sáng','Hồi Sinh','Định Mệnh','Giông Bão','Ẩn Số','Vực Thẩm','Cơn Ác Mộng','Đế Chế','Ký Ức','Lời Nguyền','Chân Trời','Ngọn Lửa','Cơn Bão','Giấc Mơ','Vòng Xoáy','Tia Chớp'])[((n-1)/5)::int % 20 + 1]
        || ' ' ||
    (ARRAY['Cuối Cùng','Vĩnh Cửu','Bất Tử','Sinh Tồn','Trở Lại'])[(n-1) % 5 + 1],
    'The Movie #' || n,
    'Bộ phim số ' || n || ' mang đến một câu chuyện đầy kịch tính và cảm xúc, hứa hẹn chinh phục khán giả yêu điện ảnh.',
    (85 + (n % 60)),
    (ARRAY['P','K','T13','T16','T18','C'])[(n % 6) + 1],
    'https://picsum.photos/seed/movie-poster-' || n || '/400/600',
    'https://picsum.photos/seed/movie-backdrop-' || n || '/1280/720',
    NULL, -- trailer_url left NULL on purpose: no real/working trailer link exists for a fictional seed movie
    (DATE '2025-01-01' + ((n * 3) || ' days')::interval)::date,
    (round((5 + (n % 50) * 0.1)::numeric, 1)),
    (ARRAY['now_showing','now_showing','coming_soon','ended'])[(n % 4) + 1]
FROM generate_series(1, 100) AS n;

-- Each movie: 2 genres, 1 director (pooled from first 60 directors), 4 actors
WITH movie_n AS (
    SELECT n, ('00000003-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid AS movie_id
    FROM generate_series(1,100) n
)
INSERT INTO MovieGenres (movie_id, genre_id)
SELECT mn.movie_id, g.id
FROM movie_n mn
JOIN Genres g ON g.name = ANY(ARRAY[
    (ARRAY['Hành Động','Kinh Dị','Hài','Tình Cảm','Viễn Tưởng','Hoạt Hình','Chính Kịch','Tâm Lý','Phiêu Lưu','Kinh Điển','Tài Liệu','Âm Nhạc'])[(mn.n % 12) + 1],
    (ARRAY['Hành Động','Kinh Dị','Hài','Tình Cảm','Viễn Tưởng','Hoạt Hình','Chính Kịch','Tâm Lý','Phiêu Lưu','Kinh Điển','Tài Liệu','Âm Nhạc'])[((mn.n + 5) % 12) + 1]
]);

WITH movie_n AS (
    SELECT n, ('00000003-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid AS movie_id
    FROM generate_series(1,100) n
)
INSERT INTO MovieDirectors (movie_id, director_id)
SELECT mn.movie_id,
    ('00000001-0000-0000-0000-' || lpad((((mn.n - 1) % 60) + 1)::text, 12, '0'))::uuid
FROM movie_n mn;

WITH movie_n AS (
    SELECT n, ('00000003-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid AS movie_id
    FROM generate_series(1,100) n
),
offsets AS (SELECT unnest(ARRAY[0,7,13,29]) AS off, unnest(ARRAY[1,2,3,4]) AS slot)
INSERT INTO MovieActors (movie_id, actor_id, character_name)
SELECT
    mn.movie_id,
    ('00000002-0000-0000-0000-' || lpad(((((mn.n - 1 + o.off) % 100) + 1))::text, 12, '0'))::uuid,
    'Nhân vật ' || o.slot
FROM movie_n mn
CROSS JOIN offsets o;

-- ============================================================
-- GROUP 2 (Dev B): CINEMAS, AUDITORIUMS, PHYSICAL SEATS
-- ============================================================

INSERT INTO Cinemas (id, name, address, city, hotline, image_url)
SELECT
    ('00000004-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
    (ARRAY['CineStar','MegaFilm','SilverScreen','MoonLight Cinema','Starlight Cinema','CineVN','Golden Screen','Skyline Cinema'])[(n % 8) + 1]
        || ' ' ||
    (ARRAY['Hà Nội','TP. Hồ Chí Minh','Đà Nẵng','Hải Phòng','Cần Thơ','Nha Trang','Huế','Vũng Tàu','Biên Hòa','Quy Nhơn'])[(n % 10) + 1]
        || ' - CN' || n,
    'Số ' || n || ' đường Điện Ảnh, Quận ' || ((n % 12) + 1),
    (ARRAY['Hà Nội','TP. Hồ Chí Minh','Đà Nẵng','Hải Phòng','Cần Thơ','Nha Trang','Huế','Vũng Tàu','Biên Hòa','Quy Nhơn'])[(n % 10) + 1],
    '1900' || lpad((1000 + n)::text, 4, '0'),
    'https://picsum.photos/seed/cinema-' || n || '/800/500'
FROM generate_series(1, 100) AS n;

WITH cinema_n AS (
    SELECT n, ('00000004-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid AS cinema_id
    FROM generate_series(1,100) n
),
rooms AS (SELECT unnest(ARRAY[1,2]) AS room_no)
INSERT INTO Auditoriums (id, cinema_id, name, hall_type, total_rows, total_columns)
SELECT
    ('00000005-0000-0000-0000-' || lpad((row_number() OVER (ORDER BY c.n, r.room_no))::text, 12, '0'))::uuid,
    c.cinema_id,
    'Phòng ' || r.room_no,
    CASE WHEN r.room_no = 1 THEN '2D' ELSE '3D' END,
    6, 8
FROM cinema_n c
CROSS JOIN rooms r;

-- Seats: 6 rows (A-F) x 8 columns per auditorium. Row F = Couple, Row E = VIP, rest Standard.
WITH audi AS (
    SELECT id, row_number() OVER (ORDER BY id) AS an FROM Auditoriums
),
rowcols AS (
    SELECT rl, cn FROM unnest(ARRAY['A','B','C','D','E','F']) AS rl CROSS JOIN generate_series(1,8) AS cn
)
INSERT INTO Seats (id, auditorium_id, seat_type_id, row_label, column_number, seat_code)
SELECT
    ('00000006-0000-0000-0000-' || lpad((row_number() OVER (ORDER BY audi.an, rc.rl, rc.cn))::text, 12, '0'))::uuid,
    audi.id,
    CASE
        WHEN rc.rl = 'F' THEN '00000007-0000-0000-0000-000000000003'::uuid
        WHEN rc.rl = 'E' THEN '00000007-0000-0000-0000-000000000002'::uuid
        ELSE '00000007-0000-0000-0000-000000000001'::uuid
    END,
    rc.rl,
    rc.cn,
    rc.rl || rc.cn
FROM audi
CROSS JOIN rowcols rc;

-- ============================================================
-- GROUP 3 (Dev C): SHOWTIMES & SHOWTIME SEATS
-- ============================================================

-- 2 days x 2 slots (10:00 / 19:30) per auditorium = 800 showtimes.
-- Fixed slot times + short movie durations (<= 145 min) guarantee no
-- overlap within an auditorium, satisfying the EXCLUDE constraint.
WITH audi AS (
    SELECT id, row_number() OVER (ORDER BY id) AS an FROM Auditoriums
),
slots AS (
    SELECT day_offset, slot_no,
        CASE slot_no WHEN 1 THEN TIME '10:00' ELSE TIME '19:30' END AS slot_time
    FROM (VALUES (0),(1)) AS d(day_offset)
    CROSS JOIN (VALUES (1),(2)) AS s(slot_no)
),
combo AS (
    SELECT
        row_number() OVER (ORDER BY audi.an, slots.day_offset, slots.slot_no) AS rn,
        audi.id AS auditorium_id,
        slots.day_offset,
        slots.slot_time
    FROM audi CROSS JOIN slots
),
movie_idx AS (
    SELECT id, duration_min, row_number() OVER (ORDER BY id) AS mn FROM Movies
)
INSERT INTO Showtimes (id, movie_id, auditorium_id, start_time, end_time, base_price, status)
SELECT
    ('00000008-0000-0000-0000-' || lpad(c.rn::text, 12, '0'))::uuid,
    mi.id,
    c.auditorium_id,
    (CURRENT_DATE + c.day_offset) + c.slot_time,
    (CURRENT_DATE + c.day_offset) + c.slot_time + (mi.duration_min || ' minutes')::interval,
    (75000 + (c.rn % 5) * 10000)::numeric,
    'scheduled'
FROM combo c
JOIN movie_idx mi ON mi.mn = ((c.rn - 1) % 100) + 1;

-- ShowtimeSeats: every physical seat of a showtime's auditorium, status='available'
INSERT INTO ShowtimeSeats (id, showtime_id, seat_id, status)
SELECT
    ('0000000a-0000-0000-0000-' || lpad((row_number() OVER (ORDER BY st.id, se.id))::text, 12, '0'))::uuid,
    st.id,
    se.id,
    'available'
FROM Showtimes st
JOIN Seats se ON se.auditorium_id = st.auditorium_id;

-- ============================================================
-- GROUP 4 (Dev D): SNACKS & CINEMA MENUS
-- ============================================================

INSERT INTO Snacks (id, name, image_url, description)
SELECT
    ('00000009-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
    (ARRAY['Bắp Rang Bơ','Combo Nước Ngọt','Snack Khoai Tây','Hot Dog Phô Mai','Kẹo Dẻo Trái Cây','Nachos Sốt Phô Mai','Trà Sữa Trân Châu','Nước Ngọt Có Gas','Bánh Mì Que','Pop Corn Caramel'])[(n % 10) + 1]
        || ' - ' ||
    (ARRAY['Nhỏ','Vừa','Lớn','Đặc Biệt','Combo Đôi'])[(n % 5) + 1],
    'https://picsum.photos/seed/snack-' || n || '/400/400',
    'Món ăn vặt yêu thích khi xem phim, thơm ngon và tiện lợi.'
FROM generate_series(1, 100) AS n;

-- Each cinema carries 10 snacks from the catalog (deterministic rolling window, no duplicates)
WITH cinema_n AS (SELECT id, row_number() OVER (ORDER BY id) AS cn FROM Cinemas),
snack_n AS (
    SELECT id, row_number() OVER (ORDER BY id) AS sn,
           15000 + (row_number() OVER (ORDER BY id) % 10) * 5000 AS base_price
    FROM Snacks
),
picks AS (SELECT unnest(ARRAY[0,1,2,3,4,5,6,7,8,9]) AS off)
INSERT INTO CinemaSnacks (id, cinema_id, snack_id, price, is_available)
SELECT
    ('0000000b-0000-0000-0000-' || lpad((row_number() OVER (ORDER BY c.cn, p.off))::text, 12, '0'))::uuid,
    c.id,
    sn.id,
    sn.base_price,
    true
FROM cinema_n c
CROSS JOIN picks p
JOIN snack_n sn ON sn.sn = ((c.cn + p.off - 1) % 100) + 1;

-- ============================================================
-- GROUP 5 (Dev E): USERS & ROLES
-- Requires the Roles seed ('Customer','Staff','Admin') from
-- movie_booking_schema.sql to have already run.
-- ============================================================

-- Admin account — email: admin@example.com  password: admin
INSERT INTO Users (id, full_name, email, phone, password_hash, avatar_url)
VALUES (
    '0000000c-0000-0000-0000-000000000000'::uuid,
    'Quản Trị Viên',
    'admin@example.com',
    '0900000000',
    crypt('admin', gen_salt('bf')),
    'https://i.pravatar.cc/300?img=65'
);

INSERT INTO UserRoles (user_id, role_id)
SELECT '0000000c-0000-0000-0000-000000000000'::uuid, id FROM Roles WHERE name = 'Admin';

-- 20 demo customer accounts — khachhang1@example.com..khachhang20@example.com, password: 123456
INSERT INTO Users (id, full_name, email, phone, password_hash, avatar_url)
SELECT
    ('0000000c-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
    (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng'])[(n % 5) + 1] || ' Văn Khách ' || n,
    'khachhang' || n || '@example.com',
    '09' || lpad((10000000 + n)::text, 8, '0'),
    crypt('123456', gen_salt('bf')),
    'https://i.pravatar.cc/300?img=' || (((n + 20) % 70) + 1)
FROM generate_series(1, 20) AS n;

INSERT INTO UserRoles (user_id, role_id)
SELECT ('0000000c-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       (SELECT id FROM Roles WHERE name = 'Customer')
FROM generate_series(1, 20) AS n;

-- ============================================================
-- GROUP 6 (Dev D & Dev E): MOCK PENDING BOOKINGS FOR PAYMENT TEST
-- ============================================================
-- ⚠️ GHI CHÚ QUAN TRỌNG VỀ ĐỐI CHIẾU DỮ LIỆU:
-- Để KHÔNG xung đột với Suất chiếu #1 ('00000008-...0001') - nơi Dev C và Dev D
-- dùng để demo sơ đồ ghế và test Hold Engine cho ghế E1/E2 ('00000006-...0001' và '...0002'):
-- ➔ 5 ghế dưới đây được lấy từ SUẤT CHIẾU #2 ('00000008-...0002', các ID từ '...0049' đến '...0053').
-- 5 ghế này được đặt status = 'reserved' vĩnh viễn cho mục đích:
--   1. Cung cấp dữ liệu mẫu đơn 'pending' để Dev E test cổng thanh toán MoMo/VNPay (Tuần 4).
--   2. Dùng làm dữ liệu mẫu hiển thị ghế đã bán/bị khóa khi xem Suất chiếu #2.
-- Suất chiếu #1 hoàn toàn sạch (100% available) phục vụ Dev C và Dev D demo luồng thật.
-- ============================================================

-- 1. Insert 3 đơn Bookings pending mẫu (không tạo Payments để Dev E tự tạo record khi test)
INSERT INTO Bookings (id, user_id, booking_code, total_amount, status, created_at, updated_at) VALUES
('0000000d-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', 'BK-MOMO-TEST-001', 190000, 'pending', now(), now()),
('0000000d-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000001', 'BK-MOMO-TEST-002', 290000, 'pending', now(), now()),
('0000000d-0000-0000-0000-000000000003', '0000000c-0000-0000-0000-000000000002', 'BK-MOMO-TEST-003', 95000,  'pending', now(), now());

-- 2. Insert Tickets liên kết ghế cho 3 đơn trên (dùng ghế 49-53 thuộc Suất chiếu #2)
INSERT INTO Tickets (id, booking_id, showtime_seat_id, price, created_at) VALUES
('0000000e-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000049', 95000, now()),
('0000000e-0000-0000-0000-000000000002', '0000000d-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000050', 95000, now()),
('0000000e-0000-0000-0000-000000000003', '0000000d-0000-0000-0000-000000000002', '0000000a-0000-0000-0000-000000000051', 95000, now()),
('0000000e-0000-0000-0000-000000000004', '0000000d-0000-0000-0000-000000000002', '0000000a-0000-0000-0000-000000000052', 95000, now()),
('0000000e-0000-0000-0000-000000000005', '0000000d-0000-0000-0000-000000000003', '0000000a-0000-0000-0000-000000000053', 95000, now());

-- 3. Cập nhật 5 ghế thuộc Suất chiếu #2 sang trạng thái 'reserved'
UPDATE ShowtimeSeats 
SET status = 'reserved' 
WHERE id IN (
    '0000000a-0000-0000-0000-000000000049',
    '0000000a-0000-0000-0000-000000000050',
    '0000000a-0000-0000-0000-000000000051',
    '0000000a-0000-0000-0000-000000000052',
    '0000000a-0000-0000-0000-000000000053'
);

-- 4. Insert bắp nước cho đơn số 2 (2 phần bắp nước = 100.000đ)
INSERT INTO BookingSnacks (id, booking_id, cinema_snack_id, quantity, unit_price) VALUES
('0000000f-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000002', '0000000b-0000-0000-0000-000000000001', 2, 50000);

COMMIT;
