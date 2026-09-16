import React from 'react';

/**
 * Component: SeatMap.jsx
 * Người sở hữu: Dev C
 * Trách nhiệm: Render sơ đồ ghế động, timer 5 phút giữ ghế, gọi API POST /api/showtimes/{id}/hold-seats
 */
const SeatMap = ({ showtimeId, onSeatSelected }) => {
  return (
    <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-3">Sơ Đồ Ghế Ngồi (Dev C)</h2>
      <p className="text-slate-400 text-sm mb-4">
        Hiển thị trạng thái ghế thực tế (available / reserved) và đếm ngược giữ ghế 5 phút trên Redis.
      </p>
      <div className="h-48 flex items-center justify-center border border-dashed border-slate-600 rounded-lg text-slate-500">
        Khu vực render sơ đồ ghế phòng chiếu & màn hình chiếu
      </div>
    </div>
  );
};

export default SeatMap;
