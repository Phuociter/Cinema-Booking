import React, { useState, useEffect } from 'react';
import useSnacks from '../../api/useSnacks';

/**
 * Component: BookingSummary.jsx
 * Người sở hữu: Dev D
 * Trách nhiệm: Chọn combo bắp nước, tính tổng tiền, nhận holdToken từ Dev C và gọi API POST /api/bookings
 */
const BookingSummary = ({ holdToken, totalHoldPrice, cinemaId }) => {
    // Local state quản lý dữ liệu và số lượng bắp nước
    const [snacks, setSnacks] = useState([]);
    const [quantities, setQuantities] = useState({});

    // Gọi API lấy bắp nước khi nhận được ID rạp
    // Gọi API lấy bắp nước khi nhận được ID rạp
    useEffect(() => {
        if (cinemaId) {
            useSnacks.getCinemaSnacks(cinemaId).then(data => {
                // Nhận thẳng dữ liệu và gán, luôn dự phòng mảng rỗng
                setSnacks(data || []);
                setQuantities({});
            }).catch(error => {
                console.error("Lỗi lấy dữ liệu bắp nước:", error);
                setSnacks([]);
            });
        }
    }, [cinemaId]);

    // Hàm xử lý tăng/giảm
    const handleIncrease = (snackId) => {
        setQuantities(prev => ({ ...prev, [snackId]: (prev[snackId] || 0) + 1 }));
    };

    const handleDecrease = (snackId) => {
        setQuantities(prev => {
            const currentQty = prev[snackId] || 0;
            if (currentQty <= 0) return prev;
            return { ...prev, [snackId]: currentQty - 1 };
        });
    };

    // Tính toán tổng tiền
    const snacksTotal = snacks?.reduce((sum, snack) => {
        return sum + (snack.price * (quantities[snack.id] || 0));
    }, 0);

    const finalTotal = (totalHoldPrice || 0) + snacksTotal;

    const handleBooking = async () => {
        if (!holdToken) return;

        // Lọc ra các món bắp nước có số lượng > 0
        const selectedSnacks = Object.entries(quantities)
            .filter(([id, qty]) => qty > 0)
            .map(([id, qty]) => ({ snackId: id, quantity: qty }));

        const orderPayload = {
            holdToken: holdToken,
            cinemaId: cinemaId,
            snacks: selectedSnacks,
            totalAmount: finalTotal
        };

        console.log("Đang gửi API POST /api/bookings với dữ liệu:", orderPayload);
    };

    return (
        <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-3">Bắp Nước & Thanh Toán (Dev D)</h2>
            <p className="text-slate-400 text-sm mb-4">
                Chọn bắp nước từ menu cụm rạp, tính tổng tiền và bấm đặt vé tạo đơn hàng.
            </p>

            {/* KHU VỰC HIỂN THỊ DANH SÁCH BẮP NƯỚC */}
            <div className="mb-6 space-y-3 max-h-64 overflow-y-auto pr-2">
                {snacks?.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">Đang tải menu bắp nước...</p>
                ) : (
                    snacks?.map(snack => (
                        <div key={snack.id} className="flex justify-between items-center bg-slate-700/40 p-3 rounded-lg border border-slate-600/50">
                            <div className="flex items-center gap-3">
                                <img
                                    src={snack.imageUrl}
                                    alt={snack.name}
                                    className="w-12 h-12 object-cover rounded-md"
                                />
                                <div>
                                    <h4 className="text-sm font-semibold text-white">{snack.name}</h4>
                                    <p className="text-xs text-slate-300">{(snack.price || 0).toLocaleString()} đ</p>
                                </div>
                            </div>

                            {/* Nút tăng giảm số lượng */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleDecrease(snack.id)}
                                    className="w-8 h-8 flex items-center justify-center bg-slate-600 hover:bg-slate-500 text-white rounded-md transition-colors"
                                >
                                    -
                                </button>
                                <span className="text-white text-sm font-medium w-4 text-center">
                                    {quantities[snack.id] || 0}
                                </span>
                                <button
                                    onClick={() => handleIncrease(snack.id)}
                                    className="w-8 h-8 flex items-center justify-center bg-slate-600 hover:bg-slate-500 text-white rounded-md transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* KHU VỰC TỔNG KẾT TÀI CHÍNH */}
            <div className="space-y-3">
                <div className="flex justify-between text-sm text-slate-300">
                    <span>Tiền vé tạm tính:</span>
                    <span className="font-semibold text-white">{(totalHoldPrice || 0).toLocaleString()} đ</span>
                </div>
                <div className="flex justify-between text-sm text-slate-300">
                    <span>Tiền bắp nước:</span>
                    <span className="font-semibold text-white">{(snacksTotal || 0).toLocaleString()} đ</span>
                </div>
                <div className="border-t border-slate-700 pt-3 flex justify-between font-bold text-white">
                    <span>Tổng thanh toán:</span>
                    <span className="text-red-500">{(finalTotal || 0).toLocaleString()} đ</span>
                </div>

                {/* Nút đặt vé tạm giữ nguyên giao diện gốc */}
                
                <button
                    onClick={handleBooking}
                    className="w-full mt-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!holdToken}
                >
                    {holdToken ? 'Tiến Hành Đặt Vé' : 'Vui Lòng Chọn Ghế Trước'}
                </button>
            </div>
        </div>
    );
};

export default BookingSummary;