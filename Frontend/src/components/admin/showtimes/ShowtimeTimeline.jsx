import React from 'react';
import { TIMELINE_HOURS, TIMELINE_START_HOUR, TIMELINE_TOTAL_HOURS } from './constants';
import { toDecimalHour, getTimelinePosition } from './showtimeUtils';
import { formatTime } from '../../../lib/formatters';

export const ShowtimeTimeline = ({
  showtimes = [],
  selectedId,
  onSelectShowtime,
}) => {
  // Gom nhóm suất chiếu theo Phòng chiếu
  const roomsMap = {};
  showtimes.forEach((s) => {
    const roomKey = `${s.cinemaName || ''} · ${s.auditoriumName || 'Phòng chiếu'}`;
    if (!roomsMap[roomKey]) {
      roomsMap[roomKey] = {
        name: roomKey,
        hallType: s.hallType,
        showtimes: [],
      };
    }
    roomsMap[roomKey].showtimes.push(s);
  });

  const roomsList = Object.values(roomsMap);

  if (roomsList.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-md">
        Không có suất chiếu nào để dựng lịch theo phòng.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 overflow-x-auto text-xs">
      {/* Header trục giờ (08:00 -> 24:00) */}
      <div className="grid grid-cols-[140px_1fr] items-center mb-3 text-zinc-400 font-mono">
        <div className="text-zinc-400 font-sans text-xs">Phòng / Giờ</div>
        <div className="flex justify-between px-1">
          {TIMELINE_HOURS.map((hr) => (
            <span key={hr} className="text-[11px]">
              {String(hr).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>

      {/* Từng hàng phòng chiếu */}
      <div className="space-y-3">
        {roomsList.map((room) => (
          <div
            key={room.name}
            className="grid grid-cols-[140px_1fr] items-center border-t border-zinc-800/80 pt-3"
          >
            {/* Tên phòng */}
            <div className="pr-3 truncate">
              <div className="font-medium text-zinc-200 truncate" title={room.name}>
                {room.name}
              </div>
              {room.hallType && (
                <span className="inline-block rounded bg-zinc-900 px-1.5 py-0.2 text-[10px] text-zinc-400 font-mono">
                  {room.hallType}
                </span>
              )}
            </div>

            {/* Trục thời gian của phòng */}
            <div
              className="relative h-8 rounded border border-zinc-800/80 bg-zinc-900/40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent 0 calc(12.5% - 1px), #27272a calc(12.5% - 1px) 12.5%)',
              }}
            >
              {room.showtimes.map((s) => {
                const startDec = toDecimalHour(s.startTime);
                const endDec = toDecimalHour(s.endTime);
                const pos = getTimelinePosition(
                  startDec,
                  endDec,
                  TIMELINE_START_HOUR,
                  TIMELINE_TOTAL_HOURS
                );

                if (!pos.isVisible) return null;

                const isSelected = s.id === selectedId;
                const isCancelled = s.status === 'cancelled';

                let blockClasses =
                  'border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500';
                if (isCancelled) {
                  blockClasses =
                    'border border-dashed border-red-500 bg-red-950/20 text-red-300';
                }
                if (isSelected) {
                  blockClasses =
                    'border-2 border-primary bg-zinc-800 text-white font-medium shadow-md';
                }

                return (
                  <div
                    key={s.id}
                    onClick={() => onSelectShowtime(s)}
                    style={{ left: pos.left, width: pos.width }}
                    title={`${s.movieTitle} (${formatTime(s.startTime)} – ${formatTime(s.endTime)})`}
                    className={`absolute top-1 h-6 rounded px-2 py-0.5 text-[11px] truncate cursor-pointer transition-colors ${blockClasses}`}
                  >
                    {s.movieTitle}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShowtimeTimeline;
