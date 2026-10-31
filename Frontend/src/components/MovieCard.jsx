import React, { useEffect, useState } from 'react';
import { Trash2, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import timeFormat from '../lib/timeFormat';

const FAVORITES_KEY = 'cinema_favorites';
const FAVORITES_EVENT = 'cinema-favorites-updated';

const getMovieId = (movie) => movie?.id ?? movie?._id;

const readFavorites = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch {
        return [];
    }
};

const MovieCard = ({ movie, viewMode = 'grid', onRemove }) => {
    const navigate = useNavigate();
    const movieId = getMovieId(movie);
    const [isFavorite, setIsFavorite] = useState(() =>
        readFavorites().some((item) =>
            String(getMovieId(item)) === String(movieId)
        )
    );

    useEffect(() => {
        const syncFavorite = () => {
            setIsFavorite(
                readFavorites().some((item) =>
                    String(getMovieId(item)) === String(movieId)
                )
            );
        };

        syncFavorite();
        window.addEventListener(FAVORITES_EVENT, syncFavorite);
        window.addEventListener('storage', syncFavorite);

        return () => {
            window.removeEventListener(FAVORITES_EVENT, syncFavorite);
            window.removeEventListener('storage', syncFavorite);
        };
    }, [movieId]);

    const handleCardClick = () => {
        if (movieId) {
            navigate('/movies/' + movieId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const toggleFavorite = (event) => {
        event.stopPropagation();

        if (movieId == null) return;

        const favorites = readFavorites();
        const alreadyFavorite = favorites.some(
            (item) => String(getMovieId(item)) === String(movieId)
        );

        const updated = alreadyFavorite
            ? favorites.filter(
                (item) => String(getMovieId(item)) !== String(movieId)
            )
            : [...favorites, movie];

        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
            setIsFavorite(!alreadyFavorite);
            window.dispatchEvent(new Event(FAVORITES_EVENT));
        } catch (error) {
            console.error('Không thể cập nhật danh sách yêu thích:', error);
        }
    };

    const formatReleaseDate = (date) => {
        if (!date) return 'N/A';
        const year = new Date(date).getFullYear();
        return Number.isNaN(year) ? 'N/A' : year;
    };

    const formatDuration = (minutes) => {
        if (!minutes) return 'N/A';
        return timeFormat(minutes);
    };

    const genreNames = Array.isArray(movie.genres)
        ? movie.genres.slice(0, 2)
            .map((genre) => typeof genre === 'string' ? genre : genre?.name)
            .filter(Boolean).join(' • ')
        : (typeof movie.genre === 'string' ? movie.genre : '');

    const posterSrc = movie.posterUrl || movie.poster_path ||
        movie.backdropUrl || movie.backdrop_path;
    const releaseDate = movie.releaseDate || movie.release_date;
    const durationMinutes = movie.duration || movie.durationMin || movie.runtime;

    return (
        <div className={
            `flex flex-col justify-between p-4 bg-gray-800 rounded-xl ` +
            `hover:-translate-y-2 transition-all duration-300 shadow-xl ` +
            `hover:shadow-2xl overflow-hidden group border border-gray-700/50 ` +
            (viewMode === 'list' ? 'w-full' : 'w-64')
        }>
            {/* Poster và nút yêu thích */}
            <div
                onClick={handleCardClick}
                className="relative overflow-hidden rounded-lg cursor-pointer bg-slate-900"
            >
                <img
                    src={posterSrc}
                    onError={(event) => {
                        const image = event.currentTarget;
                        image.onerror = null;
                        if (!image.src.endsWith('/backgroundImage.png')) {
                            image.src = '/backgroundImage.png';
                        }
                    }}
                    alt={`${movie.title || 'Movie'} poster`}
                    loading="lazy"
                    className="rounded-lg h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                <button
                    type="button"
                    onClick={toggleFavorite}
                    aria-label={isFavorite ? 'Bỏ yêu thích phim' : 'Thêm phim vào yêu thích'}
                    title={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                    className={`absolute top-3 right-3 z-10 p-2.5 rounded-full
                        backdrop-blur-md border border-white/20 shadow-lg
                        transition-all duration-200 hover:scale-110
                        ${isFavorite
                            ? 'bg-red-600 text-white'
                            : 'bg-black/60 text-white hover:bg-red-600'}`}
                >
                    <Heart
                        className="w-5 h-5"
                        fill={isFavorite ? 'currentColor' : 'none'}
                    />
                </button>
            </div>

            {/* Thông tin phim */}
            <div className="mt-4 flex-1">
                <h3
                    onClick={handleCardClick}
                    className="text-white font-semibold text-lg truncate cursor-pointer hover:text-red-400 transition-colors"
                    title={movie.title}
                >
                    {movie.title || 'Untitled'}
                </h3>

                {genreNames && (
                    <p className="text-gray-400 text-sm mt-1 truncate">{genreNames}</p>
                )}

                <p className="text-gray-400 text-sm mt-2">
                    Năm phát hành: {formatReleaseDate(releaseDate)}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                    Thời lượng: {formatDuration(durationMinutes)}
                </p>
            </div>

            {/* Hành động */}
            <div className="mt-4 flex items-center gap-2">
                <button
                    type="button"
                    onClick={handleCardClick}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-colors duration-200"
                >
                    Xem chi tiết
                </button>

                {onRemove && (
                    <button
                        type="button"
                        onClick={() => onRemove(movieId)}
                        className="p-2 bg-gray-700 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
                        title="Xóa phim khỏi danh sách"
                        aria-label="Xóa phim khỏi danh sách yêu thích"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default MovieCard;
