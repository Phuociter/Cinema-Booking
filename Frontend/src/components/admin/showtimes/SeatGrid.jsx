import React, { useMemo } from 'react';

export const SeatGrid = ({
  seats = [],
  selectedSeatId,
  selectedSeatIds = [],
  onSelectSeat,
}) => {
  // Lấy danh sách hàng ghế duy nhất theo thứ tự
  const rowLabels = useMemo(() => {
    return Array.from(new Set(seats.map((s) => s.rowLabel))).sort();
  }, [seats]);

  // Kiểm tra hàng ghế có phải là hàng ghế Couple hay không
  const isCoupleRow = useMemo(() => {
    const coupleSet = new Set();
    seats.forEach((s) => {
      const typeName = (s.seatTypeName || '').toLowerCase();
      if (typeName.includes('couple') || typeName.includes('đôi') || s.rowLabel === 'F') {
        coupleSet.add(s.rowLabel);
      }
    });
    return (row) => coupleSet.has(row);
  }, [seats]);

  // Tìm số cột lớn nhất để cố định lưới tọa độ (tránh dồn ghế khi thiếu ô)
  const maxColumns = useMemo(() => {
    if (seats.length === 0) return 8;
    return Math.max(...seats.map((s) => s.columnNumber), 8);
  }, [seats]);

  // Tạo lookup map: `${rowLabel}_${col}` -> seat
  const seatMap = useMemo(() => {
    const map = new Map();
    seats.forEach((s) => {
      map.set(`${s.rowLabel}_${s.columnNumber}`, s);
    });
    return map;
  }, [seats]);

  if (seats.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-zinc-400">
        Không có dữ liệu ghế cho suất chiếu này.
      </div>
    );
  }

  return (
    <div className="w-full select-none overflow-x-auto py-2">
      {/* Màn hình chiếu */}
      <div className="mx-auto max-w-md border-t-2 border-zinc-600 pt-1 text-center text-[10px] font-medium tracking-[0.25em] text-zinc-400 mb-4">
        MÀN HÌNH CHIẾU
      </div>

      {/* Lưới ghế: Cột nhãn trái (18px) + maxColumns cột ghế + Cột nhãn phải (18px) */}
      <div
        className="grid gap-1.5 justify-center mx-auto"
        style={{
          gridTemplateColumns: `20px repeat(${maxColumns}, minmax(24px, 34px)) 20px`,
        }}
      >
        {rowLabels.map((row) => {
          const isCouple = isCoupleRow(row);

          return (
            <React.Fragment key={row}>
              {/* Nhãn hàng bên trái */}
              <div className="flex items-center justify-center font-mono text-[11px] font-semibold text-zinc-400">
                {row}
              </div>

              {isCouple ? (
                // Render hàng Couple ghép đôi 2 ghế liền nhau: cặp 1-2, 3-4, 5-6, 7-8 có viền chung
                Array.from({ length: Math.ceil(maxColumns / 2) }, (_, pairIdx) => {
                  const colA = pairIdx * 2 + 1;
                  const colB = pairIdx * 2 + 2;
                  const seatA = seatMap.get(`${row}_${colA}`);
                  const seatB = seatMap.get(`${row}_${colB}`);

                  if (!seatA && !seatB) {
                    return (
                      <div
                        key={`${row}_${colA}_${colB}`}
                        className="col-span-2 invisible pointer-events-none"
                        aria-hidden="true"
                      />
                    );
                  }

                  const isSelected =
                    (seatA && (seatA.seatId === selectedSeatId || selectedSeatIds.includes(seatA.seatId))) ||
                    (seatB && (seatB.seatId === selectedSeatId || selectedSeatIds.includes(seatB.seatId)));

                  const pairStatus =
                    seatA?.status === 'sold' || seatB?.status === 'sold'
                      ? 'sold'
                      : seatA?.status === 'holding' || seatB?.status === 'holding'
                      ? 'holding'
                      : seatA?.status === 'maintenance' || seatB?.status === 'maintenance'
                      ? 'maintenance'
                      : 'available';

                  return (
                    <div
                      key={`${row}_${colA}_${colB}`}
                      onClick={() => onSelectSeat(seatA || seatB)}
                      className={`col-span-2 rounded flex items-stretch p-0.5 gap-0.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-primary ring-offset-1 ring-offset-zinc-950 border border-primary bg-primary/20 font-bold scale-[1.02]'
                          : 'border border-pink-500/60 bg-pink-950/20 hover:border-pink-400 hover:bg-pink-950/35'
                      }`}
                      title={`${row}${colA}-${row}${colB} · Ghế đôi Couple · ${pairStatus}`}
                    >
                      {seatA && (
                        <div
                          style={
                            seatA.status === 'maintenance'
                              ? {
                                  backgroundImage:
                                    'repeating-linear-gradient(135deg, #18181b 0 3px, #27272a 3px 6px)',
                                }
                              : {}
                          }
                          className={`flex-1 rounded-sm aspect-square flex items-center justify-center font-mono text-[11px] ${
                            seatA.status === 'sold'
                              ? 'bg-red-500 text-white font-semibold'
                              : seatA.status === 'holding'
                              ? 'border border-dashed border-amber-400 text-amber-300'
                              : seatA.status === 'maintenance'
                              ? 'border border-zinc-700 text-zinc-400'
                              : 'bg-zinc-900/90 text-pink-200'
                          }`}
                        >
                          {colA}
                        </div>
                      )}
                      {seatB && (
                        <div
                          style={
                            seatB.status === 'maintenance'
                              ? {
                                  backgroundImage:
                                    'repeating-linear-gradient(135deg, #18181b 0 3px, #27272a 3px 6px)',
                                }
                              : {}
                          }
                          className={`flex-1 rounded-sm aspect-square flex items-center justify-center font-mono text-[11px] ${
                            seatB.status === 'sold'
                              ? 'bg-red-500 text-white font-semibold'
                              : seatB.status === 'holding'
                              ? 'border border-dashed border-amber-400 text-amber-300'
                              : seatB.status === 'maintenance'
                              ? 'border border-zinc-700 text-zinc-400'
                              : 'bg-zinc-900/90 text-pink-200'
                          }`}
                        >
                          {colB}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // Render ghế đơn tiêu chuẩn (hàng thường, VIP)
                Array.from({ length: maxColumns }, (_, i) => i + 1).map((col) => {
                  const seat = seatMap.get(`${row}_${col}`);

                  if (!seat) {
                    return (
                      <div
                        key={`${row}_${col}`}
                        className="invisible aspect-square pointer-events-none"
                        aria-hidden="true"
                      />
                    );
                  }

                  const isSelected =
                    seat.seatId === selectedSeatId ||
                    seat.showtimeSeatId === selectedSeatId ||
                    selectedSeatIds.includes(seat.seatId);
                  const status = seat.status?.toLowerCase();
                  const typeName = (seat.seatTypeName || '').toLowerCase();

                  let statusStyle = 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-zinc-500';
                  if (status === 'sold') {
                    statusStyle = 'bg-red-500 border border-red-500 text-white font-semibold';
                  } else if (status === 'holding') {
                    statusStyle = 'border-[1.5px] border-dashed border-amber-400 text-amber-300 bg-transparent';
                  } else if (status === 'maintenance') {
                    statusStyle = 'border border-zinc-700 text-zinc-400';
                  }

                  let typeIndicator = '';
                  if (typeName.includes('vip')) {
                    typeIndicator = 'shadow-[inset_0_-2.5px_0_#fbbf24]';
                  } else if (typeName.includes('couple') || typeName.includes('đôi')) {
                    typeIndicator = 'shadow-[inset_0_-2.5px_0_var(--color-primary)]';
                  }

                  return (
                    <button
                      key={seat.showtimeSeatId || `${row}_${col}`}
                      type="button"
                      onClick={() => onSelectSeat(seat)}
                      style={
                        status === 'maintenance'
                          ? {
                              backgroundImage:
                                'repeating-linear-gradient(135deg, #18181b 0 3px, #27272a 3px 6px)',
                            }
                          : {}
                      }
                      className={`aspect-square rounded flex items-center justify-center font-mono text-[11px] transition-all cursor-pointer ${statusStyle} ${typeIndicator} ${
                        isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-zinc-950 font-bold scale-105' : ''
                      }`}
                      title={`${seat.seatCode} · ${seat.seatTypeName} · ${status}`}
                    >
                      {col}
                    </button>
                  );
                })
              )}

              {/* Nhãn hàng bên phải */}
              <div className="flex items-center justify-center font-mono text-[11px] font-semibold text-zinc-400">
                {row}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default SeatGrid;
