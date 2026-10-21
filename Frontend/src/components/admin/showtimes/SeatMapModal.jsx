import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RotateCw } from 'lucide-react';
import { AdminModal } from '../ui/AdminModal';
import { SeatGrid } from './SeatGrid';
import { useShowtimes } from '../../../api/useShowtimes';
import { formatTime, formatCurrency, formatDateTime } from '../../../lib/formatters';
import { SEAT_STATUS_LABELS } from './constants';

export const SeatMapModal = ({ isOpen, onClose, showtime }) => {
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const buildCoupleSelection = (seatA, seatB) => {
    const isMaintenance = seatA.status === 'maintenance' || seatB.status === 'maintenance';
    const isSold = seatA.status === 'sold' || seatB.status === 'sold';
    const isHolding = seatA.status === 'holding' || seatB.status === 'holding';

    const pairStatus = isSold ? 'sold' : isHolding ? 'holding' : isMaintenance ? 'maintenance' : 'available';

    return {
      isCouple: true,
      seatId: seatA.seatId,
      seats: [seatA, seatB],
      seatCode: `${seatA.seatCode} – ${seatB.seatCode}`,
      seatTypeName: seatA.seatTypeName || 'Couple',
      price: (seatA.price || 0) + (seatB.price || 0),
      status: pairStatus,
      customerInfo: seatA.customerInfo || seatB.customerInfo || null,
    };
  };

  const loadSeats = useCallback(async () => {
    if (!showtime?.id) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await useShowtimes.getAdminShowtimeSeats(showtime.id);
      const data = res?.data || [];
      setSeats(data);
      setLastUpdated(new Date().toTimeString().slice(0, 5));
      setSelectedSeat((prev) => {
        if (!prev) return null;
        if (prev.isCouple && prev.seats?.length === 2) {
          const sA = data.find((s) => s.seatId === prev.seats[0].seatId);
          const sB = data.find((s) => s.seatId === prev.seats[1].seatId);
          if (!sA || !sB) return null;
          return buildCoupleSelection(sA, sB);
        }
        return data.find((s) => s.seatId === prev.seatId) || null;
      });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Lỗi tải sơ đồ ghế.');
    } finally {
      setIsLoading(false);
    }
  }, [showtime?.id]);

  useEffect(() => {
    if (isOpen && showtime?.id) {
      loadSeats();
      setSelectedSeat(null);
    }
  }, [isOpen, showtime?.id, loadSeats]);

  const handleSelectSeat = useCallback(
    (seat) => {
      if (!seat) {
        setSelectedSeat(null);
        return;
      }

      const typeName = (seat.seatTypeName || '').toLowerCase();
      const isCouple = typeName.includes('couple') || typeName.includes('đôi') || seat.rowLabel === 'F';

      if (!isCouple) {
        setSelectedSeat(seat);
        return;
      }

      // Ghế đôi: Tự động ghép cặp (1-2, 3-4, 5-6, 7-8...)
      const isOdd = seat.columnNumber % 2 === 1;
      const partnerCol = isOdd ? seat.columnNumber + 1 : seat.columnNumber - 1;
      const partnerSeat = seats.find(
        (s) => s.rowLabel === seat.rowLabel && s.columnNumber === partnerCol
      );

      const seatA = isOdd ? seat : partnerSeat || seat;
      const seatB = isOdd ? partnerSeat || seat : seat;

      setSelectedSeat(buildCoupleSelection(seatA, seatB));
    },
    [seats]
  );

  const handleToggleMaintenance = async () => {
    if (!selectedSeat || isSubmitting || showtime?.status === 'cancelled') return;
    const isMaintenance = selectedSeat.status === 'maintenance';
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      if (selectedSeat.isCouple && selectedSeat.seats?.length) {
        // Cập nhật bảo trì cho cả cặp ghế
        await Promise.all(
          selectedSeat.seats.map((s) =>
            useShowtimes.setSeatMaintenance(showtime.id, s.seatId, !isMaintenance)
          )
        );
        toast.success(`Đã ${isMaintenance ? 'mở khóa' : 'khóa'} bảo trì cặp ghế ${selectedSeat.seatCode}`);
      } else {
        await useShowtimes.setSeatMaintenance(showtime.id, selectedSeat.seatId, !isMaintenance);
        toast.success(`Đã ${isMaintenance ? 'mở khóa' : 'khóa'} bảo trì ghế ${selectedSeat.seatCode}`);
      }
      await loadSeats();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Không thể cập nhật bảo trì ghế.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCancelled = showtime?.status === 'cancelled';
  const counts = {
    available: seats.filter((s) => s.status === 'available').length,
    holding: seats.filter((s) => s.status === 'holding').length,
    sold: seats.filter((s) => s.status === 'sold').length,
    maintenance: seats.filter((s) => s.status === 'maintenance').length,
  };

  const modalTitle = showtime
    ? `${showtime.movieTitle} · ${showtime.auditoriumName} · ${formatTime(showtime.startTime)} – ${formatTime(showtime.endTime)}${isCancelled ? ' (ĐÃ HỦY)' : ''}`
    : 'Sơ đồ ghế';

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="max-w-4xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="font-mono text-xs text-zinc-400">
            {lastUpdated ? `Cập nhật lúc ${lastUpdated}` : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSeats}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
              <span>Làm mới</span>
            </button>
            <button type="button" onClick={onClose} className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer">
              Đóng
            </button>
          </div>
        </div>
      }
    >
      {/* 4 Thẻ KPI đếm ghế */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
        <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5">
          <span className="text-zinc-400">Trống</span>
          <b className="block text-lg font-semibold text-zinc-200 font-mono">{counts.available}</b>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5">
          <span className="text-zinc-400">Đang giữ</span>
          <b className="block text-lg font-semibold text-amber-400 font-mono">{counts.holding}</b>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5">
          <span className="text-zinc-400">Đã bán</span>
          <b className="block text-lg font-semibold text-red-400 font-mono">{counts.sold}</b>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5">
          <span className="text-zinc-400">Bảo trì</span>
          <b className="block text-lg font-semibold text-zinc-400 font-mono">{counts.maintenance}</b>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-4">
        {/* Nửa trái: Sơ đồ ghế + Legend */}
        <div>
          <SeatGrid
            seats={seats}
            selectedSeatId={selectedSeat?.seatId}
            selectedSeatIds={
              selectedSeat?.isCouple
                ? selectedSeat.seats.map((s) => s.seatId)
                : selectedSeat
                ? [selectedSeat.seatId]
                : []
            }
            onSelectSeat={handleSelectSeat}
          />
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400 border-t border-zinc-800/80 pt-2.5">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-zinc-900 border border-zinc-700" />Trống</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded border border-dashed border-amber-400" />Đang giữ</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-500" />Đã bán</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded border border-zinc-700 bg-zinc-700/60" />Bảo trì</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded border-b-2 border-amber-400 bg-zinc-900" />VIP</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-5 rounded border border-pink-500/70 bg-pink-950/40" />Couple (F)</span>
          </div>
        </div>

        {/* Nửa phải: Chi tiết ghế */}
        <div className="space-y-3 rounded border border-zinc-800 bg-zinc-950 p-3.5 text-xs">
          <div className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">Chi tiết ghế</div>
          {errorMessage && <div className="rounded border-l-2 border-red-500 bg-red-950/40 p-2 text-xs text-red-300">{errorMessage}</div>}
          {!selectedSeat ? (
            <p className="text-zinc-400">Vui lòng chọn một ghế trên sơ đồ để xem thông tin chi tiết.</p>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-zinc-100">
                {selectedSeat.isCouple ? `Cặp ghế ${selectedSeat.seatCode}` : `Ghế ${selectedSeat.seatCode}`} · <span className="text-zinc-400 font-normal">{selectedSeat.seatTypeName}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 text-zinc-400">
                <span>Giá vé:</span>
                <b className="font-mono text-zinc-200">
                  {formatCurrency(selectedSeat.price)}
                  {selectedSeat.isCouple && <span className="text-[11px] text-zinc-400 font-normal ml-1">(cặp 2 ghế)</span>}
                </b>
              </div>
              <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 text-zinc-400">
                <span>Trạng thái:</span><b className="text-zinc-200">{SEAT_STATUS_LABELS[selectedSeat.status] || selectedSeat.status}</b>
              </div>

              {(selectedSeat.status === 'sold' || selectedSeat.status === 'holding') && selectedSeat.customerInfo && (
                <div className="border-t border-zinc-800/60 pt-2 space-y-1.5">
                  <div className="flex justify-between text-zinc-400"><span>Khách:</span><b className="text-zinc-200">{selectedSeat.customerInfo.customerName || 'N/A'}</b></div>
                  <div className="flex justify-between text-zinc-400"><span>Email:</span><b className="text-zinc-200">{selectedSeat.customerInfo.email || 'N/A'}</b></div>
                  <div className="flex justify-between text-zinc-400"><span>SĐT:</span><b className="font-mono text-zinc-200">{selectedSeat.customerInfo.phone || 'N/A'}</b></div>
                  <div className="flex justify-between text-zinc-400"><span>Mã đơn:</span><b className="font-mono text-zinc-200">{selectedSeat.customerInfo.bookingCode || 'N/A'}</b></div>
                  {selectedSeat.customerInfo.holdingExpiresAt && (
                    <div className="flex justify-between text-zinc-400">
                      <span>Hạn giữ:</span><b className="font-mono text-amber-400">{formatDateTime(selectedSeat.customerInfo.holdingExpiresAt)}</b>
                    </div>
                  )}
                  <p className="text-[11px] text-zinc-400 italic pt-1">Không thể khóa bảo trì ghế đã có đơn đặt hàng.</p>
                </div>
              )}

              {(selectedSeat.status === 'available' || selectedSeat.status === 'maintenance') && (
                <div className="border-t border-zinc-800/60 pt-3">
                  <button
                    type="button"
                    disabled={isCancelled || isSubmitting}
                    title={isCancelled ? 'Suất chiếu đã hủy' : ''}
                    onClick={handleToggleMaintenance}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting
                      ? 'Đang xử lý...'
                      : selectedSeat.status === 'maintenance'
                      ? `Mở khóa bảo trì ${selectedSeat.isCouple ? 'cặp ghế' : 'ghế'}`
                      : `Khóa bảo trì ${selectedSeat.isCouple ? 'cặp ghế' : 'ghế'}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
};

export default SeatMapModal;
