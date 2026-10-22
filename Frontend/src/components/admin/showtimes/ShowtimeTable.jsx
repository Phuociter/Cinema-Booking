import React from 'react';
import { formatTime, formatDate } from '../../../lib/formatters';
import { StatusDot } from '../ui/StatusDot';

export const ShowtimeTable = ({
  showtimes = [],
  selectedId,
  onSelectShowtime,
  onCancelClick,
  onRestoreClick,
}) => {
  return (
    <div className="w-full">
      <table className="w-full min-w-[680px] border-collapse text-left text-xs sm:text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 shadow-sm shadow-black/50 select-none">
          <tr className="text-xs font-semibold text-zinc-300">
            <th className="bg-zinc-900 py-3 px-4">Phim</th>
            <th className="bg-zinc-900 py-3 px-4">Phòng / Rạp</th>
            <th className="bg-zinc-900 py-3 px-4">Giờ chiếu</th>
            <th className="bg-zinc-900 py-3 px-4">Trạng thái</th>
            <th className="bg-zinc-900 py-3 px-4 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {showtimes.map((item) => {
            const isSelected = item.id === selectedId;
            const isCancelled = item.status === 'cancelled';

            return (
              <tr
                key={item.id}
                onClick={() => onSelectShowtime(item)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-zinc-900 border-l-2 border-primary'
                    : 'hover:bg-zinc-900/50'
                }`}
              >
                {/* 1. Phim */}
                <td className="py-3 px-4">
                  <div className="font-medium text-zinc-100">
                    {item.movieTitle || 'Không rõ tên phim'}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Mã suất: <span className="font-mono text-zinc-400">{item.id.slice(0, 8)}</span>
                  </div>
                </td>

                {/* 2. Rạp / Phòng */}
                <td className="py-3 px-4">
                  <div className="text-zinc-200">
                    {item.auditoriumName}
                    {item.hallType && (
                      <span className="ml-1.5 rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-mono text-zinc-300">
                        {item.hallType}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 truncate max-w-[180px]">
                    {item.cinemaName}
                  </div>
                </td>

                {/* 3. Giờ chiếu */}
                <td className="py-3 px-4 font-mono text-zinc-200">
                  <div className="font-medium">
                    {formatTime(item.startTime)} – {formatTime(item.endTime)}
                  </div>
                  <div className="text-xs text-zinc-400 font-sans">
                    {formatDate(item.startTime)}
                  </div>
                </td>

                {/* 4. Trạng thái */}
                <td className="py-3 px-4">
                  <StatusDot status={item.status} />
                </td>

                {/* 5. Cột Thao tác */}
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectShowtime(item);
                      }}
                      className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Chi tiết
                    </button>

                    {isCancelled ? (
                      <button
                        type="button"
                        title="Mở lại suất chiếu này"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onRestoreClick) onRestoreClick(item);
                        }}
                        className="rounded border border-emerald-950/60 bg-emerald-950/30 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-800 transition-colors cursor-pointer font-medium"
                      >
                        Mở lại
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Hủy suất chiếu"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelClick(item);
                        }}
                        className="rounded border border-red-950/60 bg-red-950/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-900/30 hover:border-red-800 transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ShowtimeTable;
