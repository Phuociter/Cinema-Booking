import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { AdminModal } from '../ui';
import { OrderStatusBadge } from './OrderStatusBadge';
import { formatCurrency, formatDateTime } from '../../../lib/formatters';
import { useAdminBookings } from '../../../api/useAdminBookings';

export const OrderDetailModal = ({ orderId, isOpen, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const abortControllerRef = useRef(null);

  const loadDetail = useCallback(async () => {
    if (!orderId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await useAdminBookings.getDetail(orderId, {
        signal: controller.signal,
      });
      setDetail(data);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      if (err.response?.status === 404) {
        setErrorMessage('Không tìm thấy đơn');
      } else {
        setErrorMessage(err.message || 'Không thể tải thông tin chi tiết đơn hàng.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) {
      loadDetail();
    } else {
      setDetail(null);
      setErrorMessage(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, orderId, loadDetail]);

  const hasAnomaly =
    detail?.status?.toLowerCase() === 'cancelled' &&
    Array.isArray(detail?.payments) &&
    detail.payments.some((p) => p.status?.toLowerCase() === 'success');

  const modalFooter = (
    <button
      type="button"
      onClick={onClose}
      className="px-4 py-1.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors text-xs font-medium cursor-pointer"
    >
      Đóng
    </button>
  );

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi tiết đơn đặt vé: ${detail?.bookingCode || ''}`}
      maxWidth="max-w-3xl"
      footer={modalFooter}
    >
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <span className="text-xs">Đang tải chi tiết đơn hàng...</span>
        </div>
      )}

      {errorMessage && !isLoading && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <div className="flex items-center gap-2 text-rose-400 text-sm">
            <AlertCircle className="h-5 w-5" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={loadDetail}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-700 bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Thử lại
          </button>
        </div>
      )}

      {detail && !isLoading && !errorMessage && (
        <div className="space-y-5 text-xs text-zinc-300">
          {/* Banner bất thường (nếu có) */}
          {hasAnomaly && (
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs text-amber-200">Cảnh báo bất thường</p>
                <p className="text-[11px] mt-0.5">
                  Đơn đã hủy nhưng có thanh toán thành công, cần đối soát với cổng thanh toán
                </p>
              </div>
            </div>
          )}

          {/* 1. Thông tin đơn hàng */}
          <section className="bg-zinc-950/60 border border-zinc-800/80 rounded-md p-3.5 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 pb-1.5 border-b border-zinc-800/60">
              Thông tin đơn hàng
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="block text-[11px] text-zinc-500">Mã đơn</span>
                <span className="font-mono font-medium text-zinc-100">{detail.bookingCode}</span>
              </div>
              <div>
                <span className="block text-[11px] text-zinc-500">Trạng thái</span>
                <div className="mt-0.5">
                  <OrderStatusBadge status={detail.displayStatus} />
                </div>
              </div>
              <div>
                <span className="block text-[11px] text-zinc-500">Tổng tiền</span>
                <span className="font-semibold text-primary">{formatCurrency(detail.totalAmount)}</span>
              </div>
              <div>
                <span className="block text-[11px] text-zinc-500">Ngày tạo</span>
                <span className="text-zinc-200">{formatDateTime(detail.createdAt)}</span>
              </div>
              <div>
                <span className="block text-[11px] text-zinc-500">Thời hạn giữ vé</span>
                <span className="text-zinc-200">{detail.expiresAt ? formatDateTime(detail.expiresAt) : '—'}</span>
              </div>
            </div>
            {detail.status !== detail.displayStatus && (
              <p className="text-[11px] text-amber-400/90 pt-1 border-t border-zinc-800/40">
                Trạng thái trong DB: pending, quá hạn lúc {detail.expiresAt ? formatDateTime(detail.expiresAt) : '—'}
              </p>
            )}
          </section>

          {/* 2. Thông tin khách hàng */}
          <section className="bg-zinc-950/60 border border-zinc-800/80 rounded-md p-3.5 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 pb-1.5 border-b border-zinc-800/60">
              Khách hàng
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="block text-[11px] text-zinc-500">Họ và tên</span>
                <span className="text-zinc-200">{detail.customerName ?? '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] text-zinc-500">Email</span>
                <span className="text-zinc-200">{detail.customerEmail || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] text-zinc-500">Số điện thoại</span>
                <span className="text-zinc-200">{detail.customerPhone ?? '—'}</span>
              </div>
            </div>
          </section>

          {/* 3. Thông tin suất chiếu */}
          <section className="bg-zinc-950/60 border border-zinc-800/80 rounded-md p-3.5 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 pb-1.5 border-b border-zinc-800/60">
              Suất chiếu
            </h3>
            {detail.ticketCount === 0 ? (
              <p className="text-zinc-400 italic">
                Đơn không còn vé (ghế đã được nhả), không có thông tin suất chiếu
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="block text-[11px] text-zinc-500">Phim</span>
                  <span className="text-zinc-200 font-medium">{detail.movieTitle ?? '—'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zinc-500">Rạp</span>
                  <span className="text-zinc-200">{detail.cinemaName ?? '—'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zinc-500">Phòng chiếu</span>
                  <span className="text-zinc-200">{detail.auditoriumName ?? '—'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zinc-500">Giờ chiếu</span>
                  <span className="text-zinc-200">
                    {detail.showtimeStart ? formatDateTime(detail.showtimeStart) : '—'}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* 4. Danh sách vé */}
          {detail.ticketCount > 0 && Array.isArray(detail.tickets) && detail.tickets.length > 0 && (
            <section className="bg-zinc-950/60 border border-zinc-800/80 rounded-md p-3.5 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 pb-1.5 border-b border-zinc-800/60">
                Danh sách vé ({detail.tickets.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-1.5 px-2 font-medium">Ghế</th>
                      <th className="py-1.5 px-2 font-medium">Loại ghế</th>
                      <th className="py-1.5 px-2 font-medium text-right">Giá vé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {detail.tickets.map((t) => (
                      <tr key={t.id || t.seatCode}>
                        <td className="py-1.5 px-2 font-mono font-medium text-zinc-200">{t.seatCode}</td>
                        <td className="py-1.5 px-2 text-zinc-300">{t.seatTypeName}</td>
                        <td className="py-1.5 px-2 text-right font-medium text-zinc-200">{formatCurrency(t.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 5. Bắp nước (ẩn nếu rỗng) */}
          {Array.isArray(detail.snacks) && detail.snacks.length > 0 && (
            <section className="bg-zinc-950/60 border border-zinc-800/80 rounded-md p-3.5 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 pb-1.5 border-b border-zinc-800/60">
                Bắp nước / Combo ({detail.snacks.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-1.5 px-2 font-medium">Tên món</th>
                      <th className="py-1.5 px-2 font-medium text-center">Số lượng</th>
                      <th className="py-1.5 px-2 font-medium text-right">Đơn giá</th>
                      <th className="py-1.5 px-2 font-medium text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {detail.snacks.map((s, idx) => (
                      <tr key={`snack-${idx}`}>
                        <td className="py-1.5 px-2 text-zinc-200">{s.snackName}</td>
                        <td className="py-1.5 px-2 text-center text-zinc-300">{s.quantity}</td>
                        <td className="py-1.5 px-2 text-right text-zinc-300">{formatCurrency(s.unitPrice)}</td>
                        <td className="py-1.5 px-2 text-right font-medium text-zinc-200">
                          {formatCurrency(s.totalPrice ?? s.unitPrice * s.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 6. Thông tin thanh toán */}
          <section className="bg-zinc-950/60 border border-zinc-800/80 rounded-md p-3.5 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 pb-1.5 border-b border-zinc-800/60">
              Lịch sử thanh toán
            </h3>
            {!Array.isArray(detail.payments) || detail.payments.length === 0 ? (
              <p className="text-zinc-400 italic">Chưa có thông tin thanh toán</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-1.5 px-2 font-medium">Cổng / Phương thức</th>
                      <th className="py-1.5 px-2 font-medium text-right">Số tiền</th>
                      <th className="py-1.5 px-2 font-medium">Trạng thái</th>
                      <th className="py-1.5 px-2 font-medium">Mã GD</th>
                      <th className="py-1.5 px-2 font-medium">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {detail.payments.map((p, idx) => (
                      <tr key={p.id || `payment-${idx}`}>
                        <td className="py-1.5 px-2 text-zinc-200">
                          <span className="font-medium">{p.provider}</span>
                          {p.method && <span className="text-zinc-500 ml-1">({p.method})</span>}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-zinc-200">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-1.5 px-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                              p.status?.toLowerCase() === 'success'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 font-mono text-[11px] text-zinc-400">
                          {p.transactionRef ?? '—'}
                        </td>
                        <td className="py-1.5 px-2 text-[11px] text-zinc-400">
                          {p.paidAt ? formatDateTime(p.paidAt) : formatDateTime(p.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </AdminModal>
  );
};

export default OrderDetailModal;
