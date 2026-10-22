import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookings, usePayments } from '../api';
import {
  Ticket,
  Clock,
  MapPin,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  QrCode,
  X,
  Copy,
  Check,
  RefreshCw,
  Film,
  Popcorn,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import BlurCircle from '../components/BlurCircle';
import { useConfirm } from '../components/ConfirmModal';

const MyBooking = () => {
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();

  // Dữ liệu từ API
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 6;

  // Bộ lọc & Tìm kiếm (Client-side cho trang hiện tại)
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'success', 'pending', 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc', 'date_asc', 'price_desc', 'price_asc'

  // Modal xem chi tiết vé & mã QR
  const [selectedBookingForModal, setSelectedBookingForModal] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Trạng thái xử lý thanh toán / hủy đơn
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);

  // Gọi API lấy danh sách booking của user
  const fetchMyBookings = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await useBookings.getMyBookings(page, pageSize);

      // Res có thể là { items, totalCount, page, pageSize } hoặc array
      const items = res?.items || (Array.isArray(res) ? res : []);
      const count = res?.totalCount || items.length;

      setBookings(items);
      setTotalCount(count);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử đặt vé:', err);
      setError(err?.message || 'Không thể tải danh sách vé. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchMyBookings(currentPage);
  }, [currentPage, fetchMyBookings]);

  // Tiếp tục thanh toán MoMo cho đơn pending
  const handlePayNow = async (booking) => {
    try {
      setPayingBookingId(booking.id);
      const res = await usePayments.createPayment(booking.id);
      if (res?.payUrl) {
        window.location.href = res.payUrl;
      } else {
        alert('Không tìm thấy đường dẫn thanh toán MoMo.');
      }
    } catch (err) {
      console.error('Lỗi khi tiếp tục thanh toán MoMo:', err);
      alert(err.response?.data?.message || err.message || 'Không thể tạo phiên thanh toán MoMo.');
    } finally {
      setPayingBookingId(null);
    }
  };

  // Hủy đơn đặt vé đang pending để nhả ghế
  const handleCancelBooking = async (booking) => {
    const seatNames = booking.tickets?.map((t) => t.seatCode).join(', ') || '';
    const isConfirmed = await confirm({
      title: 'Xác nhận hủy đơn đặt vé',
      message: `Bạn có chắc chắn muốn hủy đơn đặt vé ${booking.bookingCode || ''}${seatNames ? ` (Ghế: ${seatNames})` : ''}?\nGhế sẽ được trả lại ngay lập tức cho người khác đặt.`,
      confirmText: 'Đồng ý hủy',
      cancelText: 'Giữ lại đơn',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      setCancellingBookingId(booking.id);
      await useBookings.cancelBooking(booking.id);
      await fetchMyBookings(currentPage);
    } catch (err) {
      console.error('Lỗi khi hủy đơn đặt vé:', err);
      alert(err.response?.data?.message || err.message || 'Không thể hủy đơn đặt vé.');
    } finally {
      setCancellingBookingId(null);
    }
  };

  // Copy mã đặt vé
  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Định dạng ngày giờ
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
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

  // Lọc và sắp xếp danh sách bookings
  const filteredBookings = bookings
    .filter((b) => {
      if (filterStatus !== 'all' && b.status?.toLowerCase() !== filterStatus.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = b.movieTitle?.toLowerCase().includes(q);
        const matchCode = b.bookingCode?.toLowerCase().includes(q);
        const matchCinema = b.cinemaName?.toLowerCase().includes(q);
        const matchSeats = b.tickets?.some((t) => t.seatCode?.toLowerCase().includes(q));
        return matchTitle || matchCode || matchCinema || matchSeats;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_asc') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'date_desc') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'price_asc') return (a.totalAmount || 0) - (b.totalAmount || 0);
      if (sortBy === 'price_desc') return (b.totalAmount || 0) - (a.totalAmount || 0);
      return 0;
    });

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24 pb-16 px-4 sm:px-6 relative overflow-hidden">
      <BlurCircle top="80px" left="-50px" />
      <BlurCircle bottom="100px" right="-50px" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-red-500 font-semibold text-sm uppercase tracking-wider mb-1">
              <Ticket className="w-4 h-4" /> Tài khoản của tôi
            </div>
            <h1 className="text-3xl font-extrabold text-white">Lịch Sử Đặt Vé</h1>
            <p className="text-slate-400 text-sm mt-1">
              Xem lại danh sách vé đã đặt và mã QR điện tử để vào rạp chiếu phim
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm phim, mã vé, ghế..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">Tất cả trạng thái</option>
                <option value="success" className="bg-slate-900 text-white">Đã thanh toán</option>
                <option value="pending" className="bg-slate-900 text-white">Chờ thanh toán</option>
                <option value="cancelled" className="bg-slate-900 text-white">Đã hủy / Quá hạn</option>
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none cursor-pointer"
            >
              <option value="date_desc" className="bg-slate-900 text-white">Mới nhất</option>
              <option value="date_asc" className="bg-slate-900 text-white">Cũ nhất</option>
              <option value="price_desc" className="bg-slate-900 text-white">Giá cao nhất</option>
              <option value="price_asc" className="bg-slate-900 text-white">Giá thấp nhất</option>
            </select>

            {/* Reload button */}
            <button
              onClick={() => fetchMyBookings(currentPage)}
              className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">Đang tải lịch sử đặt vé...</h3>
            <p className="text-slate-400 text-sm">Vui lòng chờ giây lát trong khi hệ thống đồng bộ dữ liệu.</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-lg mx-auto my-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Không thể tải danh sách vé</h3>
            <p className="text-red-300/80 text-sm mb-6">{error}</p>
            <button
              onClick={() => fetchMyBookings(currentPage)}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-lg shadow-red-600/30"
            >
              Thử lại
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-12 text-center max-w-xl mx-auto my-12 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Ticket className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {searchQuery || filterStatus !== 'all' ? 'Không tìm thấy vé phù hợp' : 'Bạn chưa có đơn đặt vé nào'}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              {searchQuery || filterStatus !== 'all'
                ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc.'
                : 'Khám phá ngay các bộ phim bom tấn đang chiếu và đặt cho mình chỗ ngồi ưng ý!'}
            </p>
            {searchQuery || filterStatus !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            ) : (
              <button
                onClick={() => navigate('/movies')}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-sm font-bold transition cursor-pointer shadow-lg shadow-red-600/30"
              >
                Khám phá phim ngay
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBookings.map((b) => {
              const isPaid = b.status?.toLowerCase() === 'success';
              const isPending = b.status?.toLowerCase() === 'pending';
              const isCancelled = b.status?.toLowerCase() === 'cancelled';

              return (
                <div
                  key={b.id}
                  className="bg-slate-900/80 border border-white/10 hover:border-white/20 rounded-3xl p-5 sm:p-6 transition-all shadow-xl flex flex-col justify-between backdrop-blur-sm group"
                >
                  <div>
                    {/* Header đơn đặt vé */}
                    <div className="flex justify-between items-start gap-3 border-b border-white/10 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-400">Mã đơn:</span>
                          <span className="font-mono font-bold text-sm text-red-400 tracking-wider">
                            {b.bookingCode || b.id?.substring(0, 8)}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          Đặt lúc: {formatDateTime(b.createdAt)}
                        </span>
                      </div>

                      {/* Trạng thái đơn */}
                      <div>
                        {isPaid && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã thanh toán
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            <Clock className="w-3.5 h-3.5" /> Chờ thanh toán
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-400">
                            <XCircle className="w-3.5 h-3.5" /> Đã hủy / Hết hạn
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Thân đơn: Poster + Thông tin phim & suất chiếu */}
                    <div className="flex gap-4 mb-4">
                      {b.posterUrl ? (
                        <img
                          src={b.posterUrl}
                          alt={b.movieTitle}
                          className="w-20 h-28 sm:w-24 sm:h-36 object-cover rounded-xl border border-white/10 shrink-0 shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-28 sm:w-24 sm:h-36 bg-slate-800 rounded-xl border border-white/10 shrink-0 flex items-center justify-center text-slate-600">
                          <Film className="w-8 h-8" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-white text-base sm:text-lg line-clamp-1 group-hover:text-red-400 transition-colors">
                          {b.movieTitle || 'Vé Xem Phim'}
                        </h3>

                        <div className="space-y-1.5 mt-2 text-xs sm:text-sm text-slate-300">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span className="truncate">
                              {b.cinemaName} {b.auditoriumName ? `• ${b.auditoriumName}` : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{formatDateTime(b.showtimeStart)}</span>
                          </div>

                          <div className="flex items-start gap-1.5 text-slate-300 pt-1">
                            <Ticket className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              {b.tickets && b.tickets.length > 0 ? (
                                b.tickets.map((t) => (
                                  <span
                                    key={t.id}
                                    className="px-1.5 py-0.5 bg-white/10 border border-white/15 rounded text-xs font-semibold text-white"
                                  >
                                    {t.seatCode}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 text-xs italic">Không có ghế</span>
                              )}
                            </div>
                          </div>

                          {/* Snacks nếu có */}
                          {b.snacks && b.snacks.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                              <Popcorn className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                              <span className="truncate">
                                {b.snacks.map((s) => `${s.snackName} (x${s.quantity})`).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer đơn: Tổng tiền + Nút hành động */}
                  <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-slate-400 block">Tổng thanh toán:</span>
                      <span className="font-extrabold text-base sm:text-lg text-white">
                        {Number(b.totalAmount || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPaid && (
                        <button
                          onClick={() => setSelectedBookingForModal(b)}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-red-600/30"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Xem Vé & QR</span>
                        </button>
                      )}

                      {isPending && (
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                          <button
                            onClick={() => handleCancelBooking(b)}
                            disabled={cancellingBookingId === b.id || payingBookingId === b.id}
                            className="px-3 py-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                            title="Hủy đơn đặt vé và giải phóng ghế"
                          >
                            {cancellingBookingId === b.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                            )}
                            <span>Hủy đơn</span>
                          </button>
                          <button
                            onClick={() => handlePayNow(b)}
                            disabled={cancellingBookingId === b.id || payingBookingId === b.id}
                            className="px-3.5 py-2 bg-[#A50064] hover:bg-[#8e0056] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-pink-600/30 cursor-pointer disabled:opacity-50"
                          >
                            {payingBookingId === b.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CreditCard className="w-3.5 h-3.5" />
                            )}
                            <span>Thanh toán MoMo</span>
                          </button>
                        </div>
                      )}

                      {isCancelled && (
                        <span className="text-xs text-slate-500 italic">Đã kết thúc</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-slate-900 border border-white/10 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-xl text-sm font-bold transition cursor-pointer ${
                  currentPage === page
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-slate-900 border border-white/10 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* MODAL CHI TIẾT VÉ & MÃ QR ĐIỆN TỬ */}
      {selectedBookingForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Ticket className="w-5 h-5 text-red-500" />
                <span>Vé Điện Tử QR Code</span>
              </div>
              <button
                onClick={() => setSelectedBookingForModal(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              {/* Phim & Suất chiếu */}
              <div className="text-center">
                <h2 className="text-xl font-black text-white mb-1">
                  {selectedBookingForModal.movieTitle}
                </h2>
                <p className="text-xs text-slate-400">
                  {selectedBookingForModal.cinemaName} • {selectedBookingForModal.auditoriumName}
                </p>
                <p className="text-xs text-red-400 font-semibold mt-1">
                  Suất chiếu: {formatDateTime(selectedBookingForModal.showtimeStart)}
                </p>
              </div>

              {/* Mã đơn đặt vé có thể copy */}
              <div className="bg-slate-950 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Mã đơn đặt vé</span>
                  <span className="font-mono font-bold text-sm text-white">
                    {selectedBookingForModal.bookingCode || selectedBookingForModal.id}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(selectedBookingForModal.bookingCode || selectedBookingForModal.id)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Sao chép mã đơn"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Danh sách vé kèm mã QR */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
                  Mã QR Soát Vé Tại Cổng ({selectedBookingForModal.tickets?.length || 0} vé)
                </h4>

                {selectedBookingForModal.tickets?.map((ticket, idx) => (
                  <div
                    key={ticket.id || idx}
                    className="bg-white rounded-2xl p-4 text-slate-900 shadow-md flex flex-col items-center justify-center text-center"
                  >
                    <div className="p-2 bg-white rounded-xl shadow-inner border border-slate-200">
                      <QRCodeSVG
                        value={ticket.qrCode || `TICKET-${ticket.id || idx}`}
                        size={150}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <div className="mt-2">
                      <div className="font-black text-xl text-slate-900 tracking-wide">
                        GHẾ: {ticket.seatCode}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Loại ghế: {ticket.seatTypeName || 'Tiêu chuẩn'} • {Number(ticket.price || 0).toLocaleString('vi-VN')} đ
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 mt-1">
                        Mã vé: {ticket.qrCode || ticket.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chi tiết bắp nước nếu có */}
              {selectedBookingForModal.snacks && selectedBookingForModal.snacks.length > 0 && (
                <div className="bg-slate-950/70 border border-white/5 rounded-2xl p-4 text-xs space-y-2">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Popcorn className="w-4 h-4 text-yellow-400" />
                    <span>Bắp nước đi kèm:</span>
                  </div>
                  {selectedBookingForModal.snacks.map((s, idx) => (
                    <div key={idx} className="flex justify-between text-slate-400">
                      <span>{s.snackName} x{s.quantity}</span>
                      <span>{(s.quantity * s.unitPrice).toLocaleString('vi-VN')} đ</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Lưu ý */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-[11px] text-amber-300/90 text-center">
                Vui lòng xuất trình mã QR này trực tiếp trên điện thoại cho nhân viên soát vé tại rạp để vào phòng chiếu.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-950/60 text-center">
              <button
                onClick={() => setSelectedBookingForModal(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Đóng
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

export default MyBooking;