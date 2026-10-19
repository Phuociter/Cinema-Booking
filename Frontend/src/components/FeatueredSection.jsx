import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BlurCircle from './BlurCircle';
import MovieCard from './MovieCard';
import { useMovies } from '../api';

const FeatueredSection = () => {
    const navigate = useNavigate();
    const scrollRef = useRef(null);

    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        const loadMovies = async () => {
            try {
                setLoading(true);
                setError('');

                const data = await useMovies.getAllMovies({
                    status: 'now_showing',
                    page: 1,
                    pageSize: 12
                });

                if (!cancelled) {
                    const movieList = Array.isArray(data)
                        ? data
                        : data?.items ?? [];

                    setMovies(movieList);
                }
            } catch (err) {
                console.error('Lỗi khi tải phim nổi bật:', err);

                if (!cancelled) {
                    setMovies([]);
                    setError('Không thể tải danh sách phim. Vui lòng thử lại sau.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadMovies();

        return () => {
            cancelled = true;
        };
    }, []);

    const scroll = (direction) => {
        if (!scrollRef.current) return;

        const scrollAmount = 272 * 4;

        scrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    return (
        <section className="px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden">
            <div className="relative flex items-center justify-between pt-20 pb-10">
                <BlurCircle top="0" right="-80px" />

                <p className="text-gray-300 font-medium text-lg">
                    Phim đang chiếu
                </p>

                <button
                    onClick={() => navigate('/movies')}
                    className="group flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                    Xem tất cả
                    <ArrowRight className="group-hover:translate-x-1 transition-transform w-4 h-4" />
                </button>
            </div>

            {loading ? (
                <div className="py-16 text-center text-gray-300">
                    Đang tải danh sách phim...
                </div>
            ) : error ? (
                <div className="py-16 text-center text-red-400">
                    {error}
                </div>
            ) : movies.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                    Hiện chưa có phim đang chiếu.
                </div>
            ) : (
                <>
                    <div className="relative mt-8">
                        <button
                            onClick={() => scroll('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800/70 text-white p-2 rounded-full hover:bg-gray-800 transition z-10 shadow-md"
                            aria-label="Cuộn trái"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <div
                            ref={scrollRef}
                            className="flex overflow-x-auto space-x-4 snap-x snap-mandatory scroll-smooth pb-2"
                            style={{ scrollbarWidth: 'none' }}
                        >
                            {movies.map((movie) => (
                                <div
                                    key={movie.id}
                                    className="flex-shrink-0 snap-start"
                                >
                                    <MovieCard movie={movie} />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => scroll('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800/70 text-white p-2 rounded-full hover:bg-gray-800 transition z-10 shadow-md"
                            aria-label="Cuộn phải"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    <div className="flex justify-center mt-12">
                        <button
                            onClick={() => {
                                navigate('/movies');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-8 py-2 text-sm bg-red-600 hover:bg-red-700 transition-colors rounded-md font-medium text-white shadow-md hover:shadow-lg"
                        >
                            Xem thêm phim
                        </button>
                    </div>
                </>
            )}
        </section>
    );
};

export default FeatueredSection;