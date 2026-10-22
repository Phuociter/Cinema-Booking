BEGIN;

-- Khôi phục 12 thể loại phim
UPDATE genres AS g
SET name = v.correct_name
FROM (VALUES
    ('H?nh ??ng', 'Hành Động'),
    ('Kinh D?', 'Kinh Dị'),
    ('H?i', 'Hài'),
    ('T?nh C?m', 'Tình Cảm'),
    ('Vi?n T??ng', 'Viễn Tưởng'),
    ('Ho?t H?nh', 'Hoạt Hình'),
    ('Ch?nh K?ch', 'Chính Kịch'),
    ('T?m L?', 'Tâm Lý'),
    ('Phi?u L?u', 'Phiêu Lưu'),
    ('Kinh ?i?n', 'Kinh Điển'),
    ('T?i Li?u', 'Tài Liệu'),
    ('?m Nh?c', 'Âm Nhạc')
) AS v(bad_name, correct_name)
WHERE g.name = v.bad_name;

-- Khôi phục tên và mô tả của 100 phim theo file seed gốc
WITH source_movies AS (
    SELECT
        n,
        (ARRAY[
            'Bí Ẩn','Huyền Thoại','Vô Cực','Bóng Tối','Ánh Sáng',
            'Hồi Sinh','Định Mệnh','Giông Bão','Ẩn Số','Vực Thẳm',
            'Cơn Ác Mộng','Đế Chế','Ký Ức','Lời Nguyền','Chân Trời',
            'Ngọn Lửa','Cơn Bão','Giấc Mơ','Vòng Xoáy','Tia Chớp'
        ])[((n-1)/5)::int % 20 + 1]
        || ' ' ||
        (ARRAY[
            'Cuối Cùng','Vĩnh Cửu','Bất Tử','Sinh Tồn','Trở Lại'
        ])[(n-1) % 5 + 1] AS correct_title,
        'Bộ phim số ' || n ||
        ' mang đến một câu chuyện đầy kịch tính và cảm xúc, hứa hẹn chinh phục khán giả yêu điện ảnh.'
        AS correct_overview
    FROM generate_series(1, 100) AS n
)
UPDATE movies AS m
SET
    title = s.correct_title,
    overview = s.correct_overview
FROM source_movies AS s
WHERE m.id = (
    '00000003-0000-0000-0000-' || lpad(s.n::text, 12, '0')
)::uuid;

COMMIT;