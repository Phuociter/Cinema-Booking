BEGIN;

WITH expected AS (
    SELECT
        ('00000009-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid AS id,
        (ARRAY[
            'Bắp Rang Bơ',
            'Combo Nước Ngọt',
            'Snack Khoai Tây',
            'Hot Dog Phô Mai',
            'Kẹo Dẻo Trái Cây',
            'Nachos Sốt Phô Mai',
            'Trà Sữa Trân Châu',
            'Nước Ngọt Có Gas',
            'Bánh Mì Que',
            'Pop Corn Caramel'
        ])[(n % 10) + 1]
        || ' - ' ||
        (ARRAY['Nhỏ', 'Vừa', 'Lớn', 'Đặc Biệt', 'Combo Đôi'])[(n % 5) + 1]
        AS expected_name
    FROM generate_series(1, 100) AS n
)
UPDATE public.snacks AS s
SET
    name = e.expected_name,
    description = 'Món ăn vặt yêu thích khi xem phim, thơm ngon và tiện lợi.'
FROM expected AS e
WHERE s.id = e.id
  AND (
      s.name IS DISTINCT FROM e.expected_name
      OR s.description IS DISTINCT FROM
         'Món ăn vặt yêu thích khi xem phim, thơm ngon và tiện lợi.'
  );

SELECT COUNT(*) AS correctly_repaired_in_test
FROM public.snacks AS s
JOIN (
    SELECT
        ('00000009-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid AS id,
        (ARRAY[
            'Bắp Rang Bơ',
            'Combo Nước Ngọt',
            'Snack Khoai Tây',
            'Hot Dog Phô Mai',
            'Kẹo Dẻo Trái Cây',
            'Nachos Sốt Phô Mai',
            'Trà Sữa Trân Châu',
            'Nước Ngọt Có Gas',
            'Bánh Mì Que',
            'Pop Corn Caramel'
        ])[(n % 10) + 1]
        || ' - ' ||
        (ARRAY['Nhỏ', 'Vừa', 'Lớn', 'Đặc Biệt', 'Combo Đôi'])[(n % 5) + 1]
        AS expected_name
    FROM generate_series(1, 100) AS n
) AS e ON s.id = e.id
WHERE s.name = e.expected_name
  AND s.description =
      'Món ăn vặt yêu thích khi xem phim, thơm ngon và tiện lợi.';

COMMIT;