import React, { useEffect, useState } from 'react';
import { useShowtimes } from '../../../api/useShowtimes';
import { formatTime, formatCurrency } from '../../../lib/formatters';

export const ShowtimeDetailPanel = ({
  showtime,
  onOpenSeatMap,
  onCancelShowtime,
  onRestoreShowtime,
}) => {
  const [seatsData, setSeatsData] = useState([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);

  useEffect(() => {
    if (!showtime?.id) {
      setSeatsData([]);
      return;
    }

    let isMounted = true;
    setIsLoadingSeats(true);

    useShowtimes
      .getAdminShowtimeSeats(showtime.id)
      .then((res) => {
        if (isMounted) {
          setSeatsData(res?.data || []);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải sơ đồ ghế cho panel chi tiết:', err);
        if (isMounted) setSeatsData([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSeats(false);
      });

    return () => {
      isMounted = false;
    };
  }, [showtime?.id]);

  if (!showtime) {
    return (
      <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-400">
        Chọn một suất chiếu từ bảng hoặc lịch để xem chi tiết.
      </div>
    );
  }

  const isCancelled = showtime.status === 'cancelled';

  // Thống kê đếm ghế từ kết quả admin-seats
  const soldCount = seatsData.filter((s) => s.status === 'sold').length;
  const holdingCount = seatsData.filter((s) => s.status === 'holding').length;
  const maintenanceCount = seatsData.filter((s) => s.status === 'maintenance').length;

  return (
    <div className="flex flex-col h-full min-h-0 rounded-md border border-zinc-800 bg-zinc-950 text-xs shadow-lg shadow-black/40 overflow-hidden">
      <div className="border-b border-zinc-800 px-3.5 py-2 font-semibold text-zinc-100 flex items-center justify-between shrink-0">
        <span>Chi tiết suất chiếu</span>
      </div>

      <div className="p-3 flex-1 min-h-0 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-2.5">
          {/* Tên phim */}
          <div>
            <b className="text-sm font-semibold text-zinc-100 block truncate">{showtime.movieTitle}</b>
            <div className="text-[10px] text-zinc-400 font-mono">
              Mã suất: {showtime.id.slice(0, 8)}...
            </div>
          </div>

          {/* Thông tin metadata */}
          <div className="space-y-1.5 border-t border-zinc-800/80 pt-2 text-[11px]">
            <div className="flex justify-between text-zinc-400">
              <span>Rạp / phòng</span>
              <b className="text-zinc-200 text-right truncate max-w-[150px]">
                {showtime.auditoriumName} · {showtime.hallType || '2D'}
              </b>
            </div>

            <div className="flex justify-between text-zinc-400">
              <span>Giờ chiếu</span>
              <b className="font-mono text-zinc-200">
                {formatTime(showtime.startTime)} – {formatTime(showtime.endTime)}
              </b>
            </div>

            <div className="flex justify-between text-zinc-400">
              <span>Giá cơ bản</span>
              <b className="font-mono text-zinc-200">
                {formatCurrency(showtime.basePrice)}
              </b>
            </div>
          </div>

          {/* Thống kê ghế (admin-seats) - 3 Cột ngang gọn gàng */}
          <div className="grid grid-cols-3 gap-1.5 border-t border-zinc-800/80 pt-2 text-center">
            <div className="rounded bg-zinc-900/60 p-1.5 border border-zinc-800/60">
              <span className="text-[10px] text-zinc-400 block">Đã bán</span>
              <b className="font-mono text-xs text-red-400">{isLoadingSeats ? '...' : soldCount}</b>
            </div>
            <div className="rounded bg-zinc-900/60 p-1.5 border border-zinc-800/60">
              <span className="text-[10px] text-zinc-400 block">Đang giữ</span>
              <b className="font-mono text-xs text-amber-400">{isLoadingSeats ? '...' : holdingCount}</b>
            </div>
            <div className="rounded bg-zinc-900/60 p-1.5 border border-zinc-800/60">
              <span className="text-[10px] text-zinc-400 block">Bảo trì</span>
              <b className="font-mono text-xs text-zinc-400">{isLoadingSeats ? '...' : maintenanceCount}</b>
            </div>
          </div>

          {/* Mini Preview Sơ đồ ghế - clickable để mở modal sơ đồ đầy đủ */}
          <div
            onClick={onOpenSeatMap}
            className="border-t border-zinc-800/80 pt-2 cursor-pointer group"
            title="Bấm vào để mở sơ đồ ghế đầy đủ"
          >
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1 font-medium">
              <span>Sơ đồ ghế ({seatsData.length} ghế)</span>
              <span className="text-primary group-hover:underline text-[10px]">Mở lớn ↗</span>
            </div>
            {isLoadingSeats ? (
              <div className="h-20 flex items-center justify-center text-zinc-400 text-[10px]">
                Đang tải ghế...
              </div>
            ) : (
              <div className="p-1 bg-zinc-900/60 rounded border border-zinc-800/80 group-hover:border-zinc-700 transition-colors">
                <div className="grid grid-cols-8 gap-0.5">
                  {seatsData.slice(0, 48).map((seat) => {
                    let bg = 'bg-zinc-800 border-zinc-700 text-zinc-400';
                    if (seat.status === 'sold') bg = 'bg-red-500/80 border-red-500 text-white';
                    else if (seat.status === 'holding') bg = 'border-amber-400 border-dashed text-amber-300';
                    else if (seat.status === 'maintenance') bg = 'bg-zinc-700/60 text-zinc-400';

                    return (
                      <div
                        key={seat.showtimeSeatId}
                        className={`h-7 rounded-[2px] border text-[7px] flex items-center justify-center font-mono ${bg}`}
                        title={`${seat.seatCode} (${seat.status})`}
                      >
                        {seat.columnNumber}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Thao tác: 2 nút chính ghim ở đáy */}
        <div className="space-y-1.5 border-t border-zinc-800/80 pt-2.5 mt-3 shrink-0">
          <button
            type="button"
            onClick={onOpenSeatMap}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer"
          >
            Mở sơ đồ ghế đầy đủ
          </button>

          {isCancelled ? (
            <button
              type="button"
              title="Mở lại suất chiếu này"
              onClick={() => onRestoreShowtime && onRestoreShowtime(showtime)}
              className="w-full rounded border border-emerald-950/60 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-800 transition-colors cursor-pointer font-medium"
            >
              Mở lại suất chiếu
            </button>
          ) : (
            <button
              type="button"
              disabled={isCancelled}
              title={isCancelled ? 'Suất chiếu đã hủy' : 'Hủy suất chiếu này'}
              onClick={() => onCancelShowtime(showtime)}
              className={`w-full rounded border border-red-950/60 bg-red-950/20 px-3 py-1.5 text-xs text-red-400 transition-colors ${
                isCancelled
                  ? 'opacity-35 cursor-not-allowed'
                  : 'hover:bg-red-900/30 hover:border-red-800 cursor-pointer'
              }`}
            >
              Hủy suất chiếu
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowtimeDetailPanel;
