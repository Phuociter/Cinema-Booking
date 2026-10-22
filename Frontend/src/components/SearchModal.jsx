import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Star, Clock, Film, Loader2, ArrowRight, Tag } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

const POPULAR_TAGS = ['Hành Động', 'Kinh Dị', 'Hài', 'Viễn Tưởng', 'Chính Kịch', 'Hoạt Hình'];

const SearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Focus ô tìm kiếm khi modal mở ra
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Đóng modal khi bấm phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search API call
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get('/movies', {
          params: {
            search: trimmed,
            page: 1,
            pageSize: 6,
          },
        });
        const items = res?.items || res?.data?.items || [];
        setResults(items);
      } catch (err) {
        console.error('Lỗi tìm kiếm phim:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Chuyển sang trang chi tiết phim
  const handleSelectMovie = (movieId) => {
    onClose();
    navigate(`/movies/${movieId}`);
  };

  // Xem tất cả kết quả ở trang /movies
  const handleViewAll = (searchKeyword = query) => {
    const trimmed = searchKeyword.trim();
    if (!trimmed) return;
    onClose();
    navigate(`/movies?search=${encodeURIComponent(trimmed)}`);
  };

  // Submit form khi nhấn Enter
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      handleViewAll();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop mờ nền */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-zinc-950/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header: Ô nhập tìm kiếm */}
        <form onSubmit={handleSubmit} className="relative flex items-center px-5 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-red-500 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm phim theo tên, diễn viên, thể loại..."
            className="w-full bg-transparent text-white placeholder-slate-400 text-base sm:text-lg focus:outline-none pr-16"
          />

          <div className="absolute right-4 flex items-center gap-2">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Xóa từ khóa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold text-slate-400 bg-white/10 border border-white/10 rounded-md">
              ESC
            </kbd>
          </div>
        </form>

        {/* Nội dung kết quả tìm kiếm */}
        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
          {/* Trạng thái đang tải */}
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <span className="text-sm">Đang tìm kiếm phim...</span>
            </div>
          )}

          {/* Khi có kết quả tìm kiếm */}
          {!loading && results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Gợi ý phim ({results.length})
                </span>
                <span className="text-xs text-red-400 font-medium">Bấm Enter để xem tất cả</span>
              </div>

              {results.map((movie) => {
                const poster = movie.posterUrl || movie.backdropUrl || 'https://picsum.photos/seed/movie/200/300';
                return (
                  <div
                    key={movie.id}
                    onClick={() => handleSelectMovie(movie.id)}
                    className="flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <img
                      src={poster}
                      alt={movie.title}
                      className="w-12 h-16 object-cover rounded-xl shrink-0 shadow-md border border-white/10"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://picsum.photos/seed/movie/200/300';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white group-hover:text-red-400 transition-colors truncate">
                        {movie.title}
                      </h4>
                      {movie.originalTitle && (
                        <p className="text-xs text-slate-400 truncate">{movie.originalTitle}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        {movie.genres?.length > 0 && (
                          <span className="truncate max-w-[180px] text-slate-300">
                            {movie.genres.join(', ')}
                          </span>
                        )}
                        {movie.durationMin && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {movie.durationMin}p
                          </span>
                        )}
                        {movie.ratingScore > 0 && (
                          <span className="flex items-center gap-1 text-amber-400 font-semibold shrink-0">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {movie.ratingScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 mr-1" />
                  </div>
                );
              })}

              {/* Nút xem toàn bộ kết quả */}
              <button
                type="button"
                onClick={() => handleViewAll()}
                className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-semibold rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 cursor-pointer"
              >
                <span>Xem tất cả kết quả cho &quot;{query}&quot;</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Khi không tìm thấy kết quả */}
          {!loading && hasSearched && results.length === 0 && (
            <div className="text-center py-10 px-4">
              <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 border border-white/10">
                <Film className="w-7 h-7 text-slate-400" />
              </div>
              <h4 className="text-base font-semibold text-white mb-1">
                Không tìm thấy phim nào phù hợp
              </h4>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Không có kết quả cho &quot;{query}&quot;. Thử tìm kiếm với tên phim khác hoặc theo thể loại gợi ý bên dưới.
              </p>
            </div>
          )}

          {/* Gợi ý từ khóa phổ biến khi chưa gõ gì */}
          {!loading && !query && (
            <div className="py-4 px-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                <Tag className="w-3.5 h-3.5 text-red-500" />
                <span>Thể loại phổ biến</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setQuery(tag);
                      handleViewAll(tag);
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-white/10 text-slate-200 transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer phím tắt */}
        <div className="px-5 py-3 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Nhập từ khóa để tìm kiếm nhanh theo thời gian thực</span>
          <span className="hidden sm:inline">Nhấn Enter để mở danh sách đầy đủ</span>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
