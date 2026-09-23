import React, { useState, useEffect, useMemo } from 'react';
import { useShowtimes } from '../api';
import { 
  Calendar, 
  Clock, 
  Ticket, 
  Loader2, 
  Search, 
  X, 
  Film, 
  MapPin, 
  Star,
  Sparkles,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import CityShowtimeModal from '../components/booking/CityShowtimeModal';

// Sinh 30 ngày liên tục tính từ ngày hiện tại
const generate30Days = () => {
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    days.push({
      dateStr,
      month,
      day,
      dayOfWeek: dayNames[d.getDay()],
      dayOfWeekVi: dayNamesVi[d.getDay()],
      isToday: i === 0,
      fullDateLabel: `${day}/${month}/${year}`
    });
  }
  return days;
};

const Releases = () => {
  const all30Days = useMemo(() => generate30Days(), []);
  const tier1Days = useMemo(() => all30Days.slice(0, 15), [all30Days]);
  const tier2Days = useMemo(() => all30Days.slice(15, 30), [all30Days]);

  const [selectedDate, setSelectedDate] = useState(() => all30Days[0]?.dateStr || '');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cache lịch chiếu theo ngày: { [dateStr]: showtimes[] }
  const [showtimesByDate, setShowtimesByDate] = useState({});

  // State quản lý Modal Đặt Vé Phim
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMovieForModal, setSelectedMovieForModal] = useState(null);

  // Phân trang 12 phim mỗi trang
  const MOVIES_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // Tự động quay về trang 1 khi đổi ngày chiếu hoặc gõ ô tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, searchQuery]);

  // Tải danh sách suất chiếu của ngày đang chọn
  useEffect(() => {
    if (!selectedDate) return;

    // Nếu đã có trong state cache thì không gọi lại API
    if (showtimesByDate[selectedDate]) {
      return;
    }

    const fetchDayShowtimes = async () => {
      try {
        setLoading(true);
        const data = await useShowtimes.getShowtimes({
          date: selectedDate,
          pageSize: 100 // Lấy tối đa 100 suất chiếu để nạp đầy đủ rạp
        });

        const items = data?.items || [];
        setShowtimesByDate((prev) => ({
          ...prev,
          [selectedDate]: items,
        }));
      } catch (err) {
        console.error('Lỗi khi tải lịch chiếu ngày ' + selectedDate, err);
        setShowtimesByDate((prev) => ({
          ...prev,
          [selectedDate]: [],
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchDayShowtimes();
  }, [selectedDate, showtimesByDate]);

  const currentShowtimes = showtimesByDate[selectedDate] || [];

  // Gom nhóm danh sách các phim duy nhất có suất chiếu trong ngày đó
  const moviesInDay = useMemo(() => {
    const movieMap = new Map();

    currentShowtimes.forEach((st) => {
      if (!movieMap.has(st.movieId)) {
        movieMap.set(st.movieId, {
          id: st.movieId,
          title: st.movieTitle,
          posterUrl: st.posterUrl,
          durationMin: 95,
          ageRating: 'P',
          ratingScore: 8.8,
          showtimes: [],
          cinemas: new Set(),
        });
      }

      const movieObj = movieMap.get(st.movieId);
      movieObj.showtimes.push(st);
      if (st.cinemaName) {
        movieObj.cinemas.add(st.cinemaName);
      }
    });

    return Array.from(movieMap.values());
  }, [currentShowtimes]);

  // Lọc theo ô tìm kiếm tên phim
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return moviesInDay;
    return moviesInDay.filter((m) =>
      m.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [moviesInDay, searchQuery]);

  // Phân trang: 12 phim trên 1 trang
  const totalPages = Math.ceil(filteredMovies.length / MOVIES_PER_PAGE);
  const paginatedMovies = useMemo(() => {
    const startIndex = (currentPage - 1) * MOVIES_PER_PAGE;
    return filteredMovies.slice(startIndex, startIndex + MOVIES_PER_PAGE);
  }, [filteredMovies, currentPage]);

  const handleOpenBookingModal = (movie) => {
    setSelectedMovieForModal(movie);
    setIsModalOpen(true);
  };

  const selectedDateObj = all30Days.find((d) => d.dateStr === selectedDate);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-20">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="100px" right="50px" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tiêu đề trang */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            Lịch Chiếu Phim Toàn Quốc
          </div>
          <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
            Lịch Chiếu Phim
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
            Chọn ngày bên dưới để xem các phim đang chiếu rạp và đặt vé nhanh chóng
          </p>
        </div>

        {/* 1. THANH CHỌN 30 NGÀY (2 TẦNG - 15 NGÀY MỖI TẦNG NHƯ ẢNH MẪU) */}
        <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-4 sm:p-6 mb-8 shadow-2xl">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-red-500" />
              Chọn ngày chiếu:
            </span>
          </div>

          <div className="space-y-2 overflow-x-auto pb-2 scrollbar-thin">
            {/* Tầng 1: 15 ngày đầu */}
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-15 gap-1.5 min-w-[700px] md:min-w-0">
              {tier1Days.map((item) => {
                const isActive = selectedDate === item.dateStr;
                return (
                  <button
                    key={item.dateStr}
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                      isActive
                        ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white border-red-500 shadow-lg shadow-red-600/30 scale-105 font-bold'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col text-left pl-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase leading-none">
                        {item.month}
                      </span>
                      <span className={`text-[11px] font-semibold leading-none mt-1 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {item.dayOfWeek}
                      </span>
                    </div>
                    <span className="text-xl sm:text-2xl font-black tracking-tight pr-1">
                      {item.day}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tầng 2: 15 ngày tiếp theo */}
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-15 gap-1.5 min-w-[700px] md:min-w-0">
              {tier2Days.map((item) => {
                const isActive = selectedDate === item.dateStr;
                return (
                  <button
                    key={item.dateStr}
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                      isActive
                        ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white border-red-500 shadow-lg shadow-red-600/30 scale-105 font-bold'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col text-left pl-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase leading-none">
                        {item.month}
                      </span>
                      <span className={`text-[11px] font-semibold leading-none mt-1 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {item.dayOfWeek}
                      </span>
                    </div>
                    <span className="text-xl sm:text-2xl font-black tracking-tight pr-1">
                      {item.day}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. THANH TÌM KIẾM PHIM VÀ THỐNG KÊ */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm phim theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 text-xs focus:outline-none focus:border-red-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* 3. DANH SÁCH CÁC PHIM CÓ CHIẾU TRONG NGÀY */}
        {loading && !showtimesByDate[selectedDate] ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-3" />
            <p className="text-gray-400 text-sm">Đang tải danh sách phim của ngày {selectedDateObj?.fullDateLabel}...</p>
          </div>
        ) : filteredMovies.length > 0 ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="group bg-gradient-to-b from-white/[0.07] to-white/[0.02] hover:from-white/[0.12] hover:to-white/[0.05] border border-white/10 hover:border-red-500/40 rounded-3xl p-4 shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative overflow-hidden rounded-2xl mb-3.5 aspect-[2/3]">
                      <img
                        src={movie.posterUrl || 'https://picsum.photos/400/600'}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold">
                          {movie.ageRating || 'P'}
                        </span>
                      </div>
                      {movie.ratingScore && (
                        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/20 text-amber-400 text-xs font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {movie.ratingScore}
                        </div>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-base sm:text-lg mb-1 line-clamp-1 group-hover:text-red-400 transition-colors" title={movie.title}>
                      {movie.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {movie.durationMin || 90} phút
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500" /> {movie.cinemas.size} cụm rạp
                      </span>
                    </div>

                  </div>

                  {/* HÀNG DƯỚI CÙNG: THU GỌN NÚT MUA VÉ VỀ GÓC PHẢI */}
                  <div className="flex items-center justify-between pt-2 mt-auto border-t border-white/5">
                    <span className="text-xs text-red-400 font-medium">
                      {movie.showtimes.length} suất chiếu
                    </span>

                    <button
                      onClick={() => handleOpenBookingModal(movie)}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-md shadow-red-600/30 border border-red-500/80 cursor-pointer uppercase tracking-wider hover:scale-105"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      Mua Vé
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* THANH PHÂN TRANG (12 PHIM / TRANG) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(prev - 1, 1));
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
                    currentPage === 1
                      ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'
                      : 'bg-white/10 border-white/10 text-gray-300 hover:bg-white/20 hover:text-white cursor-pointer'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" /> Trước
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const isActive = currentPage === page;
                    return (
                      <button
                        key={page}
                        onClick={() => {
                          setCurrentPage(page);
                          window.scrollTo({ top: 350, behavior: 'smooth' });
                        }}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                          isActive
                            ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white border-red-500 shadow-md shadow-red-600/30 scale-105'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/15 hover:text-white'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
                    currentPage === totalPages
                      ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'
                      : 'bg-white/10 border-white/10 text-gray-300 hover:bg-white/20 hover:text-white cursor-pointer'
                  }`}
                >
                  Sau <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 bg-black/20 rounded-3xl border border-white/10">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-white text-lg font-bold mb-1">
              Không có suất chiếu nào trong ngày {selectedDateObj?.fullDateLabel}
            </h3>
            <p className="text-gray-400 text-xs max-w-md mx-auto">
              Vui lòng chọn ngày khác trên thanh 30 ngày ở trên hoặc kiểm tra lại tên phim trong ô tìm kiếm.
            </p>
          </div>
        )}
      </div>

      {/* POPUP MODAL ĐẶT VÉ THEO 34 TỈNH THÀNH (DÙNG CHUNG) */}
      <CityShowtimeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        movie={selectedMovieForModal}
        initialDate={selectedDate}
      />
    </div>
  );
};

export default Releases;