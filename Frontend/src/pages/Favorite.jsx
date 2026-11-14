import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import {
    Search, Grid3X3, List, Star, Loader2, X,
    SlidersHorizontal, Heart
} from 'lucide-react';
import BlurCircle from '../components/BlurCircle';

const FAVORITES_KEY = 'cinema_favorites';
const FAVORITES_EVENT = 'cinema-favorites-updated';

const getMovieId = (movie) => movie?.id ?? movie?._id;

const getGenres = (movie) => {
    if (Array.isArray(movie?.genres)) {
        return movie.genres
            .map((genre) => typeof genre === 'string' ? genre : genre?.name)
            .filter(Boolean);
    }

    if (typeof movie?.genre === 'string') {
        return movie.genre.split(',').map((genre) => genre.trim()).filter(Boolean);
    }

    return [];
};

const getRating = (movie) =>
    Number(movie?.ratingScore ?? movie?.rating ?? movie?.vote_average ?? 0) || 0;

const getReleaseDate = (movie) =>
    new Date(movie?.releaseDate ?? movie?.release_date ?? 0).getTime() || 0;

const Favorites = () => {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('all');
    const [sortBy, setSortBy] = useState('latest');
    const [viewMode, setViewMode] = useState('grid');

    useEffect(() => {
        const loadFavorites = () => {
            try {
                const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
                setFavorites(Array.isArray(stored) ? stored : []);
            } catch (error) {
                console.error('Không thể đọc danh sách yêu thích:', error);
                setFavorites([]);
            } finally {
                setLoading(false);
            }
        };

        loadFavorites();
        window.addEventListener(FAVORITES_EVENT, loadFavorites);
        window.addEventListener('storage', loadFavorites);

        return () => {
            window.removeEventListener(FAVORITES_EVENT, loadFavorites);
            window.removeEventListener('storage', loadFavorites);
        };
    }, []);

    const genres = useMemo(() => {
        const allGenres = favorites.flatMap(getGenres);
        return [...new Set(allGenres)].sort((a, b) => a.localeCompare(b, 'vi'));
    }, [favorites]);

    const filteredFavorites = useMemo(() => {
        let result = [...favorites];
        const query = searchQuery.trim().toLocaleLowerCase('vi');

        if (query) {
            result = result.filter((movie) =>
                (movie.title || '').toLocaleLowerCase('vi').includes(query)
            );
        }

        if (selectedGenre !== 'all') {
            result = result.filter((movie) =>
                getGenres(movie).includes(selectedGenre)
            );
        }

        if (sortBy === 'latest') {
            result.sort((a, b) => getReleaseDate(b) - getReleaseDate(a));
        } else if (sortBy === 'rating') {
            result.sort((a, b) => getRating(b) - getRating(a));
        } else if (sortBy === 'title') {
            result.sort((a, b) =>
                (a.title || '').localeCompare(b.title || '', 'vi')
            );
        }

        return result;
    }, [favorites, searchQuery, selectedGenre, sortBy]);

    const handleRemoveFavorite = (movieId) => {
        const updated = favorites.filter(
            (movie) => String(getMovieId(movie)) !== String(movieId)
        );

        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
            setFavorites(updated);
            window.dispatchEvent(new Event(FAVORITES_EVENT));
        } catch (error) {
            console.error('Không thể cập nhật danh sách yêu thích:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
                            <h2 className="text-white text-xl font-semibold mb-2">
                                Đang tải danh sách yêu thích...
                            </h2>
                            <p className="text-gray-400">Vui lòng chờ trong giây lát</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (favorites.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4">
                <div className="max-w-7xl mx-auto text-center py-20">
                    <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Heart className="w-12 h-12 text-red-400" />
                    </div>
                    <h2 className="text-white text-2xl font-bold mb-4">
                        Chưa có phim yêu thích
                    </h2>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        Hãy chọn biểu tượng trái tim trên poster hoặc trang chi tiết để lưu những bộ phim bạn muốn xem.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/movies')}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-300"
                    >
                        Khám phá phim
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-12">
            <BlurCircle top="100px" left="0" />
            <BlurCircle bottom="100px" right="0" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-4">
                        Danh sách phim yêu thích ({favorites.length} phim)
                    </h1>
                    <p className="text-gray-400 text-lg max-w-3xl mx-auto">
                        Quản lý danh sách phim đã lưu, lọc thể loại và tìm phim nhanh chóng.
                    </p>
                </div>

                <div className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 p-5 sm:p-6 mb-8">
                    <div className="flex items-center gap-2 text-white font-semibold mb-4">
                        <SlidersHorizontal className="w-5 h-5 text-red-400" />
                        Tìm kiếm và lọc phim
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên phim..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    aria-label="Xóa từ khóa tìm kiếm"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <select
                            value={selectedGenre}
                            onChange={(event) => setSelectedGenre(event.target.value)}
                            className="w-full py-3 px-4 bg-gray-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-red-500"
                            aria-label="Lọc theo thể loại"
                        >
                            <option value="all">Tất cả thể loại</option>
                            {genres.map((genre) => (
                                <option key={genre} value={genre}>{genre}</option>
                            ))}
                        </select>

                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value)}
                            className="w-full py-3 px-4 bg-gray-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-red-500"
                            aria-label="Sắp xếp phim yêu thích"
                        >
                            <option value="latest">Mới nhất</option>
                            <option value="rating">Đánh giá cao</option>
                            <option value="title">Tên phim A-Z</option>
                        </select>

                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-gray-400">
                                {filteredFavorites.length}/{favorites.length} phim
                            </span>
                            <div className="flex bg-white/5 rounded-lg p-1">
                                <button
                                    type="button"
                                    aria-label="Hiển thị dạng lưới"
                                    title="Dạng lưới"
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded transition-colors ${
                                        viewMode === 'grid'
                                            ? 'bg-red-500 text-white'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <Grid3X3 className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Hiển thị dạng danh sách"
                                    title="Dạng danh sách"
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded transition-colors ${
                                        viewMode === 'list'
                                            ? 'bg-red-500 text-white'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <List className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {filteredFavorites.length > 0 ? (
                    <div className={
                        viewMode === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12'
                            : 'flex flex-col gap-4 mb-12'
                    }>
                        {filteredFavorites.map((movie) => (
                            <div
                                key={getMovieId(movie)}
                                className={viewMode === 'list' ? 'w-full' : 'flex justify-center'}
                            >
                                <MovieCard
                                    movie={movie}
                                    viewMode={viewMode}
                                    onRemove={handleRemoveFavorite}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Search className="w-10 h-10 text-gray-500" />
                        </div>
                        <h3 className="text-white text-xl sm:text-2xl font-bold mb-3">
                            Không tìm thấy phim phù hợp
                        </h3>
                        <p className="text-gray-400 mb-6 max-w-md mx-auto">
                            Thử đổi từ khóa, thể loại hoặc tiêu chí sắp xếp.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedGenre('all');
                                setSortBy('latest');
                            }}
                            className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Favorites;
