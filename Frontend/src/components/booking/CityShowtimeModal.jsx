import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShowtimes } from '../../api';
import { 
  X, 
  Calendar, 
  MapPin, 
  Clock, 
  Film, 
  Ticket, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Sparkles
} from 'lucide-react';

// Danh sách chuẩn 34 Tỉnh / Thành phố tại Việt Nam như ảnh mẫu
const CITIES_LIST = [
  'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Đồng Nai', 'Hải Phòng',
  'Quảng Ninh', 'Bà Rịa-Vũng Tàu', 'Bình Định', 'Bình Dương', 'Đắk Lắk', 'Trà Vinh',
  'Yên Bái', 'Vĩnh Long', 'Kiên Giang', 'Hậu Giang', 'Hà Tĩnh', 'Phú Yên',
  'Đồng Tháp', 'Bạc Liêu', 'Hưng Yên', 'Khánh Hòa', 'Kon Tum', 'Lạng Sơn',
  'Nghệ An', 'Phú Thọ', 'Quảng Ngãi', 'Sóc Trăng', 'Sơn La', 'Tây Ninh',
  'Thái Nguyên', 'Tiền Giang', 'Thừa Thiên Huế', 'Lâm Đồng'
];

// Hàm so khớp linh hoạt tên tỉnh thành giữa Database và UI
const matchesCity = (cinemaCity, selectedCity) => {
  if (!cinemaCity || !selectedCity) return false;
  const c = cinemaCity.toLowerCase().trim();
  const s = selectedCity.toLowerCase().trim();
  if (c === s) return true;
  if (s === 'hồ chí minh' && (c.includes('hồ chí minh') || c.includes('hcm') || c.includes('sài gòn'))) return true;
  if (s === 'hà nội' && c.includes('hà nội')) return true;
  if (s === 'đà nẵng' && c.includes('đà nẵng')) return true;
  if (s === 'cần thơ' && c.includes('cần thơ')) return true;
  if (s === 'hải phòng' && c.includes('hải phòng')) return true;
  if (s === 'đồng nai' && (c.includes('đồng nai') || c.includes('biên hòa'))) return true;
  if (s === 'bà rịa-vũng tàu' && (c.includes('vũng tàu') || c.includes('bà rịa'))) return true;
  if (s === 'khánh hòa' && (c.includes('khánh hòa') || c.includes('nha trang'))) return true;
  if (s === 'bình định' && (c.includes('bình định') || c.includes('quy nhơn'))) return true;
  if (s === 'thừa thiên huế' && (c.includes('huế') || c.includes('thừa thiên'))) return true;
  return c.includes(s) || s.includes(c);
};

// Sinh danh sách 30 ngày tính từ ngày hiện tại
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

