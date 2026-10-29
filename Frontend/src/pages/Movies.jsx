
import React, { useState, useEffect } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useSearchParams } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import {
    Search,
    Calendar,
    Star,
    Clock,
    MapPin,
    Loader2,
    SlidersHorizontal,
    X,
    ChevronDown,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import { useMovies } from '../api';

const mapMovie = (movie) => ({
    ...movie,
    _id: movie.id,
    poster_path: movie.posterUrl || movie.backdropUrl,
    backdrop_path: movie.backdropUrl || movie.posterUrl,
    release_date: movie.releaseDate,
    runtime: movie.durationMin,
    vote_average: movie.ratingScore,
    genre: movie.genres?.join(', ') || '',
    genres: movie.genres?.map((name) => ({ name })) || []
});

const normalizeCity = (city) =>
    (city || '').trim().toLocaleLowerCase('vi');

const Movies = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const searchParam = searchParams.get('search') || '';
    const cityParam = searchParams.get('city') || '';
    const cinemaIdParam = searchParams.get('cinemaId') || '';

    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [cinemasLoaded, setCinemasLoaded] = useState(false);

    const [loading, setLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [searchQuery, setSearchQuery] = useState(searchParam);
    const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
    const [selectedGenre, setSelectedGenre] = useState('all');
    const [selectedCity, setSelectedCity] = useState(cityParam);
    const [selectedCinemaId, setSelectedCinemaId] = useState(cinemaIdParam);

    const [sortBy, setSortBy] = useState('latest');
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);

    const pageSize = 12;
    const filteredMovies = movies;

    // Đồng bộ các bộ lọc từ URL khi mở trang hoặc URL thay đổi.
    useEffect(() => {
        setSearchQuery(searchParam);
        setDebouncedSearch(searchParam);
        setSelectedCity(cityParam);
        setSelectedCinemaId(cinemaIdParam);
        setCurrentPage(1);
    }, [searchParam, cityParam, cinemaIdParam]);

    // Debounce tìm kiếm 350ms
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, 350);

        return () => {
            window.clearTimeout(timer);
        };
    }, [searchQuery]);

    // Tự động về trang 1 khi từ khóa tìm kiếm (đã debounce) thay đổi
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    // Tải danh sách rạp để tạo bộ lọc tỉnh/thành và cụm rạp.
    useEffect(() => {
        let cancelled = false;

        const loadCinemas = async () => {
            try {
                const response = await useMovies.getCinemas();

                if (cancelled) return;

                const list = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.items)
                        ? response.items
                        : Array.isArray(response?.data)
                            ? response.data
                            : Array.isArray(response?.data?.items)
                                ? response.data.items
                                : [];

                setCinemas(list);
            } catch (error) {
                if (!cancelled) {
                    console.error('Lỗi khi tải danh sách rạp:', error);
                    setCinemas([]);
                }
            } finally {
                if (!cancelled) {
                    setCinemasLoaded(true);
                }
            }
        };

        void loadCinemas();

        return () => {
            cancelled = true;
        };
    }, []);

    // Nếu URL chỉ có cinemaId, tự xác định thành phố của rạp đó.
    // Chỉ xử lý sau khi đã tải xong danh sách rạp.
    useEffect(() => {
        if (!cinemasLoaded || !selectedCinemaId) return;

        const cinema = cinemas.find(
            (item) =>
                String(item.id).toLowerCase() ===
                String(selectedCinemaId).toLowerCase()
        );

        if (!cinema?.city) return;

        const cinemaCity = cinema.city.trim();

        if (
            !selectedCity ||
            normalizeCity(selectedCity) !== normalizeCity(cinemaCity)
        ) {
            setSelectedCity(cinemaCity);

            setSearchParams(
                (previous) => {
                    const next = new URLSearchParams(previous);
                    next.set('city', cinemaCity);
                    next.set('cinemaId', String(cinema.id));
                    return next;
                },
                { replace: true }
            );
        }
    }, [
        cinemasLoaded,
        cinemas,
        selectedCinemaId,
        selectedCity,
        setSearchParams
    ]);

    const cities = [
        ...new Set(
            cinemas
                .map((cinema) => cinema.city?.trim())
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b, 'vi'));

    const filteredCinemas = cinemas.filter(
        (cinema) =>
            !selectedCity ||
            normalizeCity(cinema.city) === normalizeCity(selectedCity)
    );

    // Tải danh sách phim theo các bộ lọc và phân trang.
    useEffect(() => {
        let cancelled = false;

        const loadMovies = async () => {
            setLoading(true);

            try {
                const response = await useMovies.getAllMovies({
                    status: 'now_showing',
                    search: debouncedSearch || undefined,
                    genre: selectedGenre === 'all'
                        ? undefined
                        : selectedGenre,
                    city: selectedCity || undefined,
                    cinemaId: selectedCinemaId || undefined,
                    sortBy,
                    page: currentPage,
                    pageSize
                });

                if (cancelled) return;

                const items = Array.isArray(response)
                    ? response
                    : response?.items || [];

                setMovies(items.map(mapMovie));
                setTotalItems(response?.totalItems ?? items.length);
                setTotalPages(
                    Math.max(1, response?.totalPages ?? 1)
                );
            } catch (error) {
                if (!cancelled) {
                    console.error('Lỗi khi tải danh sách phim:', error);
                    setMovies([]);
                    setTotalItems(0);
                    setTotalPages(1);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    setHasLoadedOnce(true);
                }
            }
        };

        void loadMovies();

        return () => {
            cancelled = true;
        };
    }, [
        debouncedSearch,
        selectedGenre,
        selectedCity,
        selectedCinemaId,
        sortBy,
        currentPage,
        refreshKey
    ]);

    // Tải danh sách thể loại từ API.
    useEffect(() => {
        let cancelled = false;

        const loadGenres = async () => {
            try {
                const response = await useMovies.getGenres();

                if (cancelled) return;

                const genreList = Array.isArray(response)
                    ? response
                    : response?.items || [];

                setGenres(
                    genreList
                        .map((genre) =>
                            typeof genre === 'string'
                                ? genre
                                : genre?.name
                        )
                        .filter(Boolean)
                );
            } catch (error) {
                if (!cancelled) {
                    console.error('Lỗi khi tải thể loại:', error);
                }
            }
        };

        void loadGenres();

        return () => {
            cancelled = true;
        };
    }, []);

    // Làm mới danh sách khi dữ liệu phim thay đổi qua SignalR.
    useEffect(() => {
        let cancelled = false;
        let connection = null;

        const connectSignalR = async () => {
            const apiBaseUrl = (
                import.meta.env.VITE_API_BASE_URL ||
                'http://localhost:5000/api'
            ).replace(/\/+$/, '');

            const hubUrl =
                apiBaseUrl.replace(/\/api$/i, '') + '/hubs/movies';

            const newConnection = new HubConnectionBuilder()
                .withUrl(hubUrl)
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Warning)
                .build();

            connection = newConnection;

            const refreshMovies = () => {
                if (!cancelled) {
                    setRefreshKey((value) => value + 1);
                }
            };

            newConnection.on('MovieCreated', refreshMovies);
            newConnection.on('MovieUpdated', refreshMovies);
            newConnection.on('MovieDeleted', refreshMovies);
            newConnection.onreconnected(refreshMovies);

            try {
                await newConnection.start();

                if (cancelled) {
                    await newConnection.stop();
                    return;
                }

                console.info('SignalR đã kết nối:', hubUrl);
            } catch (error) {
                if (!cancelled) {
                    console.error('Không thể kết nối SignalR:', error);
                }
            }
        };

        void connectSignalR();

        return () => {
            cancelled = true;

            if (connection) {
                void connection.stop().catch((error) => {
                    console.error('Lỗi khi đóng kết nối SignalR:', error);
                });
            }
        };
    }, []);

    const sortOptions = [
        { value: 'latest', label: 'Mới nhất' },
        { value: 'title', label: 'Tên phim A-Z' },
        { value: 'rating', label: 'Đánh giá cao' }
    ];

    // Chọn thành phố sẽ xóa rạp đã chọn trước đó.
    const handleCityChange = (city) => {
        setSelectedCity(city);
        setSelectedCinemaId('');
        setCurrentPage(1);

        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);

            if (city) {
                next.set('city', city);
            } else {
                next.delete('city');
            }

            next.delete('cinemaId');
            next.delete('page');

            return next;
        });
    };

    // Chọn rạp sẽ đồng bộ cả city và cinemaId lên URL.
    const handleCinemaChange = (cinemaId) => {
        const cinema = cinemas.find(
            (item) => String(item.id) === cinemaId
        );

        const city = cinema?.city?.trim() || selectedCity;

        setSelectedCity(city);
        setSelectedCinemaId(cinemaId);
        setCurrentPage(1);

        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);

            if (city) {
                next.set('city', city);
            } else {
                next.delete('city');
            }

            if (cinemaId) {
                next.set('cinemaId', cinemaId);
            } else {
                next.delete('cinemaId');
            }

            next.delete('page');

            return next;
        });
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setSelectedGenre('all');
        setSortBy('latest');
        setSelectedCity('');
        setSelectedCinemaId('');
        setCurrentPage(1);

        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.delete('search');
            next.delete('city');
            next.delete('cinemaId');
            next.delete('page');
            return next;
        });
    };

    if (loading && !hasLoadedOnce) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />

                            <h2 className="text-white text-xl font-semibold mb-2">
                                Đang tải danh sách phim...
                            </h2>

                            <p className="text-gray-400">
                                Vui lòng chờ trong giây lát
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-12">
            <BlurCircle top="150px" left="0px" />
            <BlurCircle bottom="50px" right="50px" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                            Phim Đang Chiếu
                        </h1>
                    </div>

                    <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
                        Khám phá những bộ phim mới nhất và hấp dẫn nhất đang được chiếu tại rạp
                    </p>

                    <div className="flex items-center justify-center gap-8 mt-8 text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>{totalItems} bộ phim</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-300">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span>Cập nhật hàng ngày</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-300">
                            <MapPin className="w-4 h-4 text-green-500" />
                            <span>
                                {selectedCity || 'Toàn quốc'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tìm kiếm và bộ lọc */}
                <div className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
                    <div className="flex flex-col lg:flex-row gap-4 mb-4">
                        <div className="relative flex-1">
                            {loading ? (
                                <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 animate-spin" />
                            ) : (
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            )}

                            <input
                                type="text"
                                placeholder="Tìm kiếm phim theo tên hoặc thể loại..."
                                value={searchQuery}
                                onChange={(event) => {
                                    setSearchQuery(event.target.value);
                                }}
                                className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all duration-300"
                            />

                            {searchQuery && (
                                <button
                                    type="button"
                                    aria-label="Xóa từ khóa tìm kiếm"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setDebouncedSearch('');
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className="lg:hidden flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors duration-300"
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                            Bộ lọc

                            <ChevronDown
                                className={showFilters ? "w-4 h-4 transition-transform duration-300 rotate-180" : "w-4 h-4 transition-transform duration-300"}
                            />
                        </button>
                    </div>

                    <div
                        className={showFilters ? "lg:flex items-center gap-4 flex flex-col lg:flex-row" : "lg:flex items-center gap-4 hidden lg:flex"}
                    >
                        {/* Tỉnh/thành phố */}
                        <div className="flex-1 min-w-0">
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Khu vực (Tỉnh/Thành phố)
                            </label>

                            <select
                                value={selectedCity}
                                onChange={(event) =>
                                    handleCityChange(event.target.value)
                                }
                                className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500"
                            >
                                <option value="" className="bg-gray-800">
                                    Tất cả tỉnh/thành
                                </option>

                                {cities.map((city) => (
                                    <option
                                        key={city}
                                        value={city}
                                        className="bg-gray-800"
                                    >
                                        {city}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Cụm rạp */}
                        <div className="flex-1 min-w-0">
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Cụm rạp
                            </label>

                            <select
                                value={selectedCinemaId}
                                onChange={(event) =>
                                    handleCinemaChange(event.target.value)
                                }
                                className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500"
                            >
                                <option value="" className="bg-gray-800">
                                    Tất cả rạp trong khu vực
                                </option>

                                {filteredCinemas.map((cinema) => (
                                    <option
                                        key={cinema.id}
                                        value={String(cinema.id)}
                                        className="bg-gray-800"
                                    >
                                        {cinema.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Thể loại */}
                        <div className="flex-1 min-w-0">
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Thể loại
                            </label>

                            <select
                                value={selectedGenre}
                                onChange={(event) => {
                                    setSelectedGenre(event.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500 transition-colors duration-300"
                            >
                                <option value="all" className="bg-gray-800">
                                    Tất cả thể loại
                                </option>

                                {genres.map((genre) => (
                                    <option
                                        key={genre}
                                        value={genre}
                                        className="bg-gray-800 capitalize"
                                    >
                                        {genre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sắp xếp */}
                        <div className="flex-1 min-w-0">
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Sắp xếp theo
                            </label>

                            <select
                                value={sortBy}
                                onChange={(event) => {
                                    setSortBy(event.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500 transition-colors duration-300"
                            >
                                {sortOptions.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                        className="bg-gray-800"
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>


                        {(searchQuery ||
                            selectedGenre !== 'all' ||
                            sortBy !== 'latest' ||
                            selectedCity ||
                            selectedCinemaId) && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors duration-300"
                            >
                                <X className="w-4 h-4" />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                </div>

                {/* Kết quả */}
                <div className="flex items-center justify-between mb-8">
                    <div className="text-white">
                        <h2 className="text-2xl font-bold mb-1">
                            {searchQuery
                                ? ('Kết quả tìm kiếm: "' + searchQuery + '"')
                                : 'Tất cả phim'}
                        </h2>

                        <p className="text-gray-400">
    Tìm thấy {totalItems} bộ phim
    {selectedCity ? " tại " + selectedCity : ""}
    {selectedCinemaId
        ? " tại " + (cinemas.find((cinema) => String(cinema.id) === String(selectedCinemaId))?.name || "rạp đã chọn")
        : ""}
    {selectedGenre !== "all" ? " trong thể loại " + selectedGenre : ""}
</p>
                    </div>
                </div>

                {/* Danh sách phim */}
                {loading && filteredMovies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
                        <h3 className="text-white text-lg font-semibold mb-1">
                            Đang tải danh sách phim...
                        </h3>
                        <p className="text-gray-400 text-sm">
                            Vui lòng chờ trong giây lát
                        </p>
                    </div>
                ) : filteredMovies.length > 0 ? (
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12 transition-opacity duration-200 ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                        {filteredMovies.map((movie) => (
                            <div key={movie._id}>
                                <MovieCard
                                    movie={movie}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-12 h-12 text-gray-600" />
                        </div>

                        <h3 className="text-white text-2xl font-bold mb-4">
                            Không tìm thấy phim nào
                        </h3>

                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            Không có phim nào phù hợp với tiêu chí tìm kiếm của bạn.
                            Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.
                        </p>

                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-300"
                        >
                            Xóa tất cả bộ lọc
                        </button>
                    </div>
                )}

                {/* Phân trang */}
                {totalPages > 1 && (
                    <nav
                        aria-label="Phân trang danh sách phim"
                        className="flex flex-wrap items-center justify-center gap-2 mb-12"
                    >
                        <button
                            type="button"
                            aria-label="Trang trước"
                            disabled={currentPage <= 1}
                            onClick={() =>
                                setCurrentPage((page) =>
                                    Math.max(1, page - 1)
                                )
                            }
                            className="p-3 rounded-lg border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {Array.from(
                            { length: totalPages },
                            (_, index) => index + 1
                        ).map((page) => (
                            <button
                                key={page}
                                type="button"
                                aria-current={
                                    page === currentPage ? 'page' : undefined
                                }
                                onClick={() => setCurrentPage(page)}
                                className={"min-w-11 px-4 py-2 rounded-lg border transition-colors " + (page === currentPage ? "bg-red-500 border-red-500 text-white" : "border-white/10 text-gray-300 hover:bg-white/10")}>
                                {page}
                            </button>
                        ))}

                        <button
                            type="button"
                            aria-label="Trang sau"
                            disabled={currentPage >= totalPages}
                            onClick={() =>
                                setCurrentPage((page) =>
                                    Math.min(totalPages, page + 1)
                                )
                            }
                            className="p-3 rounded-lg border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </nav>
                )}
            </div>
        </div>
    );
};

export default Movies;





