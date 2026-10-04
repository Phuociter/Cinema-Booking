import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCinemas } from '../api';
import {
  MapPin,
  Clock,
  Ticket,
  Loader2,
  Search,
  X,
  Phone,
  Film,
  Building2,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import BlurCircle from '../components/BlurCircle';

const Theaters = () => {
  const navigate = useNavigate();

  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');

  // Gọi API lấy danh sách cụm rạp
  const fetchCinemas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await useCinemas.getCinemas();
      setTheaters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách cụm rạp:', err);
      setError(err?.message || 'Không thể tải danh sách cụm rạp từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCinemas();
  }, [fetchCinemas]);

  // Trích xuất danh sách thành phố duy nhất
  const uniqueCities = useMemo(() => {
    const cities = theaters
      .map((t) => t.city?.trim())
      .filter((city) => Boolean(city));
    return ['all', ...Array.from(new Set(cities))];
  }, [theaters]);

  // Lọc theo search query và thành phố
  const filteredTheaters = useMemo(() => {
    return theaters.filter((t) => {
      const matchCity =
        selectedCity === 'all' ||
        t.city?.toLowerCase() === selectedCity.toLowerCase();

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.address?.toLowerCase().includes(q) ||
        t.city?.toLowerCase().includes(q);

      return matchCity && matchSearch;
    });
  }, [theaters, selectedCity, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24 pb-16 px-4 sm:px-6 relative overflow-hidden">
      <BlurCircle top="120px" left="-40px" />
      <BlurCircle bottom="100px" right="-40px" />

      <div className="relative max-w-7xl mx-auto z-10">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-xs font-semibold text-red-400 mb-4">
            <Building2 className="w-3.5 h-3.5" /> Hệ Thống Cụm Rạp Hiện Đại
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Hệ Thống Rạp Chiếu Phim
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-3">
            Trải nghiệm điện ảnh đỉnh cao với màn hình chuẩn quốc tế, âm thanh vòm sống động và ghế ngồi công thái học tại các cụm rạp trên toàn quốc.
          </p>

          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-red-500" />
              <span>{theaters.length} cụm rạp toàn quốc</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Chuẩn IMAX, 3D & 2D</span>
            </div>
          </div>
        </div>

        {/* Thanh tìm kiếm & Bộ lọc Thành phố */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 sm:p-5 mb-8 flex flex-col sm:flex-row gap-3 shadow-xl backdrop-blur-sm">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm rạp theo tên, địa chỉ hoặc khu vực..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-red-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Chọn thành phố */}
          <div className="sm:w-56">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              {uniqueCities.map((city) => (
                <option key={city} value={city} className="bg-slate-900 text-white">
                  {city === 'all' ? 'Tất cả thành phố' : city}
                </option>
              ))}
            </select>
          </div>

          {/* Nút tải lại */}
          <button
            onClick={fetchCinemas}
            className="p-2.5 bg-slate-950/80 hover:bg-slate-800 border border-white/10 rounded-xl text-slate-300 hover:text-white transition flex items-center justify-center shrink-0 cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Khu vực nội dung chính */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Đang tải danh sách rạp...</h3>
            <p className="text-slate-400 text-xs">Vui lòng chờ trong giây lát.</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-lg mx-auto my-12">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Không thể tải danh sách rạp</h3>
            <p className="text-red-300/80 text-sm mb-5">{error}</p>
            <button
              onClick={fetchCinemas}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-lg shadow-red-600/30"
            >
              Thử lại
            </button>
          </div>
        ) : filteredTheaters.length === 0 ? (
          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-12 text-center max-w-md mx-auto my-12 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Không tìm thấy rạp nào</h3>
            <p className="text-slate-400 text-sm mb-6">
              Không có rạp nào phù hợp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCity('all');
              }}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTheaters.map((theater) => {
              const halls = theater.auditoriums || [];
              const hallTypes = Array.from(new Set(halls.map((h) => h.hallType).filter(Boolean)));

              return (
                <div
                  key={theater.id}
                  className="bg-slate-900/80 border border-white/10 hover:border-white/20 rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between backdrop-blur-sm group"
                >
                  <div>
                    {/* Hình ảnh rạp */}
                    <div className="relative h-44 rounded-xl overflow-hidden mb-3 bg-slate-950">
                      <img
                        src={theater.imageUrl || 'https://picsum.photos/seed/cinema/800/500'}
                        alt={theater.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://picsum.photos/seed/cinema/800/500';
                        }}
                      />
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 backdrop-blur-md text-emerald-400 border border-white/10">
                        {theater.city || 'Việt Nam'}
                      </div>
                    </div>

                    {/* Thông tin rạp */}
                    <h3 className="font-bold text-white text-base mb-1.5 line-clamp-1 group-hover:text-red-400 transition-colors">
                      {theater.name}
                    </h3>

                    <p className="text-xs text-slate-400 mb-2 flex items-start gap-1.5 line-clamp-2">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{theater.address}</span>
                    </p>

                    {theater.hotline && (
                      <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Hotline: {theater.hotline}</span>
                      </p>
                    )}

                    {/* Danh sách phòng chiếu / Định dạng */}
                    <div className="bg-slate-950/60 border border-white/5 rounded-xl p-2.5 mb-4 text-xs">
                      <div className="text-slate-400 flex items-center justify-between mb-1">
                        <span>Số phòng chiếu:</span>
                        <span className="font-bold text-white">{halls.length} phòng</span>
                      </div>
                      {hallTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {hallTypes.map((type) => (
                            <span
                              key={type}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <button
                    onClick={() => navigate('/movies')}
                    className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold text-xs shadow-md shadow-red-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" /> Xem Phim & Suất Chiếu
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Theaters;