const CityShowtimeModal = ({ isOpen, onClose, movie, initialDate }) => {
  const navigate = useNavigate();
  const all30Days = useMemo(() => generate30Days(), []);

  // 2 tầng ngày: Tầng 1 (15 ngày đầu), Tầng 2 (15 ngày tiếp theo)
  const tier1Days = useMemo(() => all30Days.slice(0, 15), [all30Days]);
  const tier2Days = useMemo(() => all30Days.slice(15, 30), [all30Days]);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCity, setSelectedCity] = useState('Hồ Chí Minh');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ref và hàm trượt ngày mượt mà
  const dateScrollRef = useRef(null);
  const scrollDates = (direction) => {
    if (dateScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      dateScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Khởi tạo ngày ban đầu khi mở modal
  useEffect(() => {
    if (isOpen) {
      if (initialDate) {
        setSelectedDate(initialDate);
      } else if (all30Days.length > 0) {
        setSelectedDate(all30Days[0].dateStr);
      }
    }
  }, [isOpen, initialDate, all30Days]);

  // Tải danh sách suất chiếu của phim theo ngày đã chọn
  useEffect(() => {
    if (!isOpen || !movie?.id || !selectedDate) return;

    const fetchShowtimes = async () => {
      try {
        setLoading(true);
        const data = await useShowtimes.getShowtimes({
          movieId: movie.id,
          date: selectedDate,
          pageSize: 100 // Lấy tối đa 100 suất chiếu để nạp đầy đủ rạp
        });

        setShowtimes(data?.items || []);
      } catch (err) {
        console.error('Lỗi khi tải lịch chiếu cho modal:', err);
        setShowtimes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchShowtimes();
  }, [isOpen, movie?.id, selectedDate]);

  // Danh sách các tỉnh thành ĐANG CÓ chi nhánh có suất chiếu của phim này
  const citiesWithShowtimes = useMemo(() => {
    return CITIES_LIST.filter((city) =>
      showtimes.some((st) => matchesCity(st.city, city))
    );
  }, [showtimes]);

  // Tự động chọn tỉnh/thành phố có chi nhánh có suất chiếu (ưu tiên HCM hoặc tỉnh đầu tiên có rạp) ngay khi bấm vào
  useEffect(() => {
    if (citiesWithShowtimes.length > 0) {
      if (citiesWithShowtimes.includes('Hồ Chí Minh')) {
        setSelectedCity('Hồ Chí Minh');
      } else if (!citiesWithShowtimes.includes(selectedCity)) {
        setSelectedCity(citiesWithShowtimes[0]);
      }
    }
  }, [citiesWithShowtimes]);

  // Lọc theo Tỉnh/Thành phố đã chọn và định dạng chiếu
  const filteredShowtimes = useMemo(() => {
    return showtimes.filter((st) => {
      const matchCity = matchesCity(st.city, selectedCity);
      const matchFormat =
        selectedFormat === 'all' ||
        (st.hallType && st.hallType.toLowerCase().includes(selectedFormat.toLowerCase())) ||
        (st.auditoriumName && st.auditoriumName.toLowerCase().includes(selectedFormat.toLowerCase()));
      return matchCity && matchFormat;
    });
  }, [showtimes, selectedCity, selectedFormat]);

  // Gom nhóm suất chiếu theo Rạp -> Loại phòng
  const groupedCinemas = useMemo(() => {
    const result = {};

    filteredShowtimes.forEach((st) => {
      const cinemaName = st.cinemaName || 'Rạp Chiếu Phim';
      if (!result[cinemaName]) {
        result[cinemaName] = {
          cinemaName,
          address: st.address || st.city || '',
          formats: {},
        };
      }

      const formatLabel = st.hallType ? `Rạp ${st.hallType}` : `Phòng ${st.auditoriumName || '2D'}`;
      if (!result[cinemaName].formats[formatLabel]) {
        result[cinemaName].formats[formatLabel] = [];
      }

      result[cinemaName].formats[formatLabel].push(st);
    });

    // Sắp xếp các suất chiếu trong từng phòng theo giờ tăng dần
    Object.values(result).forEach((cinema) => {
      Object.keys(cinema.formats).forEach((fmt) => {
        cinema.formats[fmt].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      });
    });

    return Object.values(result);
  }, [filteredShowtimes]);

  if (!isOpen || !movie) return null;

  const handleSelectShowtime = (showtimeId) => {
    onClose();
    navigate(`/booking/${showtimeId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-[1360px] bg-gradient-to-b from-[#161824] via-[#10121a] to-[#0c0d14] border border-white/20 rounded-none shadow-2xl shadow-red-950/40 max-h-[90vh] flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER CỐ ĐỊNH: Luôn nhìn thấy thông tin phim & nút X đóng modal */}
        <div className="flex-shrink-0 p-5 sm:p-6 pb-4 border-b border-white/10 bg-[#161824]/95 backdrop-blur-md relative z-10">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-none bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pr-12">
            <img
              src={movie.posterUrl || 'https://picsum.photos/300/450'}
              alt={movie.title}
              className="w-16 h-24 sm:w-20 sm:h-28 object-cover rounded-xl shadow-lg border border-white/10 flex-shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-red-600/30 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wider">
                  {movie.ageRating || 'P'}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {movie.durationMin || 90} phút
                </span>
                {movie.ratingScore && (
                  <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                    ★ {Number(movie.ratingScore).toFixed(1)}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide mb-1">
                {movie.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Chọn ngày, vị trí tỉnh thành và khung giờ phù hợp để giữ chỗ
              </p>
            </div>
          </div>
        </div>

        {/* Scoped CSS cho thanh cuộn riêng biệt của Modal, không gây side-effect ra ngoài */}
        <style>{`
          .city-showtime-modal-scroll::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .city-showtime-modal-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .city-showtime-modal-scroll::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.18);
            border-radius: 9999px;
          }
          .city-showtime-modal-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(239, 68, 68, 0.6);
          }
          .city-showtime-modal-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
          }
        `}</style>

        {/* NỘI DUNG CUỘN ÊM ÁI BÊN TRONG: Không chạm mép viền bo tròn */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 pt-4 space-y-5 scroll-smooth city-showtime-modal-scroll">
          {/* 2. Thanh Chọn Ngày: 30 ngày (2 Dòng x 15 ngày trải đều) */}
          <div className="pb-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-red-500" />
                Chọn ngày chiếu:
              </span>
            </div>

            <div className="space-y-2 w-full overflow-x-auto pb-1 city-showtime-modal-scroll">
              {/* Dòng 1: 15 ngày đầu */}
              <div 
                className="grid gap-1.5 w-full min-w-[1100px] 2xl:min-w-full"
                style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
              >
                {tier1Days.map((item) => {
                  const isActive = selectedDate === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => setSelectedDate(item.dateStr)}
                      className={`p-1.5 rounded-none transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white border-red-500 shadow-md shadow-red-600/30 font-bold'
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
                      <span className="text-base sm:text-lg font-black tracking-tight pr-0.5">
                        {item.day}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dòng 2: 15 ngày tiếp theo */}
              <div 
                className="grid gap-1.5 w-full min-w-[1100px] 2xl:min-w-full"
                style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
              >
                {tier2Days.map((item) => {
                  const isActive = selectedDate === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => setSelectedDate(item.dateStr)}
                      className={`p-1.5 rounded-none transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white border-red-500 shadow-md shadow-red-600/30 font-bold'
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
                      <span className="text-base sm:text-lg font-black tracking-tight pr-0.5">
                        {item.day}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        {/* 3. Thanh Chọn Địa Điểm: 34 Tỉnh Thành */}
        <div className="py-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-red-500" />
              Chọn Tỉnh / Thành Phố (34 Tỉnh Thành):
            </span>
          </div>

          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 city-showtime-modal-scroll">
            {CITIES_LIST.map((city) => {
              const isActive = selectedCity === city;
              const hasShowtimes = citiesWithShowtimes.includes(city);

              return (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer relative flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30 border border-red-500 font-bold scale-105 z-10'
                      : hasShowtimes
                      ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20 font-semibold'
                      : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300 border border-white/5 opacity-60'
                  }`}
                  title={hasShowtimes ? `${city} có rạp chiếu phim này` : `${city} chưa có suất chiếu`}
                >
                  {hasShowtimes && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  {city}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Bộ lọc định dạng (2D Phụ Đề, 3D, IMAX...) */}
        <div className="pt-4 pb-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-400 mr-1">Định dạng:</span>
          {['all', '2D', '3D', 'IMAX', 'GOLDCLASS'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                selectedFormat === fmt
                  ? 'bg-white/20 text-white font-semibold border border-white/30'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {fmt === 'all' ? 'Tất cả' : fmt}
            </button>
          ))}
        </div>

        {/* 5. Danh Sách Rạp & Giờ Chiếu */}
        <div className="mt-4 min-h-[160px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
              <p className="text-xs text-gray-400">Đang tìm các suất chiếu phù hợp...</p>
            </div>
          ) : groupedCinemas.length > 0 ? (
            <div className="space-y-5">
              {groupedCinemas.map((cinema) => (
                <div
                  key={cinema.cinemaName}
                  className="bg-black/40 rounded-2xl border border-white/10 p-4 sm:p-5 hover:border-red-500/30 transition-all"
                >
                  <div className="mb-3">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Film className="w-4 h-4 text-red-500" />
                      {cinema.cinemaName}
                    </h3>
                    {cinema.address && (
                      <p className="text-xs text-gray-400 mt-0.5">{cinema.address}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {Object.entries(cinema.formats).map(([formatName, items]) => (
                      <div key={formatName} className="border-t border-white/5 pt-2.5">
                        <span className="text-xs font-semibold text-gray-300 block mb-2">
                          {formatName}
                        </span>

                        <div className="flex flex-wrap gap-2.5">
                          {items.map((st) => {
                            const timeStr = new Date(st.startTime).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                            return (
                              <button
                                key={st.id}
                                onClick={() => handleSelectShowtime(st.id)}
                                className="group px-4 py-2 bg-white/5 hover:bg-red-600/90 text-gray-200 hover:text-white border border-white/15 hover:border-red-500 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-red-600/30 hover:scale-105 cursor-pointer"
                                title={`Đặt vé: ${Number(st.basePrice).toLocaleString('vi-VN')} đ`}
                              >
                                <span>{timeStr}</span>
                                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/5">
              <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-300 mb-1">
                Chưa có suất chiếu tại {selectedCity} cho ngày này
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Dady vui lòng chọn ngày khác trên thanh 30 ngày hoặc chọn các tỉnh thành lớn có nhiều cụm rạp như TP. Hồ Chí Minh, Hà Nội, Đà Nẵng.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default CityShowtimeModal;
