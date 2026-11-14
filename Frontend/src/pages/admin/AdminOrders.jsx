import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertCircle, ShoppingBag } from 'lucide-react';
import { PageHeader, EmptyState, Pagination, TableContainer } from '../../components/admin/ui';
import {
  OrderFilters,
  OrderStatusBadge,
  OrderDetailModal,
  useOrderList,
} from '../../components/admin/orders';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { useCinemas } from '../../api/useCinemas';
import axiosInstance from '../../api/axiosInstance';

export const AdminOrders = () => {
  const [cinemas, setCinemas] = useState([]);
  const [movies, setMovies] = useState([]);

  const {
    orders,
    totalCount,
    isLoading,
    errorMessage,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    status,
    setStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    cinemaId,
    setCinemaId,
    movieId,
    setMovieId,
    tableContainerRef,
    loadOrders,
    handleResetFilters,
  } = useOrderList();

  useEffect(() => {
    useCinemas.getCinemas().then((res) => setCinemas(res?.data || [])).catch(() => {});
    axiosInstance.get('/movies?page=1&pageSize=100').then((res) => setMovies(res?.data?.items || [])).catch(() => {});
  }, []);

  // Modal detail state
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayedOrders = useMemo(() => {
    const selectedCinema = cinemas.find((c) => c.id === cinemaId);
    const selectedMovie = movies.find((m) => m.id === movieId);
    return orders.filter((item) => {
      if (cinemaId && selectedCinema) {
        if (item.cinemaName && !item.cinemaName.toLowerCase().includes(selectedCinema.name.toLowerCase())) {
          return false;
        }
      }
      if (movieId && selectedMovie) {
        if (item.movieTitle && !item.movieTitle.toLowerCase().includes(selectedMovie.title.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [orders, cinemaId, movieId, cinemas, movies]);

  const handleRowClick = (id) => {
    setSelectedOrderId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
  };

  return (
    <div className="px-4 py-2 sm:px-6 sm:py-3 max-w-7xl mx-auto space-y-2.5">
      {/* Header */}
      <PageHeader
        title="Đơn đặt vé"
        description="Tra cứu đơn đặt vé và trạng thái thanh toán."
        badge="Chỉ xem"
      />

      {/* Filters */}
      <OrderFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        cinemas={cinemas}
        cinemaId={cinemaId}
        onCinemaChange={setCinemaId}
        movies={movies}
        movieId={movieId}
        onMovieChange={setMovieId}
        onReset={handleResetFilters}
        disabled={isLoading}
      />

      {/* Khung Table tĩnh (Header và Pagination đứng yên, Data cuộn bên trong) */}
      <TableContainer
        className="h-[calc(100vh-195px)] min-h-[420px]"
        containerRef={tableContainerRef}
        isLoading={isLoading}
        loadingText="Đang tải dữ liệu đơn đặt vé..."
        pagination={
          <Pagination
            page={page}
            pageSize={pageSize}
            total={totalCount}
            itemCount={orders.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            disabled={isLoading}
          />
        }
      >
        {errorMessage && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-3">
            <div className="flex items-center gap-2 text-rose-400 text-sm">
              <AlertCircle className="h-5 w-5" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={loadOrders}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Thử lại
            </button>
          </div>
        )}

        {!errorMessage && !isLoading && displayedOrders.length === 0 && (
          <div className="flex items-center justify-center h-full py-12">
            <EmptyState
              icon={ShoppingBag}
              title="Không có đơn đặt vé nào"
              description="Không tìm thấy đơn đặt vé phù hợp với tiêu chí lọc."
            />
          </div>
        )}

        {(!errorMessage && (displayedOrders.length > 0 || isLoading)) && (
          <div className="w-full">
            <table className="w-full min-w-[850px] text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 shadow-sm shadow-black/50 select-none">
                <tr className="border-b border-zinc-800 bg-zinc-900 text-zinc-400 font-medium select-none">
                  <th className="bg-zinc-900 py-3 px-3 whitespace-nowrap">Mã đơn</th>
                  <th className="bg-zinc-900 py-3 px-3 whitespace-nowrap">Khách hàng</th>
                  <th className="bg-zinc-900 py-3 px-3 whitespace-nowrap">Phim / Rạp</th>
                  <th className="bg-zinc-900 py-3 px-3 whitespace-nowrap">Suất chiếu</th>
                  <th className="bg-zinc-900 py-3 px-3 text-center whitespace-nowrap">Số vé</th>
                  <th className="bg-zinc-900 py-3 px-3 text-right whitespace-nowrap">Tổng tiền</th>
                  <th className="bg-zinc-900 py-3 px-3 whitespace-nowrap">Trạng thái</th>
                  <th className="bg-zinc-900 py-3 px-3 whitespace-nowrap">Thanh toán</th>
                  <th className="bg-zinc-900 py-3 px-3 whitespace-nowrap">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {displayedOrders.map((item) => {
                  const paymentText =
                    item.paymentProvider || item.paymentStatus
                      ? `${item.paymentProvider || ''} ${item.paymentStatus || ''}`.trim()
                      : '—';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRowClick(item.id);
                        }
                      }}
                      tabIndex={0}
                      className="hover:bg-zinc-900/60 transition-colors cursor-pointer focus:bg-zinc-900/80 focus:outline-none"
                    >
                      <td className="py-2.5 px-3 font-mono font-medium text-zinc-100 whitespace-nowrap">
                        {item.bookingCode}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-zinc-200 truncate max-w-[160px]">
                          {item.customerName ?? '—'}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-[160px]">
                          {item.customerEmail}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-zinc-200 truncate max-w-[180px]">
                          {item.movieTitle ?? '—'}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-[180px]">
                          {item.cinemaName ?? '—'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-300">
                        {item.showtimeStart ? formatDateTime(item.showtimeStart) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-zinc-300">
                        {item.ticketCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-primary whitespace-nowrap">
                        {formatCurrency(item.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <OrderStatusBadge status={item.displayStatus} />
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-400">
                        {paymentText}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-400">
                        {formatDateTime(item.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TableContainer>

      {/* Detail Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default AdminOrders;
