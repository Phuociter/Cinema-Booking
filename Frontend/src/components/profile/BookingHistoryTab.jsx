import React from 'react';

/**
 * Component: BookingHistoryTab.jsx
 * Người sở hữu: Dev D
 * Trách nhiệm: Hiển thị danh sách vé đã đặt, trạng thái thanh toán, mã đặt vé và QR code vé điện tử
 */
const BookingHistoryTab = () => {
  return (
    <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4">Lịch Sử Vé Đã Đặt (Dev D)</h2>
      <div className="border border-dashed border-slate-600 rounded-lg p-8 text-center text-slate-400">
        Danh sách vé điện tử đã đặt của người dùng (gọi API GET /api/bookings/my-bookings)
      </div>
    </div>
  );
};

export default BookingHistoryTab;
