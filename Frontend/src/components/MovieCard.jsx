import React from 'react';
import { Star, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import timeFormat from '../lib/timeFormat';

const MovieCard = ({ movie, viewMode = 'grid', onRemove }) => {
    const navigate = useNavigate();

    const movieId = movie.id || movie._id;

    const handleCardClick = () => {
        if (movieId) {
            navigate('/movies/' + movieId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
        ? movie.genres
            .slice(0, 2)
            .map((genre) =>
                typeof genre === 'string' ? genre : genre?.name
            )
            .filter(Boolean)
            .join(' • ')
        : (typeof movie.genre === 'string' ? movie.genre : '');

    // Đọc ảnh linh hoạt: hỗ trợ cả API Backend (posterUrl, backdropUrl) và TMDB/Dummy (poster_path, backdrop_path)
    const posterSrc = movie.posterUrl || movie.poster_path || movie.backdropUrl || movie.backdrop_path;
    const releaseDate = movie.releaseDate || movie.release_date;
    const durationMinutes = movie.duration || movie.durationMin || movie.runtime;
    const ratingValue = movie.rating !== undefined && movie.rating !== null
        ? movie.rating
        : (movie.ratingScore !== undefined && movie.ratingScore !== null
            ? movie.ratingScore
            : movie.vote_average);

    return (
        <div
            className={
                `flex flex-col justify-between p-4 bg-gray-800 rounded-xl ` +
                `hover:-translate-y-2 transition-all duration-300 shadow-xl ` +
                `hover:shadow-2xl overflow-hidden group border border-gray-700/50 ` +
                (viewMode === 'list' ? 'w-full' : 'w-64')
            }
        >
            {/* Poster */}
            <div
                onClick={handleCardClick}
                className="relative overflow-hidden rounded-lg cursor-pointer bg-slate-900"
            >
                <img
                    src={posterSrc}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500';
                    }}
                    alt={`${movie.title} poster`}
                    loading="lazy"
                    className="rounded-lg h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Rating */}
                {ratingValue !== undefined && ratingValue !== null && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 px-2 py-1 rounded-md text-sm">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />

                        <span className="text-white">
                            {Number(ratingValue).toFixed(1)}
                        </span>
                    </div>
                )}
            </div>

            {/* Movie information */}
            <div className="mt-4 flex-1">
                <h3
                    onClick={handleCardClick}
                    className="text-white font-semibold text-lg truncate cursor-pointer hover:text-red-400 transition-colors"
                    title={movie.title}
                >
                    {movie.title || 'Untitled'}
                </h3>

                {/* Genres */}
                {genreNames && (
                    <p className="text-gray-400 text-sm mt-1 truncate">
                        {genreNames}
                    </p>
                )}

                {/* Release year */}
                <p className="text-gray-400 text-sm mt-2">
                    Năm phát hành: {formatReleaseDate(releaseDate)}
                </p>

                {/* Duration */}
                <p className="text-gray-400 text-sm mt-1">
                    Thời lượng: {formatDuration(durationMinutes)}
                </p>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
                <button
                    onClick={handleCardClick}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-colors duration-200"
                >
                    Xem chi tiết
                </button>

                {onRemove && (
                    <button
                        onClick={() => onRemove(movieId)}
                        className="p-2 bg-gray-700 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
                        title="Xóa phim"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default MovieCard;