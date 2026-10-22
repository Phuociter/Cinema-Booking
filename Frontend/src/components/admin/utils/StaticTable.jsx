import React from 'react';

/**
 * StaticTable - Template Table tĩnh tái sử dụng cho toàn bộ phân hệ Admin
 * 
 * Đặc tính:
 * 1. Khung Table đứng yên cố định (không làm cuộn trang web).
 * 2. Cột tiêu đề (Columns/Thead) đứng yên cố định ở trên đỉnh khi cuộn (Sticky Header).
 * 3. Chỉ có phần dữ liệu (Tbody) bên trong là được cuộn (Internal Scroll).
 * 4. Phần phân trang (Pagination) đứng yên cố định ở đáy bảng (Sticky Footer).
 * 
 * @param {Array} columns - Danh sách cột [{ key, label, className, align, width }]
 * @param {Array} data - Mảng dữ liệu các dòng
 * @param {Function} renderRow - Hàm render từng dòng: (item, index) => <tr ...>
 * @param {React.ReactNode} children - Hoặc truyền trực tiếp tbody/tr bên trong
 * @param {React.ReactNode} pagination - Component phân trang hiển thị ở đáy cố định
 * @param {string} height - Chiều cao cố định của vùng dữ liệu (mặc định: 'max-h-[500px]')
 * @param {boolean} isLoading - Trạng thái đang tải dữ liệu (hiện lớp phủ loading)
 * @param {React.ReactNode} emptyState - Giao diện hiển thị khi không có dữ liệu
 * @param {React.ReactNode} headerActions - Các nút/công cụ phụ trên thanh header nếu có
 */
export const StaticTable = ({
  columns = [],
  data = [],
  renderRow,
  children,
  pagination = null,
  height = 'max-h-[520px]',
  isLoading = false,
  emptyState = null,
  containerRef = null,
  minWidth = 'min-w-[700px]',
  className = '',
}) => {
  const hasData = (data && data.length > 0) || Boolean(children);

  return (
    <div className={`flex flex-col rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden shadow-lg shadow-black/40 ${className}`}>
      {/* Vùng cuộn dữ liệu bên trong table (Header đứng yên, Data cuộn) */}
      <div
        ref={containerRef}
        className={`w-full overflow-x-auto overflow-y-auto ${height} relative scroll-smooth`}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-[1px] flex items-center justify-center text-xs text-zinc-300 z-20">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-md shadow-lg">
              <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span>Đang tải dữ liệu...</span>
            </div>
          </div>
        )}

        <table className={`w-full ${minWidth} border-collapse text-left text-xs sm:text-sm`}>
          {/* Header các cột - CỐ ĐỊNH Ở ĐỈNH (Sticky Thead) */}
          <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 shadow-sm shadow-black/50 select-none">
            <tr className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              {columns.map((col) => {
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key || col.label}
                    style={col.width ? { width: col.width } : {}}
                    className={`bg-zinc-900 py-3 px-4 ${alignClass} ${col.className || ''}`}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Dữ liệu các dòng (Scrollable Data) */}
          <tbody className="divide-y divide-zinc-800/60 bg-zinc-950">
            {children ? (
              children
            ) : renderRow && data.length > 0 ? (
              data.map((item, index) => renderRow(item, index))
            ) : null}
          </tbody>
        </table>

        {/* Trạng thái rỗng khi không có dữ liệu */}
        {!hasData && !isLoading && (
          <div className="py-12 text-center text-xs text-zinc-400">
            {emptyState || 'Không có dữ liệu để hiển thị.'}
          </div>
        )}
      </div>

      {/* Footer Phân trang - CỐ ĐỊNH Ở ĐÁY TABLE (Sticky/Pinned Footer) */}
      {pagination && (
        <div className="border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm px-4 py-2.5 z-10 shrink-0">
          {pagination}
        </div>
      )}
    </div>
  );
};

export default StaticTable;
