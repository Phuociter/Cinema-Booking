import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, 
  Clock, 
  MapPin, 
  Ticket, 
  Play, 
  Loader2, 
  Heart, 
  ChevronRight, 
  Calendar, 
  Film, 
  Users, 
  Info,
  AlertCircle
} from 'lucide-react';
import { axiosInstance } from '../api';
import BlurCircle from '../components/BlurCircle';
import MovieCard from '../components/MovieCard';
import CityShowtimeModal from '../components/booking/CityShowtimeModal';

const MovieDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Gọi API lấy thông tin chi tiết phim thật từ Backend
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchMovieData = async () => {
      try {
        const data = await axiosInstance.get(`/movies/${id}`);
        if (!isMounted) return;
        setMovie(data);

        // Kiểm tra danh sách yêu thích trong localStorage
        const favorites = JSON.parse(localStorage.getItem('yeuThichPhim')) || [];
        setIsFavorite(favorites.some((f) => f.id === data.id || f._id === data.id));

        // Nạp thêm danh sách phim gợi ý thật từ Backend
        try {
          const res = await axiosInstance.get('/movies?page=1&pageSize=5');
          const items = res?.items || res || [];
          if (isMounted) {
            setRelatedMovies(items.filter((m) => m.id !== id).slice(0, 4));
          }
        } catch {
          // Bỏ qua lỗi phụ khi tải phim gợi ý
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Lỗi khi tải chi tiết phim:', err);
        setError(err.message || 'Không thể tải thông tin phim từ máy chủ');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMovieData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Toggle lưu phim yêu thích
  const toggleFavorite = () => {
    if (!movie) return;
    const favorites = JSON.parse(localStorage.getItem('yeuThichPhim')) || [];
    let newFavorites;
    if (isFavorite) {
      newFavorites = favorites.filter((f) => f.id !== movie.id && f._id !== movie.id);
    } else {
      newFavorites = [...favorites, movie];
    }
    localStorage.setItem('yeuThichPhim', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  // Trạng thái đang tải dữ liệu
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
              <h2 className="text-white text-xl font-semibold mb-2">Đang tải chi tiết phim...</h2>
              <p className="text-gray-400">Vui lòng chờ trong giây lát</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trạng thái lỗi tải dữ liệu
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4">
        <div className="max-w-7xl mx-auto text-center py-20">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-2xl font-bold mb-4">Lỗi kết nối máy chủ</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
            >
              Thử lại
            </button>
            <button
              onClick={() => navigate('/movies')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            >
              Quay lại danh sách phim
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Trạng thái không tìm thấy phim
  if (!movie) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4">
        <div className="max-w-7xl mx-auto text-center py-20">
          <h2 className="text-white text-2xl font-bold mb-4">Không tìm thấy phim</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Chúng tôi không thể tìm thấy thông tin về bộ phim này trên hệ thống.
          </p>
          <button
            onClick={() => navigate('/movies')}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
          >
            Quay lại danh sách phim
          </button>
        </div>
      </div>
    );
  }

  const backdropSrc = movie.backdropUrl || movie.posterUrl || 'https://picsum.photos/1280/720';
  const posterSrc = movie.posterUrl || movie.backdropUrl || 'https://picsum.photos/400/600';
  const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A';
  const formattedReleaseDate = movie.releaseDate
    ? new Date(movie.releaseDate).toLocaleDateString('vi-VN')
    : 'Chưa cập nhật';
  const genreListText = Array.isArray(movie.genres) && movie.genres.length > 0
    ? movie.genres.join(', ')
    : 'Chưa phân loại';
  const directorListText = Array.isArray(movie.directors) && movie.directors.length > 0
    ? movie.directors.join(', ')
    : 'Chưa cập nhật';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-12">
      <BlurCircle top="100px" left="0" />
      <BlurCircle bottom="100px" right="0" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section: Poster, Tiêu đề, Đánh giá, Nút hành động */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="w-full lg:w-1/3 flex justify-center">
              <img
                src={posterSrc}
                alt={`Poster phim ${movie.title}`}
                className="w-full max-w-xs md:max-w-sm rounded-2xl shadow-2xl object-cover h-[450px] border border-white/10"
                loading="lazy"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
                {movie.title}
              </h1>
              {movie.originalTitle && (
                <p className="text-lg text-gray-400 italic mb-4">{movie.originalTitle}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-gray-300 mb-6">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">{movie.durationMin || 'N/A'} phút</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">
                    {movie.ratingScore ? movie.ratingScore.toFixed(1) : 'Chưa có'} điểm
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Film className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium">{genreListText}</span>
                </div>
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-sm font-bold">
                  {movie.ageRating || 'P'}
                </div>
                <div className="text-sm text-gray-400">
                  Năm {releaseYear}
                </div>
              </div>

              <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-6 line-clamp-4">
                {movie.overview || 'Chưa có mô tả chi tiết cho phim này.'}
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-full shadow-lg hover:shadow-red-600/30 transition-all duration-300 flex items-center gap-2 cursor-pointer"
                >
                  <Ticket className="w-5 h-5" /> Đặt Vé Ngay
                </button>
                {movie.trailerUrl ? (
                  <a
                    href={movie.trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full shadow-md transition-all duration-300 flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" /> Xem Trailer
                  </a>
                ) : (
                  <button
                    disabled
                    className="px-6 py-3 bg-white/5 text-gray-500 rounded-full cursor-not-allowed flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" /> Trailer chưa khả dụng
                  </button>
                )}
                <button
                  onClick={toggleFavorite}
                  className={`px-6 py-3 ${
                    isFavorite ? 'bg-amber-600 hover:bg-amber-700' : 'bg-white/10 hover:bg-white/20'
                  } text-white rounded-full shadow-md transition-all duration-300 flex items-center gap-2 cursor-pointer`}
                >
                  <Heart className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" />
                  {isFavorite ? 'Đã yêu thích' : 'Yêu thích'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Thông Tin Chi Tiết & Đạo Diễn */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 p-6 mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-red-500" /> Thông Tin Chi Tiết
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
            <div className="space-y-3">
              <p><strong>Thời lượng:</strong> {movie.durationMin || 'N/A'} phút</p>
              <p><strong>Ngày khởi chiếu:</strong> {formattedReleaseDate}</p>
              <p><strong>Đạo diễn:</strong> {directorListText}</p>
              <p><strong>Thể loại:</strong> {genreListText}</p>
            </div>
            <div className="space-y-3">
              <p><strong>Phân loại độ tuổi:</strong> {movie.ageRating || 'P - Phổ biến mọi lứa tuổi'}</p>
              <p><strong>Điểm đánh giá:</strong> {movie.ratingScore ? `${movie.ratingScore.toFixed(1)} / 5.0` : 'Chưa có đánh giá'}</p>
              <p><strong>Trạng thái:</strong> {movie.status === 'now_showing' ? 'Đang chiếu rạp' : 'Sắp khởi chiếu'}</p>
            </div>
          </div>
        </div>

        {/* Lịch Chiếu Phim (Placeholder thông báo luồng đặt vé chuẩn) */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 p-6 mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-bold text-white">Lịch Chiếu & Cụm Rạp</h2>
            </div>
          </div>
          <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <p className="text-gray-300 text-base mb-4">
              Lịch chiếu phim được phân phối động theo 34 tỉnh thành và các cụm rạp trên toàn quốc.
            </p>
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition cursor-pointer"
            >
              Chọn Rạp & Suất Chiếu Ngay
            </button>
          </div>
        </div>

        {/* Dàn Diễn Viên (Cast Section) */}
        {Array.isArray(movie.actors) && movie.actors.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-red-500" /> Dàn Diễn Viên
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {movie.actors.slice(0, 12).map((actor, index) => (
                <div key={actor.actorId || index} className="text-center group bg-white/5 p-4 rounded-xl border border-white/5">
                  <img
                    src={actor.profilePath || `https://i.pravatar.cc/300?img=${index + 10}`}
                    alt={actor.name}
                    className="w-20 h-20 object-cover rounded-full mx-auto mb-3 shadow-md border border-white/10 group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <p className="text-gray-200 text-sm font-semibold truncate">{actor.name}</p>
                  {actor.characterName && (
                    <p className="text-gray-400 text-xs truncate mt-0.5">{actor.characterName}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trailer Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Play className="w-6 h-6 text-red-500" /> Trailer Phim
          </h2>
          {movie.trailerUrl ? (
            <div className="aspect-video w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <iframe
                src={movie.trailerUrl.replace('watch?v=', 'embed/')}
                title={`Trailer phim ${movie.title}`}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center text-gray-400">
              <Film className="w-12 h-12 mx-auto mb-3 text-gray-500 opacity-60" />
              <p>Hiện chưa có video trailer chính thức cho bộ phim này.</p>
            </div>
          )}
        </div>

        {/* Phim Bạn Có Thể Thích (Gợi ý thật từ API) */}
        {relatedMovies.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Phim Đang Chiếu Khác</h2>
              <button
                onClick={() => navigate('/movies')}
                className="text-gray-300 hover:text-white transition-colors flex items-center gap-1 text-sm cursor-pointer"
              >
                Xem tất cả
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {relatedMovies.map((relatedMovie) => (
                <MovieCard key={relatedMovie.id} movie={relatedMovie} />
              ))}
            </div>
          </div>
        )}

        {/* Modal Chọn Suất Chiếu theo 34 Tỉnh Thành */}
        {movie && (
          <CityShowtimeModal
            isOpen={isBookingModalOpen}
            onClose={() => setIsBookingModalOpen(false)}
            movie={{
              id: movie.id,
              title: movie.title,
              posterUrl: posterSrc,
              durationMin: movie.durationMin || 90,
              ageRating: movie.ageRating || 'P'
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MovieDetail;