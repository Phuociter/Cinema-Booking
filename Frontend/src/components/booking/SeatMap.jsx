import React, { useState, useEffect, useMemo } from 'react';
import { useShowtimes } from '../../api';
import { Loader2, AlertCircle, Lock } from 'lucide-react';

const AUDITORIUM_ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];

const SEAT_TYPE_STYLES = {
  VIP: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10',
  Couple: 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-sm shadow-pink-500/10',
  Standard: 'bg-slate-700/60 text-slate-200 border-slate-600/70 hover:border-slate-500',
};
const RESERVED_STYLE = 'bg-slate-800/80 text-slate-600 border-slate-700/60 cursor-not-allowed opacity-60';

function getSeatStyle(seat, isSelected) {
  if (seat.status === 'reserved') return RESERVED_STYLE;
  if (isSelected) {
    return 'bg-red-500/30 text-red-200 border-red-500 ring-2 ring-red-500/60 shadow-lg shadow-red-500/30 scale-105 cursor-pointer font-bold';
  }
  return `${SEAT_TYPE_STYLES[seat.seatTypeName] ?? SEAT_TYPE_STYLES.Standard} cursor-pointer hover:border-white/50 hover:scale-105 active:scale-95`;
}

function groupSeatsByRow(seats) {
  const map = {};
  for (const seat of seats) {
    (map[seat.rowLabel] ??= []).push(seat);
  }
  for (const row in map) {
    map[row].sort((a, b) => a.columnNumber - b.columnNumber);
  }
  return map;
}

const SeatMap = ({ showtimeId, selectedSeats: externalSelectedSeats, onSeatSelected, maxSeats = 8 }) => {
  const [seats, setSeats] = useState([]);
  const [internalSelectedSeats, setInternalSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isControlled = externalSelectedSeats !== undefined;
  const selectedSeats = isControlled ? externalSelectedSeats : internalSelectedSeats;

  useEffect(() => {
    if (!showtimeId) {
      setLoading(false);
      return;
    }

    const fetchSeats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await useShowtimes.getShowtimeSeats(showtimeId);
        setSeats(data || []);
      } catch (err) {
        setError(err.message || 'Không thể tải sơ đồ ghế');
      } finally {
        setLoading(false);
      }
    };

    fetchSeats();
  }, [showtimeId]);

  const seatsByRow = useMemo(() => groupSeatsByRow(seats), [seats]);

  const handleSeatClick = (seat) => {
    if (seat.status === 'reserved') return;

    const isSelected = selectedSeats.some((s) => s.id === seat.id);
    let updated;
    if (isSelected) {
      updated = selectedSeats.filter((s) => s.id !== seat.id);
    } else {
      if (selectedSeats.length >= maxSeats) {
        alert(`Chỉ được chọn tối đa ${maxSeats} ghế cho một lần đặt vé.`);
        return;
      }
      updated = [...selectedSeats, seat];
    }

    if (!isControlled) {
      setInternalSelectedSeats(updated);
    }
    if (onSeatSelected) {
      onSeatSelected(updated);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/80 p-8 rounded-2xl border border-white/10 flex flex-col items-center justify-center min-h-[360px]">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-3" />
        <p className="text-slate-400 text-sm">Đang tải dữ liệu sơ đồ ghế...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900/80 p-8 rounded-2xl border border-red-500/30 flex flex-col items-center justify-center min-h-[360px] text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-red-300 text-sm mb-2">{error}</p>
        <p className="text-slate-500 text-xs">Vui lòng kiểm tra lại mã suất chiếu</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 p-6 md:p-8 rounded-2xl border border-white/10 backdrop-blur-md">
      {/* Header & Tiêu đề */}
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">Sơ Đồ Ghế Phòng Chiếu</h2>
        <p className="text-slate-400 text-xs md:text-sm mt-1">Phòng chiếu tiêu chuẩn 48 ghế (6 hàng × 8 cột)</p>
      </div>

      {/* Màn hình chiếu phim */}
      <div className="max-w-xl mx-auto mb-10">
        <div className="h-2 w-full bg-gradient-to-r from-transparent via-red-500 to-transparent rounded-full shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
        <p className="text-center text-[11px] uppercase tracking-[0.3em] text-slate-500 mt-2 font-medium">Màn Hình Chiếu</p>
      </div>

      {/* Ma trận ghế */}
      <div className="max-w-2xl mx-auto space-y-3">
        {AUDITORIUM_ROWS.map((rowLabel) => (
          <div key={rowLabel} className="flex items-center justify-center gap-2 md:gap-3">
            <span className="w-5 text-center font-bold text-xs text-slate-400 select-none">
              {rowLabel}
            </span>

            <div className="flex items-center gap-1.5 md:gap-2">
              {(seatsByRow[rowLabel] ?? []).map((seat) => {
                const isReserved = seat.status === 'reserved';
                const isSelected = selectedSeats.some((s) => s.id === seat.id);

                return (
                  <button
                    type="button"
                    key={seat.id}
                    disabled={isReserved}
                    onClick={() => handleSeatClick(seat)}
                    title={`${seat.seatCode} (${seat.seatTypeName}) - ${seat.totalPrice?.toLocaleString('vi-VN')}đ - Trạng thái: ${isReserved ? 'Đã đặt' : isSelected ? 'Đang chọn' : 'Còn trống'}`}
                    className={`relative w-8 h-8 md:w-10 md:h-10 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all duration-200 select-none ${getSeatStyle(seat, isSelected)}`}
                  >
                    {isReserved ? (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      seat.columnNumber
                    )}
                  </button>
                );
              })}
            </div>

            <span className="w-5 text-center font-bold text-xs text-slate-400 select-none">
              {rowLabel}
            </span>
          </div>
        ))}
      </div>

      {/* Chú thích loại ghế (Legend) */}
      <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md border border-slate-600/70 bg-slate-700/60" />
          <span className="text-slate-300">Thường (A - D)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md border border-amber-500/50 bg-amber-500/20" />
          <span className="text-amber-300">VIP (E)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md border border-pink-500/50 bg-pink-500/20" />
          <span className="text-pink-300">Ghế Đôi (F)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md border border-red-500 bg-red-500/30 flex items-center justify-center text-red-200 text-xs font-bold">1</div>
          <span className="text-red-400 font-medium">Đang chọn</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md border border-slate-700/60 bg-slate-800/80 flex items-center justify-center">
            <Lock className="w-3 h-3 text-slate-500" />
          </div>
          <span className="text-slate-500">Đã đặt</span>
        </div>
      </div>
    </div>
  );
};

export default SeatMap;
