import React from 'react';
import { Search, X, Calendar } from 'lucide-react';
import { SearchableSelect } from '../ui';
import { STATUS_FILTER_OPTIONS, isDateRangeInvalid } from './orderStatus';

export const OrderFilters = ({
  search = '',
  onSearchChange,
  status = 'success',
  onStatusChange,
  dateFrom = '',
  onDateFromChange,
  dateTo = '',
  onDateToChange,
  cinemas = [],
  cinemaId = '',
  onCinemaChange,
  movies = [],
  movieId = '',
  onMovieChange,
  onReset,
  disabled = false,
}) => {
  const isRangeInvalid = isDateRangeInvalid(dateFrom, dateTo);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2.5 bg-zinc-950 p-2.5 sm:p-3 rounded-md border border-zinc-800 text-xs">
        {/* Tìm kiếm */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo mã đơn, email, SĐT, tên khách..."
            maxLength={100}
            disabled={disabled}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 pl-8 text-zinc-100 placeholder-zinc-500 outline-none focus:border-primary transition-colors disabled:opacity-50"
            aria-label="Tìm kiếm đơn đặt vé"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              aria-label="Bỏ lọc tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Lọc Cụm rạp */}
        <SearchableSelect
          options={cinemas.map((c) => ({
            value: c.id,
            label: c.name,
            sublabel: c.city,
          }))}
          value={cinemaId}
          onChange={onCinemaChange}
          placeholder="Tất cả rạp"
          searchPlaceholder="Tìm kiếm cụm rạp..."
          emptyText="Không tìm thấy cụm rạp nào"
          disabled={disabled}
          buttonClassName="min-w-[160px] max-w-[220px]"
          ariaLabel="Lọc vé theo rạp"
        />

        {/* Lọc Phim */}
        <SearchableSelect
          options={movies.map((m) => ({
            value: m.id,
            label: m.title,
          }))}
          value={movieId}
          onChange={onMovieChange}
          placeholder="Tất cả phim"
          searchPlaceholder="Tìm kiếm phim..."
          emptyText="Không tìm thấy phim nào"
          disabled={disabled}
          buttonClassName="min-w-[150px] max-w-[220px]"
          ariaLabel="Lọc vé theo tên phim"
        />

        {/* Trạng thái */}
        <div className="min-w-[135px]">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            disabled={disabled}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 outline-none focus:border-primary transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Lọc theo trạng thái"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ngày bắt đầu & kết thúc */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              disabled={disabled}
              className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-200 outline-none focus:border-primary transition-colors text-xs disabled:opacity-50 cursor-pointer [color-scheme:dark]"
              aria-label="Từ ngày"
            />
          </div>
          <span className="text-zinc-500">—</span>
          <div className="relative">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              disabled={disabled}
              className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-200 outline-none focus:border-primary transition-colors text-xs disabled:opacity-50 cursor-pointer [color-scheme:dark]"
              aria-label="Đến ngày"
            />
          </div>
          <span className="text-[11px] text-zinc-400 font-mono select-none flex items-center gap-1">
            <Calendar className="h-3 w-3 text-zinc-500" />
            UTC
          </span>
        </div>

        {/* Nút đặt lại */}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="px-2.5 py-1.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            Đặt lại
          </button>
        )}
      </div>

      {/* Thông báo lỗi khoảng ngày không hợp lệ */}
      {isRangeInvalid && (
        <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded px-3 py-1.5">
          Khoảng ngày không hợp lệ: ngày bắt đầu không được lớn hơn ngày kết thúc.
        </div>
      )}
    </div>
  );
};

export default OrderFilters;
