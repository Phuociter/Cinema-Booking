import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Star, Film, Ticket, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { axiosInstance } from '../api';
import timeFormat from '../lib/timeFormat';

const HeroSection = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Gọi API lấy các phim đang chiếu nổi bật từ Database
  useEffect(() => {
    const fetchHeroMovies = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get('/movies?status=now_showing&page=1&pageSize=5');
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          setMovies(items);
        }
      } catch (err) {
        console.warn('Lỗi khi tải phim cho banner từ database:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeroMovies();
  }, []);

  // Tự động chuyển phim nổi bật mỗi 7 giây nếu có nhiều phim
  useEffect(() => {
    if (movies.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [movies.length]);

  const currentMovie = movies[currentIndex] || null;

  const nextMovie = () => {
    if (movies.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }
  };

  const prevMovie = () => {
    if (movies.length > 0) {
      setCurrentIndex((prev) => (prev === 0 ? movies.length - 1 : prev - 1));
    }
  };

  // Trích xuất và định dạng dữ liệu phim từ Database
  const releaseYear = currentMovie?.releaseDate
    ? new Date(currentMovie.releaseDate).getFullYear()
    : '2025';

  const durationStr = currentMovie?.durationMin
    ? timeFormat(currentMovie.durationMin)
    : '120m';

  const genreNames = Array.isArray(currentMovie?.genres)
    ? currentMovie.genres.slice(0, 3).join(' • ')
    : (typeof currentMovie?.genres === 'string' && currentMovie.genres.trim()
      ? currentMovie.genres.split(/\s+/).slice(0, 3).join(' • ')
      : 'Phim Chiếu Rạp');

  const ratingStr = currentMovie?.ratingScore
    ? Number(currentMovie.ratingScore).toFixed(1)
    : '9.0';

  const ageRatingLabel = currentMovie?.ageRating
    ? `${currentMovie.ageRating} - Độ tuổi phù hợp`
    : 'Phù hợp mọi lứa tuổi';

  const backdropImage = currentMovie?.backdropUrl || currentMovie?.posterUrl || '/backgroundImage.png';

  if (loading && !currentMovie) {
    return (
      <div className="relative flex items-center justify-center h-screen bg-slate-950 pt-20">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 text-sm">Đang tải phim nổi bật từ hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col items-start justify-center gap-6 px-6 md:px-16 lg:px-36 bg-cover bg-center h-screen pt-20 transition-all duration-700 overflow-hidden"
      style={{
        backgroundImage: `url("${backdropImage}")`,
      }}
    >
      {/* Lớp phủ Gradient mờ đảm bảo hiển thị chữ nổi bật và tương phản cao */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />

      {/* Nội dung thông tin phim từ Database */}
      <div className="relative z-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 bg-red-600/90 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" /> Phim Chiếu Rạp Nổi Bật
          </span>
          <span className="text-amber-400 font-semibold text-xs tracking-wider">
            ⭐ {ratingStr} ĐÁNH GIÁ
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-3 leading-tight tracking-tight">
          {currentMovie?.title || 'Phim Bom Tấn'}
        </h1>

        {currentMovie?.originalTitle && currentMovie.originalTitle !== currentMovie.title && (
          <p className="text-slate-400 font-mono text-sm md:text-base -mt-1 mb-4 italic">
            {currentMovie.originalTitle}
          </p>
        )}

        <p className="text-slate-300 text-base md:text-lg mb-6 line-clamp-3 leading-relaxed max-w-2xl">
          {currentMovie?.overview || 'Khám phá câu chuyện điện ảnh đặc sắc với những tình tiết kịch tính cùng trải nghiệm rạp chiếu phim đỉnh cao.'}
        </p>

        {/* Thông số kỹ thuật phim */}
        <div className="flex flex-wrap items-center gap-3 text-slate-200 text-xs md:text-sm mb-8">
          {/* Thể loại */}
          <div className="bg-white/10 border border-white/15 px-3.5 py-1.5 rounded-full backdrop-blur font-medium">
            <span>{genreNames}</span>
          </div>

          {/* Năm phát hành */}
          <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full backdrop-blur">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>{releaseYear}</span>
          </div>

          {/* Thời lượng */}
          <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full backdrop-blur">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>{durationStr}</span>
          </div>

          {/* Độ tuổi */}
          <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full backdrop-blur">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{ageRatingLabel}</span>
          </div>
        </div>

        {/* Nút hành động liên kết trực tiếp vào luồng đặt vé thật */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => {
              if (currentMovie?.id) {
                navigate(`/movies/${currentMovie.id}`);
              } else {
                navigate('/movies');
              }
            }}
            className="flex items-center gap-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-7 py-3.5 rounded-full font-bold text-sm md:text-base transition-all duration-300 shadow-xl shadow-red-600/40 hover:scale-105 cursor-pointer"
          >
            <Ticket className="w-5 h-5" />
            <span>Đặt Vé Ngay</span>
          </button>

          <button
            onClick={() => {
              if (currentMovie?.id) {
                navigate(`/movies/${currentMovie.id}`);
              }
            }}
            className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white px-6 py-3.5 rounded-full font-semibold text-sm md:text-base border border-white/15 transition-all duration-300 backdrop-blur cursor-pointer hover:border-white/30"
          >
            <Info className="w-4 h-4" />
            <span>Xem Chi Tiết</span>
          </button>
        </div>

        {/* Thông tin cụm rạp */}
        <div className="mt-8 p-3.5 bg-slate-900/70 border border-white/10 rounded-2xl backdrop-blur max-w-xl flex items-center justify-between text-xs text-slate-300">
          <span className="text-slate-400">Đang chiếu tại tất cả cụm rạp trên toàn quốc</span>
          <span className="text-red-400 font-semibold cursor-pointer hover:underline" onClick={() => navigate('/cinemas')}>
            Xem danh sách rạp →
          </span>
        </div>
      </div>

      {/* Điều hướng chuyển phim nổi bật nếu có nhiều phim */}
      {movies.length > 1 && (
        <div className="absolute right-6 md:right-16 bottom-12 z-20 flex items-center gap-3">
          <button
            onClick={prevMovie}
            className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/15 flex items-center justify-center text-white transition cursor-pointer"
            title="Phim trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 px-2">
            {movies.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx ? 'w-6 bg-red-500' : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
                title={`Chuyển tới phim ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextMovie}
            className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/15 flex items-center justify-center text-white transition cursor-pointer"
            title="Phim tiếp theo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default HeroSection;