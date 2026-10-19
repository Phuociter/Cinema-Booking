import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SeatMap from '../components/booking/SeatMap';
import BookingSummary from '../components/booking/BookingSummary';
import { useShowtimes } from '../api';
import { ArrowLeft, Film, MapPin, Calendar, Clock, Loader2 } from 'lucide-react';

const BookingPage = () => {
  const { showtimeId } = useParams();
  const navigate = useNavigate();

  const [showtime, setShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShowtime = async () => {
      try {
        setLoading(true);
        const data = await useShowtimes.getShowtimeById(showtimeId);
        setShowtime(data);
      } catch (err) {
        console.error('Lỗi lấy thông tin suất chiếu:', err);
      } finally {
        setLoading(false);
      }
    };

    if (showtimeId) fetchShowtime();
  }, [showtimeId]);

  const totalSeatPrice = selectedSeats.reduce((sum, s) => sum + (s.totalPrice || 0), 0);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>

        {/* Thông tin suất chiếu Header */}
        {loading ? (
          <div className="flex items-center justify-center p-8 bg-slate-900/60 rounded-2xl border border-white/10 mb-8">
            <Loader2 className="w-6 h-6 text-red-500 animate-spin mr-3" />
            <span className="text-slate-400">Đang tải thông tin suất chiếu...</span>
          </div>
        ) : showtime ? (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-red-500 text-sm font-semibold uppercase tracking-wider mb-1">
                <Film className="w-4 h-4" /> Suất chiếu phim
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{showtime.movieTitle}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-slate-400 text-sm">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500" /> {showtime.cinemaName} ({showtime.auditoriumName})
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" /> {formatDateTime(showtime.startTime)}
                </span>
              </div>
            </div>
            {showtime.posterUrl && (
              <img
                src={showtime.posterUrl}
                alt={showtime.movieTitle}
                className="w-16 h-24 object-cover rounded-lg border border-white/10 hidden md:block"
              />
            )}
          </div>
        ) : null}

        {/* Bố cục 2 cột: Sơ đồ ghế bên trái, Tổng kết đặt vé bên phải */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <SeatMap
              showtimeId={showtimeId}
              selectedSeats={selectedSeats}
              onSeatSelected={setSelectedSeats}
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* Box tóm tắt ghế đã chọn */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-3">Ghế Đang Chọn</h3>
              {selectedSeats.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Vui lòng nhấp vào sơ đồ ghế để chọn chỗ ngồi.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedSeats.map((seat) => (
                      <span
                        key={seat.id}
                        className="px-2.5 py-1 bg-red-500/20 border border-red-500/40 text-red-300 rounded-md text-xs font-bold"
                      >
                        {seat.seatCode} ({seat.totalPrice?.toLocaleString('vi-VN')} đ)
                      </span>
                    ))}
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between text-sm">
                    <span className="text-slate-400">Tiền vé ({selectedSeats.length} ghế):</span>
                    <span className="text-white font-bold">{totalSeatPrice.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bắp nước & Đặt vé */}
            <BookingSummary
              showtimeId={showtimeId}
              cinemaId={showtime?.cinemaId}
              selectedSeats={selectedSeats}
              totalHoldPrice={totalSeatPrice}
              showtime={showtime}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
