import React from 'react';

/**
 * TableContainer - Khung table tĩnh dùng chung cho các module Admin.
 * Đặc điểm:
 * - Header và Pagination cố định (đứng yên), dữ liệu cuộn bên trong (body scroll).
 * - Chiều cao cố định theo viewport hoặc co giãn linh hoạt theo container cha.
 * - Loading overlay mượt mà không làm lệch layout.
 */
export const TableContainer = ({
  children,
  pagination = null,
  footer = null,
  isLoading = false,
  loadingText = 'Đang tải dữ liệu...',
  containerRef = null,
  className = '',
  bodyClassName = '',
}) => {
  return (
    <div
      className={`flex flex-col min-h-0 rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden shadow-lg shadow-black/40 ${className}`}
    >
      {/* Vùng cuộn dữ liệu: Co giãn linh hoạt chiếm trọn chiều cao, header sticky top, pagination ở đáy */}
      <div
        ref={containerRef}
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-auto relative scroll-smooth ${bodyClassName}`}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[1px] flex items-center justify-center text-xs text-zinc-300 z-20">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-md shadow-lg">
              <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span>{loadingText}</span>
            </div>
          </div>
        )}
        {children}
      </div>

      {/* Phân trang đứng yên cố định ở đáy table */}
      {(pagination || footer) && (
        <div className="border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm px-4 py-2.5 z-10 shrink-0">
          {pagination}
          {footer}
        </div>
      )}
    </div>
  );
};

export default TableContainer;
