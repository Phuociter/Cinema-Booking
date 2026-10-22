import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSnacks from '../../api/useSnacks';
import useShowtimes from '../../api/useShowtimes';
import useBookings from '../../api/useBookings';
import usePayments from '../../api/usePayments';
import { useAuth } from '../../auth/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader2, QrCode, ExternalLink, X, CheckCircle2, AlertTriangle, ShieldCheck, Film, MapPin, Clock, Ticket, Popcorn } from 'lucide-react';
import { useConfirm } from '../ConfirmModal';

/**
 * Component: BookingSummary.jsx
 * Chức năng: Chọn combo bắp nước, tính tổng tiền, Giữ ghế -> Tạo Đơn đặt vé -> Khởi tạo MoMo All-in-One & Polling tự động
 */
const BookingSummary = ({ showtimeId, cinemaId, selectedSeats = [], totalHoldPrice = 0, showtime = null }) => {
    const navigate = useNavigate();
    const { isAuthenticated, openLoginModal } = useAuth();
    const { confirm, ConfirmDialog } = useConfirm();

    // Local state quản lý dữ liệu và số lượng bắp nước
    const [snacks, setSnacks] = useState([]);
    const [quantities, setQuantities] = useState({});

    // State quá trình Đặt vé & Thanh toán
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentModal, setPaymentModal] = useState(null); // { bookingId, bookingCode, totalAmount, payUrl, qrCodeUrl, deeplink }
    const [pollStatus, setPollStatus] = useState('pending'); // 'pending' | 'success' | 'failed' | 'cancelled'
    const [pollMessage, setPollMessage] = useState('');

    const pollIntervalRef = useRef(null);

    // Dọn dẹp timer polling khi unmount hoặc đóng modal
    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    useEffect(() => {
        return () => stopPolling();
    }, []);

    // Gọi API lấy bắp nước khi nhận được ID rạp
    useEffect(() => {
        if (cinemaId) {
            useSnacks.getCinemaSnacks(cinemaId)
                .then(data => {
                    setSnacks(data || []);
                    setQuantities({});
                })
                .catch(error => {
                    console.error("Lỗi lấy dữ liệu bắp nước:", error);
                    setSnacks([]);
                });
        }
    }, [cinemaId]);

    // Hàm xử lý tăng/giảm số lượng bắp nước
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

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', {
            weekday: 'short',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const selectedSnacksList = snacks?.filter(s => (quantities[s.id] || 0) > 0) || [];
    const seatCodes = selectedSeats?.map(s => s.seatCode).filter(Boolean).join(', ');

    // Bắt đầu chu kỳ Polling tra cứu trạng thái thanh toán MoMo mỗi 3.5 giây
    const startPolling = (bookingId) => {
        stopPolling();
        setPollStatus('pending');
        setPollMessage('');

        pollIntervalRef.current = setInterval(async () => {
            try {
                const res = await usePayments.getPaymentStatus(bookingId);
                console.log("MoMo Polling status:", res);

                if (res.resultCode === 0 || res.paymentStatus === 'success' || res.bookingStatus === 'success') {
                    stopPolling();
                    setPollStatus('success');
                    setPollMessage('Thanh toán thành công! Đang chuyển hướng...');
                    toast.success('Thanh toán đơn đặt vé thành công!');
                    setTimeout(() => {
                        navigate(`/payment/callback?bookingId=${bookingId}&status=success`);
                    }, 1500);
                } else if (res.bookingStatus === 'cancelled' || res.paymentStatus === 'failed') {
                    stopPolling();
                    setPollStatus('failed');
                    setPollMessage(res.message || 'Đơn đặt vé đã bị hủy hoặc hết hạn.');
                    toast.error('Thanh toán thất bại hoặc đơn đã bị hủy.');
                }
            } catch (err) {
                console.warn("Lỗi khi kiểm tra trạng thái thanh toán:", err);
            }
        }, 3500);
    };

    // Xử lý toàn bộ luồng: Giữ ghế -> Đặt vé -> Tạo Payment MoMo
    const handleBooking = async () => {
        if (!isAuthenticated) {
            toast('Vui lòng đăng nhập để tiến hành đặt vé!', { icon: '🔒' });
            openLoginModal();
            return;
        }

        if (!selectedSeats || selectedSeats.length === 0) {
            toast.error('Vui lòng chọn ít nhất một ghế ngồi!');
            return;
        }

        setIsProcessing(true);

        try {
            // Bước 1: Gọi API Tạm giữ ghế (5 phút Redis)
            const seatIds = selectedSeats.map(s => s.seatId || s.id);
            toast.loading('Đang giữ ghế cho bạn...', { id: 'booking-flow' });
            const holdResult = await useShowtimes.holdSeats(showtimeId, seatIds);

            const holdToken = holdResult.holdToken;
            if (!holdToken) {
                throw new Error('Không nhận được mã giữ ghế từ máy chủ.');
            }

            // Bước 2: Tạo đơn đặt vé (Booking)
            toast.loading('Đang tạo đơn đặt vé...', { id: 'booking-flow' });
            const selectedSnacks = Object.entries(quantities)
                .filter(([_, qty]) => qty > 0)
                .map(([id, qty]) => ({ cinemaSnackId: id, quantity: qty }));

            const bookingPayload = {
                holdToken: holdToken,
                snacks: selectedSnacks
            };

            const bookingResult = await useBookings.createBooking(bookingPayload);
            const bookingId = bookingResult.bookingId;
            const bookingCode = bookingResult.bookingCode;

            // Bước 3: Tạo giao dịch thanh toán MoMo Sandbox (captureWallet QR)
            toast.loading('Đang kết nối cổng thanh toán MoMo...', { id: 'booking-flow' });
            const paymentResult = await usePayments.createPayment(bookingId);

            toast.dismiss('booking-flow');

            // Hiển thị Modal QR MoMo và khởi động Polling
            setPaymentModal({
                bookingId: bookingId,
                bookingCode: bookingCode,
                totalAmount: bookingResult.totalAmount || finalTotal,
                payUrl: paymentResult.payUrl,
                qrCodeUrl: paymentResult.qrCodeUrl,
                deeplink: paymentResult.deeplink
            });

            startPolling(bookingId);
        } catch (error) {
            toast.dismiss('booking-flow');
            console.error("Lỗi quy trình đặt vé/thanh toán:", error);
            const msg = error.response?.data?.message || error.message || 'Có lỗi xảy ra trong quá trình đặt vé.';
            toast.error(msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloseModal = async () => {
        if (pollStatus === 'pending') {
            const isConfirmed = await confirm({
                title: 'Đóng cửa sổ thanh toán?',
                message: 'Đơn đặt vé vẫn đang được giữ trong Lịch sử đặt vé.\nBạn có thể tiếp tục thanh toán hoặc hủy đơn bất cứ lúc nào.',
                confirmText: 'Đóng cửa sổ',
                cancelText: 'Tiếp tục thanh toán',
                type: 'warning'
            });
            if (!isConfirmed) return;
        }
        stopPolling();
        setPaymentModal(null);
    };

    return (
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-white/10 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <span>🍿</span> Bắp Nước & Thanh Toán
            </h2>
            <p className="text-slate-400 text-sm mb-4">
                Chọn bắp nước từ menu cụm rạp, tính tổng tiền và thanh toán trực tiếp qua MoMo QR.
            </p>

            {/* KHU VỰC HIỂN THỊ DANH SÁCH BẮP NƯỚC */}
            <div className="mb-6 space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {snacks?.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">Đang tải menu bắp nước...</p>
                ) : (
                    snacks?.map(snack => (
                        <div key={snack.id} className="flex justify-between items-center bg-slate-800/60 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <img
                                    src={snack.imageUrl || 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=150'}
                                    alt={snack.name}
                                    className="w-12 h-12 object-cover rounded-lg border border-white/10"
                                />
                                <div>
                                    <h4 className="text-sm font-semibold text-white">{snack.name}</h4>
                                    <p className="text-xs text-red-400 font-medium">{(snack.price || 0).toLocaleString('vi-VN')} đ</p>
                                </div>
                            </div>

                            {/* Nút tăng giảm số lượng */}
                            <div className="flex items-center gap-2 bg-slate-900/80 px-2 py-1 rounded-lg border border-white/10">
                                <button
                                    onClick={() => handleDecrease(snack.id)}
                                    className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors cursor-pointer disabled:opacity-40"
                                    disabled={!quantities[snack.id]}
                                >
                                    -
                                </button>
                                <span className="text-white text-sm font-semibold w-5 text-center">
                                    {quantities[snack.id] || 0}
                                </span>
                                <button
                                    onClick={() => handleIncrease(snack.id)}
                                    className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* KHU VỰC TỔNG KẾT TÀI CHÍNH */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between text-sm text-slate-300">
                    <span>Tiền vé ({selectedSeats.length} ghế):</span>
                    <span className="font-semibold text-white">{(totalHoldPrice || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-sm text-slate-300">
                    <span>Tiền bắp nước:</span>
                    <span className="font-semibold text-white">{(snacksTotal || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between items-center font-bold text-white">
                    <span className="text-base">Tổng thanh toán:</span>
                    <span className="text-xl text-red-500 font-extrabold">{(finalTotal || 0).toLocaleString('vi-VN')} đ</span>
                </div>

                {/* Nút tiến hành đặt vé */}
                <button
                    onClick={handleBooking}
                    disabled={isProcessing || selectedSeats.length === 0}
                    className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Đang khởi tạo thanh toán...</span>
                        </>
                    ) : selectedSeats.length > 0 ? (
                        <>
                            <span>Thanh Toán MoMo</span>
                            <span className="text-xs bg-black/30 px-2 py-0.5 rounded-full">QR </span>
                        </>
                    ) : (
                        'Vui Lòng Chọn Ghế Trước'
                    )}
                </button>
            </div>

            {/* MODAL THANH TOÁN MOMO + POLLING */}
            {paymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col">
                        {/* Thanh trên cùng với Logo MoMo */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#A50064] flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-pink-500/30">
                                    M
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight">Thanh Toán MoMo</h3>
                                    <p className="text-[11px] text-slate-400">Hỗ trợ Ví MoMo, Thẻ ATM Napas và Visa/Mastercard</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Thân Modal - Cuộn khi nội dung dài */}
                        <div className="overflow-y-auto pr-1 space-y-4 flex-1 custom-scrollbar">
                            {/* Card thông tin đặt chỗ chi tiết */}
                            <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4">
                                <div className="flex gap-3">
                                    {showtime?.posterUrl ? (
                                        <img
                                            src={showtime.posterUrl}
                                            alt={showtime.movieTitle}
                                            className="w-16 h-24 object-cover rounded-xl border border-white/10 shrink-0 shadow"
                                        />
                                    ) : (
                                        <div className="w-16 h-24 bg-slate-800 rounded-xl border border-white/10 shrink-0 flex items-center justify-center text-slate-600">
                                            <Film className="w-6 h-6" />
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                                        <h4 className="font-extrabold text-white text-sm sm:text-base line-clamp-1">
                                            {showtime?.movieTitle || 'Đơn đặt vé xem phim'}
                                        </h4>
                                        {showtime?.cinemaName && (
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                                <span className="truncate">{showtime.cinemaName} {showtime.auditoriumName ? `• ${showtime.auditoriumName}` : ''}</span>
                                            </div>
                                        )}
                                        {showtime?.startTime && (
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                <span>{formatDateTime(showtime.startTime)}</span>
                                            </div>
                                        )}
                                        {seatCodes && (
                                            <div className="flex items-start gap-1.5 text-slate-300">
                                                <Ticket className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                                <span className="font-semibold text-white">Ghế: <span className="text-amber-300">{seatCodes}</span></span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bắp nước đã chọn */}
                                {selectedSnacksList.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-1.5 text-xs text-slate-400">
                                        <Popcorn className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                                        <span className="truncate">
                                            {selectedSnacksList.map(s => `${s.name} (x${quantities[s.id]})`).join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Mã đặt vé & Tổng thanh toán */}
                            <div className="bg-slate-950/70 rounded-2xl p-4 border border-white/5 space-y-2">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Mã đặt vé:</span>
                                    <span className="font-mono text-white font-bold">{paymentModal.bookingCode}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                    <span className="text-sm text-slate-300">Tổng thanh toán:</span>
                                    <span className="text-xl font-black text-pink-400">
                                        {(paymentModal.totalAmount || 0).toLocaleString('vi-VN')} đ
                                    </span>
                                </div>
                            </div>

                            {/* Thông báo trạng thái thanh toán (chỉ hiển thị khi Thành công hoặc Thất bại) */}
                            {pollStatus === 'success' && (
                                <div className="flex items-center justify-center gap-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl py-2.5 px-4 text-xs text-emerald-300 font-semibold animate-in fade-in">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>{pollMessage}</span>
                                </div>
                            )}

                            {pollStatus === 'failed' && (
                                <div className="flex items-center justify-center gap-2 bg-rose-500/20 border border-rose-500/40 rounded-xl py-2.5 px-4 text-xs text-rose-300 font-semibold animate-in fade-in">
                                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                                    <span>{pollMessage}</span>
                                </div>
                            )}
                        </div>

                        {/* Nút thao tác dưới cùng */}
                        <div className="pt-4 border-t border-white/10 shrink-0 space-y-2.5 mt-2">
                            <a
                                href={paymentModal.payUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3 bg-[#A50064] hover:bg-[#8e0056] text-white font-semibold rounded-xl text-center flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-pink-600/20 text-sm"
                            >
                                <span>Chuyển tới trang thanh toán MoMo</span>
                                <ExternalLink className="w-4 h-4" />
                            </a>

                            <button
                                onClick={handleCloseModal}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-xl transition cursor-pointer"
                            >
                                Đóng cửa sổ (Hủy chờ thanh toán)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal xác nhận dạng Promise */}
            <ConfirmDialog />
        </div>
    );
};

export default BookingSummary;