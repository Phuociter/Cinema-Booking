import React from 'react';
// Import file MyBooking vào (Lưu ý: Bạn có thể cần sửa lại dấu ../ cho khớp với thư mục máy bạn)
import MyBooking from '../../pages/MyBooking';

/**
 * Component: BookingHistoryTab.jsx
 * Trách nhiệm: Hiển thị danh sách vé đã đặt, trạng thái thanh toán, mã đặt vé và QR code vé điện tử
 */
const BookingHistoryTab = () => {
    return (
        <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Lịch Sử Vé Đã Đặt</h2>

            {/* Thay thế khung viền nét đứt cũ bằng Component thực tế */}
            <div className="mt-4">
                <MyBooking />
            </div>
        </div>
    );
};

export default BookingHistoryTab;