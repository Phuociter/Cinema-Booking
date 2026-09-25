import React, { useEffect, useMemo, useState } from 'react';
import BlurCircle from '../components/BlurCircle';
import { useCinemas } from '../api/useCinemas';

const Theaters = () => {
    const [cinemas, setCinemas] = useState([]);
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedCinema, setSelectedCinema] = useState(null);

    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Lấy danh sách rạp
    useEffect(() => {
        const fetchCinemas = async () => {
            try {
                setLoading(true);
                setError('');

                const data = await useCinemas.getAllCinemas();

                setCinemas(data || []);
            } catch (err) {
                setError(err.message || 'Không thể tải danh sách rạp');
            } finally {
                setLoading(false);
            }
        };

        fetchCinemas();
    }, []);

    // Lấy danh sách thành phố
    const cities = useMemo(() => {
        return [
            ...new Set(
                cinemas
                    .map((cinema) => cinema.city)
                    .filter(Boolean)
            ),
        ];
    }, [cinemas]);

    // Lọc rạp theo thành phố + tìm kiếm
    const filteredCinemas = useMemo(() => {
        return cinemas.filter((cinema) => {
            const matchCity =
                !selectedCity || cinema.city === selectedCity;

            const keyword = search.toLowerCase();

            const matchSearch =
                !keyword ||
                cinema.name?.toLowerCase().includes(keyword) ||
                cinema.address?.toLowerCase().includes(keyword);

            return matchCity && matchSearch;
        });
    }, [cinemas, selectedCity, search]);

    // Gom rạp theo thành phố
    const cinemasByCity = useMemo(() => {
        return filteredCinemas.reduce((groups, cinema) => {
            const city = cinema.city || 'Khác';

            if (!groups[city]) {
                groups[city] = [];
            }

            groups[city].push(cinema);

            return groups;
        }, {});
    }, [filteredCinemas]);

    // Chọn rạp
    const handleSelectCinema = async (cinema) => {
        try {
            setError('');

            const detail = await useCinemas.getCinemaById(cinema.id);

            setSelectedCinema(detail);
        } catch (err) {
            setError(err.message || 'Không thể tải thông tin rạp');
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#09090b] px-6 py-20 text-white md:px-16 lg:px-24">
            <BlurCircle top="-80px" left="-80px" />

            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold md:text-4xl">
                        Hệ thống rạp
                    </h1>

                    <p className="mt-3 text-gray-400">
                        Tìm kiếm và lựa chọn rạp chiếu phim
                    </p>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm kiếm rạp..."
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-gray-500"
                    />
                </div>

                {/* City filter */}
                <div className="mb-10 flex flex-wrap gap-3">
                    <button
                        onClick={() => setSelectedCity('')}
                        className={`rounded-full px-5 py-2 transition ${
                            selectedCity === ''
                                ? 'bg-primary text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        Tất cả
                    </button>

                    {cities.map((city) => (
                        <button
                            key={city}
                            onClick={() => setSelectedCity(city)}
                            className={`rounded-full px-5 py-2 transition ${
                                selectedCity === city
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            {city}
                        </button>
                    ))}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="py-20 text-center text-gray-400">
                        Đang tải danh sách rạp...
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div
                        className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400"
                    >
                        {error}
                    </div>
                )}

                {/* Cinema list */}
                {!loading && !error && (
                    <div className="space-y-12">
                        {Object.entries(cinemasByCity).map(
                            ([city, cityCinemas]) => (
                                <section key={city}>
                                    <h2 className="mb-5 text-2xl font-semibold">
                                        {city}
                                    </h2>

                                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                        {cityCinemas.map((cinema) => (
                                            <button
                                                key={cinema.id}
                                                onClick={() =>
                                                    handleSelectCinema(cinema)
                                                }
                                                className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900 text-left transition hover:-translate-y-1 hover:border-gray-600"
                                            >
                                                {cinema.imageUrl ? (
                                                    <img
                                                        src={cinema.imageUrl}
                                                        alt={cinema.name}
                                                        className="h-48 w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-48 items-center justify-center bg-gray-800 text-gray-500">
                                                        No Image
                                                    </div>
                                                )}

                                                <div className="p-5">
                                                    <h3 className="text-lg font-semibold">
                                                        {cinema.name}
                                                    </h3>

                                                    <p className="mt-2 text-sm text-gray-400">
                                                        {cinema.address ||
                                                            'Chưa có địa chỉ'}
                                                    </p>

                                                    {cinema.hotline && (
                                                        <p className="mt-2 text-sm text-gray-500">
                                                            Hotline:{' '}
                                                            {cinema.hotline}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )
                        )}

                        {Object.keys(cinemasByCity).length === 0 && (
                            <div className="py-20 text-center text-gray-400">
                                Không tìm thấy rạp phù hợp.
                            </div>
                        )}
                    </div>
                )}

                {/* Cinema detail */}
                {selectedCinema && (
                    <div className="mt-12 rounded-2xl border border-gray-800 bg-gray-900 p-6">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {selectedCinema.name}
                                </h2>

                                <p className="mt-2 text-gray-400">
                                    {selectedCinema.address}
                                </p>

                                {selectedCinema.hotline && (
                                    <p className="mt-1 text-gray-500">
                                        Hotline: {selectedCinema.hotline}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => setSelectedCinema(null)}
                                className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
                            >
                                Đóng
                            </button>
                        </div>

                        <h3 className="mb-4 text-xl font-semibold">
                            Phòng chiếu
                        </h3>

                        {selectedCinema.auditoriums?.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {selectedCinema.auditoriums.map(
                                    (auditorium) => (
                                        <div
                                            key={auditorium.id}
                                            className="rounded-xl border border-gray-800 bg-gray-950 p-5"
                                        >
                                            <h4 className="font-semibold">
                                                {auditorium.name}
                                            </h4>

                                            <p className="mt-2 text-sm text-gray-400">
                                                Loại phòng:{' '}
                                                {auditorium.hallType}
                                            </p>

                                            <p className="mt-1 text-sm text-gray-500">
                                                Số hàng:{' '}
                                                {auditorium.totalRows ?? 'N/A'}
                                            </p>

                                            <p className="text-sm text-gray-500">
                                                Số cột:{' '}
                                                {auditorium.totalColumns ??
                                                    'N/A'}
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500">
                                Rạp này chưa có thông tin phòng chiếu.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Theaters;