
import React, { useState, useEffect, useMemo } from 'react';
import { useShowtimes } from '../../api';
import { Loader2, AlertCircle, Lock, Check } from 'lucide-react';

const SEAT_TYPE_STYLES = {
    VIP: 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30',
    Couple: 'bg-pink-500/20 text-pink-300 border-pink-500/50 hover:bg-pink-500/30',
    Standard: 'bg-slate-700/60 text-slate-200 border-slate-600/70 hover:border-slate-400',
};

const RESERVED_STYLE =
    'bg-slate-800/80 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-60';

const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(price ?? 0));

function groupSeatsByRow(seats) {
    const map = {};

    for (const seat of seats) {
        const row = seat.rowLabel || '?';
        (map[row] ??= []).push(seat);
    }

    for (const row of Object.keys(map)) {
        map[row].sort((a, b) => a.columnNumber - b.columnNumber);
    }

    return map;
}

const SeatMap = ({
    showtimeId,
    selectedSeats = [],
    onSeatSelected,
    disabled = false,
}) => {
    const [seats, setSeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function fetchSeats() {
            if (!showtimeId) {
                setSeats([]);
                setError('Không tìm thấy mã suất chiếu.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError('');

                const data = await useShowtimes.getShowtimeSeats(showtimeId);

                if (active) {
                    setSeats(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                if (active) {
                    setError(
                        err?.response?.data?.message ||
                        err?.message ||
                        'Không thể tải sơ đồ ghế.'
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        fetchSeats();

        return () => {
            active = false;
        };
    }, [showtimeId]);

    const seatsByRow = useMemo(() => groupSeatsByRow(seats), [seats]);

    const selectedIds = useMemo(
        () => new Set(selectedSeats.map((seat) => seat.id)),
        [selectedSeats]
    );

    const handleSeatClick = (seat) => {
        if (disabled || seat.status !== 'available') return;

        const isSelected = selectedIds.has(seat.id);

        if (isSelected) {
            onSeatSelected?.(
                selectedSeats.filter((item) => item.id !== seat.id)
            );
            return;
        }

        if (selectedSeats.length >= 8) {
            return;
        }

        onSeatSelected?.([...selectedSeats, seat]);
    };

    if (loading) {
        return (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 p-8">
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-red-500" />
                <p className="text-sm text-slate-400">Đang tải dữ liệu sơ đồ ghế...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-slate-900/80 p-8 text-center">
                <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
                <p className="mb-2 text-sm text-red-300">{error}</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-3 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                >
                    Tải lại trang
                </button>
            </div>
        );
    }

    if (seats.length === 0) {
        return (
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center text-slate-400">
                Suất chiếu chưa có dữ liệu ghế.
            </div>
        );
    }

    return (
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-md md:p-8">
            <div className="mb-6 text-center">
                <h2 className="text-xl font-bold tracking-wide text-white md:text-2xl">
                    Sơ đồ ghế phòng chiếu
                </h2>
                <p className="mt-1 text-xs text-slate-400 md:text-sm">
                    {seats.length} ghế · Chọn tối đa 8 ghế
                </p>
            </div>

            <div className="mx-auto mb-10 max-w-xl">
                <div className="h-2 rounded-full bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_20px_rgba(239,68,68,0.4)]" />
                <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.3em] text-slate-500">
                    Màn hình chiếu
                </p>
            </div>

            <div className="space-y-3 overflow-x-auto">
                {Object.keys(seatsByRow)
                    .sort((a, b) => a.localeCompare(b))
                    .map((rowLabel) => (
                        <div
                            key={rowLabel}
                            className="flex min-w-max items-center justify-center gap-2 md:gap-3"
                        >
                            <span className="w-5 select-none text-center text-xs font-bold text-slate-400">
                                {rowLabel}
                            </span>

                            <div className="flex items-center gap-1.5 md:gap-2">
                                {seatsByRow[rowLabel].map((seat) => {
                                    const isSelected = selectedIds.has(seat.id);
                                    const isReserved = seat.status !== 'available';

                                    const style = isReserved
                                        ? RESERVED_STYLE
                                        : isSelected
                                            ? 'border-blue-400 bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                            : SEAT_TYPE_STYLES[seat.seatTypeName] ??
                                            SEAT_TYPE_STYLES.Standard;

                                    return (
                                        <button
                                            key={seat.id}
                                            type="button"
                                            disabled={disabled || isReserved}
                                            aria-pressed={isSelected}
                                            title={`${seat.seatCode} · ${seat.seatTypeName} · ${formatPrice(seat.totalPrice)} · ${isReserved ? 'Không khả dụng' : isSelected ? 'Đang chọn' : 'Còn trống'}`}
                                            onClick={() => handleSeatClick(seat)}
                                            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-all duration-200 md:h-10 md:w-10 ${style} ${disabled ? 'cursor-not-allowed' : ''}`}
                                        >
                                            {isReserved ? (
                                                <Lock className="h-3.5 w-3.5" />
                                            ) : isSelected ? (
                                                <Check className="h-3.5 w-3.5" />
                                            ) : (
                                                seat.columnNumber
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <span className="w-5 select-none text-center text-xs font-bold text-slate-400">
                                {rowLabel}
                            </span>
                        </div>
                    ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-white/10 pt-6 text-xs">
                <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded border border-slate-600 bg-slate-700" />
                    <span className="text-slate-300">Ghế thường</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded border border-amber-500/50 bg-amber-500/20" />
                    <span className="text-amber-300">VIP</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded border border-pink-500/50 bg-pink-500/20" />
                    <span className="text-pink-300">Ghế đôi</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded border border-blue-400 bg-blue-500" />
                    <span className="text-blue-300">Đang chọn</span>
                </div>

                <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-500">Không khả dụng</span>
                </div>
            </div>
        </section>
    );
};

export default SeatMap;
