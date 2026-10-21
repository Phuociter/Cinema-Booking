import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '../showtimes/constants';

/**
 * Pagination component for Admin tables (Pure UI)
 */
export const Pagination = ({
  page = 1,
  pageSize = 50,
  total,
  itemCount = 0,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}) => {
  const safePageSize = PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : 50;
  const totalPages = total != null ? Math.max(1, Math.ceil(total / safePageSize)) : null;

  const canPrev = page > 1;
  const canNext = totalPages != null ? page < totalPages : itemCount === safePageSize;

  const from = itemCount > 0 ? (page - 1) * safePageSize + 1 : 0;
  const to = itemCount > 0 ? (page - 1) * safePageSize + itemCount : 0;

  const rangeText = total != null
    ? `Hiển thị ${from}–${to} / ${total}`
    : `Hiển thị ${from}–${to}`;

  const getPageItems = () => {
    if (totalPages == null) {
      return [page];
    }
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const pageItems = getPageItems();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800 text-xs min-h-[44px]">
      {/* Trái: Phạm vi hiển thị */}
      <div className="font-mono text-zinc-400 select-none">
        {rangeText}
      </div>

      {/* Giữa: Nút Trước / Dãy số trang / Sau */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || !canPrev}
          className={`flex items-center gap-0.5 px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors ${
            disabled || !canPrev
              ? 'opacity-35 cursor-not-allowed'
              : 'hover:bg-zinc-800 hover:text-white cursor-pointer'
          }`}
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Trước</span>
        </button>

        <div className="flex items-center gap-1">
          {pageItems.map((item, idx) => {
            if (item === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1 text-zinc-500 font-mono select-none">
                  …
                </span>
              );
            }
            const isCurrent = item === page;
            return (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                disabled={disabled || isCurrent}
                className={`min-w-[28px] h-7 px-1.5 rounded font-mono text-xs flex items-center justify-center transition-colors ${
                  isCurrent
                    ? 'border border-primary bg-primary/10 text-primary font-semibold cursor-default'
                    : disabled
                    ? 'border border-zinc-800 bg-zinc-900 text-zinc-400 opacity-50 cursor-not-allowed'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 cursor-pointer'
                }`}
                aria-label={`Trang ${item}`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !canNext}
          className={`flex items-center gap-0.5 px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors ${
            disabled || !canNext
              ? 'opacity-35 cursor-not-allowed'
              : 'hover:bg-zinc-800 hover:text-white cursor-pointer'
          }`}
          aria-label="Trang sau"
        >
          <span>Sau</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Phải: Chọn pageSize */}
      <div className="flex items-center gap-2">
        <label htmlFor="admin-page-size" className="text-zinc-400 select-none">
          Số dòng / trang
        </label>
        <select
          id="admin-page-size"
          aria-label="Số dòng mỗi trang"
          value={safePageSize}
          onChange={(e) => {
            const val = Number(e.target.value);
            onPageSizeChange(PAGE_SIZE_OPTIONS.includes(val) ? val : 50);
          }}
          disabled={disabled}
          className="rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200 px-2 py-1 outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Pagination;
