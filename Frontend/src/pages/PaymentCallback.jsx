import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import usePayments from '../api/usePayments';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Home, Ticket, AlertCircle } from 'lucide-react';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get('bookingId');
  const urlResultCode = searchParams.get('resultCode');
  const urlStatus = searchParams.get('status');
  const urlMessage = searchParams.get('message');
  const orderId = searchParams.get('orderId');

  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyStatus = async () => {
      // Nếu có bookingId, gọi API tra cứu trạng thái xác thực từ Server
      if (bookingId) {
        try {
          const res = await usePayments.getPaymentStatus(bookingId);
          setPaymentInfo(res);
          if (res.paymentStatus === 'success' || res.resultCode === 0) {
            setIsSuccess(true);
          } else {
            setIsSuccess(false);
            setErrorMessage(res.message || 'Thanh toán không thành công hoặc đã bị hủy.');
          }
        } catch (err) {
          console.error('Lỗi kiểm tra trạng thái thanh toán:', err);
          // Fallback theo URL param nếu có
          if (urlStatus === 'success' || urlResultCode === '0') {
            setIsSuccess(true);
          } else {
            setIsSuccess(false);
            setErrorMessage('Không thể xác thực trạng thái thanh toán từ máy chủ.');
          }
        } finally {
          setLoading(false);
        }
      } else if (urlResultCode !== null) {
        // Callback trực tiếp từ MoMo
        if (urlResultCode === '0') {
          setIsSuccess(true);
        } else {
          setIsSuccess(false);
          setErrorMessage(urlMessage || 'Giao dịch MoMo bị hủy hoặc thanh toán không thành công.');
        }
        setLoading(false);
      } else {
        setIsSuccess(false);
        setErrorMessage('Không tìm thấy thông tin đơn hàng thanh toán.');
        setLoading(false);
      }
    };

    verifyStatus();
  }, [bookingId, urlResultCode, urlStatus, urlMessage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center pt-20 px-4">
        <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Đang Xác Nhận Giao Dịch</h2>
          <p className="text-slate-400 text-sm">
            Vui lòng chờ giây lát, hệ thống đang đồng bộ kết quả thanh toán từ MoMo ...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-28 pb-16 px-4 sm:px-6 flex items-center justify-center">
      <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl backdrop-blur-sm">
        {isSuccess ? (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-6 text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="px-3 py-1 bg-pink-500/10 border border-pink-500/30 text-pink-400 rounded-full text-xs font-semibold mb-3 inline-block">
              MoMo Gateway
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Thanh Toán Thành Công!
            </h1>
            <p className="text-slate-400 text-sm mb-6">
              Đơn hàng của bạn đã được xác nhận thanh toán. Vé điện tử đã sẵn sàng trong tài khoản của bạn.
            </p>

            {/* Thông tin đơn thanh toán */}
            <div className="bg-slate-950/70 border border-white/5 rounded-2xl p-4 text-left space-y-2.5 mb-8 text-sm">
              {paymentInfo?.amount ? (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Số tiền:</span>
                  <span className="font-extrabold text-white text-base">
                    {Number(paymentInfo.amount).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              ) : null}

              {bookingId && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Mã đơn đặt vé:</span>
                  <span className="font-mono text-slate-300 font-semibold">{bookingId.substring(0, 8)}...</span>
                </div>
              )}

              {paymentInfo?.transId && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Mã giao dịch MoMo:</span>
                  <span className="font-mono text-pink-400 font-semibold">{paymentInfo.transId}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Phương thức:</span>
                <span className="text-emerald-400 font-medium">Ví MoMo</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/my-booking"
                className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 text-sm cursor-pointer"
              >
                <Ticket className="w-4 h-4" />
                <span>Xem Vé Của Tôi</span>
              </Link>
              <Link
                to="/"
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Trang Chủ</span>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center mx-auto mb-6 text-rose-400 shadow-lg shadow-rose-500/20">
              <XCircle className="w-10 h-10" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Thanh Toán Không Thành Công
            </h1>
            <p className="text-slate-400 text-sm mb-6">
              {errorMessage || 'Giao dịch chưa hoàn tất hoặc đã bị hủy. Ghế ngồi sẽ được giải phóng để bạn có thể chọn lại.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <span>Thử Đặt Lại</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/"
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Về Trang Chủ</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
