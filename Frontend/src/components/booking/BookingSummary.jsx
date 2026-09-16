import React from 'react';

/**
 * Component: BookingSummary.jsx
 * Người sở hữu: Dev D
 * Trách nhiệm: Chọn combo bắp nước, tính tổng tiền, nhận holdToken từ Dev C và gọi API POST /api/bookings
 */
const BookingSummary = ({ holdToken, totalHoldPrice }) => {
  return (
    <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-3">Bắp Nước & Thanh Toán (Dev D)</h2>
      <p className="text-slate-400 text-sm mb-4">
        Chọn bắp nước từ menu cụm rạp, tính tổng tiền và bấm đặt vé tạo đơn hàng.
      </p>
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-slate-300">
          <span>Tiền vé tạm tính:</span>
          <span className="font-semibold text-white">{totalHoldPrice || 0} đ</span>
        </div>
        <div className="flex justify-between text-sm text-slate-300">
          <span>Tiền bắp nước:</span>
          <span className="font-semibold text-white">0 đ</span>
        </div>
        <div className="border-t border-slate-700 pt-3 flex justify-between font-bold text-white">
          <span>Tổng thanh toán:</span>
          <span className="text-red-500">{totalHoldPrice || 0} đ</span>
        </div>
        <button
          className="w-full mt-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          disabled={!holdToken}
        >
          {holdToken ? 'Tiến Hành Đặt Vé' : 'Vui Lòng Chọn Ghế Trước'}
        </button>
      </div>
    </div>
  );
};

export default BookingSummary;
