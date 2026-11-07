import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAdminBookings } from '../../../api/useAdminBookings';
import { AdminModal, EmptyState, Pagination } from '../ui';
import { OrderDetailModal } from '../orders';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { formatCurrency, formatDateTime } from '../../../lib/formatters';

const PAGE_SIZE = 15;

const UserOrdersModal = ({ user, onClose }) => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(user.bookingsCount ?? 0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadOrders = useCallback(async (signal) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await useAdminBookings.getList({
        userId: user.id,
        page,
        pageSize: PAGE_SIZE,
      }, { signal });
      setOrders(result.items ?? []);
      setTotalCount(result.totalCount ?? 0);
    } catch (error) {
      if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
        setErrorMessage(error.response?.data?.message || error.message || 'Không thể tải lịch sử đơn vé.');
      }
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, [page, user.id]);

  useEffect(() => {
    const controller = new AbortController();
    loadOrders(controller.signal);
    return () => controller.abort();
  }, [loadOrders, reloadKey]);

  const roles = (user.roles ?? []).join(', ');

  return (
    <>
      <AdminModal
        isOpen
        onClose={onClose}
        title={`Lịch sử đơn vé - ${user.fullName || user.email}`}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-4">
          <section className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-950/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="block text-[11px] text-zinc-500">Khách hàng</span>
              <span className="font-medium text-zinc-100">{user.fullName || 'Chưa cập nhật tên'}</span>
            </div>
            <div>
              <span className="block text-[11px] text-zinc-500">Email</span>
              <span className="break-all text-zinc-200">{user.email}</span>
            </div>
            <div>
              <span className="block text-[11px] text-zinc-500">Vai trò</span>
              <span className="text-zinc-200">{roles || '—'}</span>
            </div>
            <div>
              <span className="block text-[11px] text-zinc-500">Tổng đơn / Tổng chi tiêu</span>
              <span className="font-medium text-zinc-100">{user.bookingsCount ?? totalCount} đơn</span>
              <span className="ml-2 text-primary">{formatCurrency(user.totalSpent)}</span>
            </div>
          </section>

          {errorMessage ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex items-center gap-2 text-sm text-rose-400">
                <AlertCircle className="h-5 w-5" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Thử lại
              </button>
            </div>
          ) : isLoading && orders.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-400">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" /> Đang tải lịch sử đơn vé...
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              title="Khách hàng chưa có đơn vé"
              description="Các đơn đặt vé của tài khoản này sẽ được hiển thị tại đây."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-zinc-800">
              <table className="w-full min-w-[800px] text-left text-xs">
                <thead className="bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="px-3 py-3 font-medium">Mã đặt chỗ</th>
                    <th className="px-3 py-3 font-medium">Phim / Rạp</th>
                    <th className="px-3 py-3 font-medium">Suất chiếu</th>
                    <th className="px-3 py-3 text-center font-medium">Vé / Ghế</th>
                    <th className="px-3 py-3 text-right font-medium">Tổng tiền</th>
                    <th className="px-3 py-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 text-zinc-300">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedOrderId(order.id);
                        }
                      }}
                      tabIndex={0}
                      className="cursor-pointer transition-colors hover:bg-zinc-800/60 focus:bg-zinc-800/70 focus:outline-none"
                      aria-label={`Xem chi tiết đơn ${order.bookingCode}`}
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-mono font-medium text-zinc-100">{order.bookingCode}</td>
                      <td className="px-3 py-3">
                        <p className="max-w-48 truncate font-medium text-zinc-200">{order.movieTitle || '—'}</p>
                        <p className="max-w-48 truncate text-[11px] text-zinc-400">{order.cinemaName || '—'}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">{order.showtimeStart ? formatDateTime(order.showtimeStart) : '—'}</td>
                      <td className="px-3 py-3 text-center">{order.ticketCount ?? 0}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-zinc-100">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-3 py-3"><OrderStatusBadge status={order.displayStatus || order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            pageSizeOptions={[PAGE_SIZE]}
            total={totalCount}
            itemCount={orders.length}
            onPageChange={setPage}
            onPageSizeChange={() => {}}
            disabled={isLoading || Boolean(errorMessage)}
          />
        </div>
      </AdminModal>
      <OrderDetailModal
        orderId={selectedOrderId}
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
      />
    </>
  );
};

export default UserOrdersModal;
