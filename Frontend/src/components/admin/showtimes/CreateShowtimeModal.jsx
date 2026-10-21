import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { AdminModal } from '../ui/AdminModal';
import { TIME_SUGGESTIONS, TIMELINE_START_HOUR, TIMELINE_TOTAL_HOURS } from './constants';
import {
  toDecimalHour,
  calculateEndTimeString,
  toIsoUtcString,
  checkTimeOverlap,
  getTimelinePosition,
  formatVnd,
} from './showtimeUtils';
import { useShowtimes } from '../../../api/useShowtimes';
import { formatTime } from '../../../lib/formatters';

export const CreateShowtimeModal = ({ isOpen, onClose, cinemas = [], movies = [], onSuccess }) => {
  const [movieId, setMovieId] = useState('');
  const [cinemaId, setCinemaId] = useState('');
  const [auditoriumId, setAuditoriumId] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [startTime, setStartTime] = useState('12:50');
  const [basePrice, setBasePrice] = useState(75000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [roomShowtimes, setRoomShowtimes] = useState([]);
  const [isFetchingRoom, setIsFetchingRoom] = useState(false);
  const [roomFetchError, setRoomFetchError] = useState(false);

  const selectedCinema = cinemas.find((c) => c.id === cinemaId) || cinemas[0];
  const auditoriums = selectedCinema?.auditoriums || [];
  const currentAuditoriumId = auditoriumId || auditoriums[0]?.id || '';
  const selectedMovie = movies.find((m) => m.id === movieId) || movies[0];
  const durationMin = selectedMovie?.durationMin || 107;

  useEffect(() => {
    if (!isOpen || !selectedCinema?.id || !date) { setRoomShowtimes([]); return; }
    let isCancelled = false;
    setIsFetchingRoom(true);
    setRoomFetchError(false);
    useShowtimes.getShowtimes({ cinemaId: selectedCinema.id, date, pageSize: 200 })
      .then((res) => {
        if (!isCancelled) setRoomShowtimes((res?.data?.items || []).filter((s) => s.status !== 'cancelled'));
      })
      .catch(() => { if (!isCancelled) { setRoomFetchError(true); setRoomShowtimes([]); } })
      .finally(() => { if (!isCancelled) setIsFetchingRoom(false); });
    return () => { isCancelled = true; };
  }, [isOpen, selectedCinema?.id, date]);

  const filteredRoomShowtimes = useMemo(() => (
    roomShowtimes.filter((s) => s.auditoriumId === currentAuditoriumId)
  ), [roomShowtimes, currentAuditoriumId]);

  const startDec = toDecimalHour(startTime);
  const endDec = startDec + durationMin / 60;
  const conflict = filteredRoomShowtimes.find((s) => (
    checkTimeOverlap(startDec, endDec, toDecimalHour(s.startTime), toDecimalHour(s.endTime))
  ));

  const handleSubmit = async () => {
    if (!selectedMovie?.id || !currentAuditoriumId || !date || !startTime) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    setServerError('');
    setIsSubmitting(true);
    try {
      await useShowtimes.createShowtime({
        movieId: selectedMovie.id,
        auditoriumId: currentAuditoriumId,
        startTime: toIsoUtcString(date, startTime),
        basePrice: Number(basePrice) || 0,
      });
      toast.success('Tạo suất chiếu thành công!');
      onSuccess?.();
      onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || (err.response?.status === 409 ? 'Trùng lịch chiếu với suất đã tồn tại.' : 'Lỗi khi tạo suất chiếu.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const newPos = getTimelinePosition(startDec, endDec, TIMELINE_START_HOUR, TIMELINE_TOTAL_HOURS);

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo suất chiếu"
      maxWidth="max-w-4xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer">
            Hủy
          </button>
          <button type="button" disabled={Boolean(conflict) || isSubmitting} onClick={handleSubmit} className="rounded bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-dull disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer">
            {isSubmitting ? 'Đang tạo...' : 'Tạo suất chiếu'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div className="grid grid-cols-[100px_1fr] items-center gap-2 text-xs">
            <label className="text-zinc-400">Phim</label>
            <select value={selectedMovie?.id || ''} onChange={(e) => setMovieId(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 outline-none">
              {movies.map((m) => (<option key={m.id} value={m.id}>{m.title} · {m.durationMin || 120}p</option>))}
            </select>
            <label className="text-zinc-400">Cụm rạp</label>
            <select value={selectedCinema?.id || ''} onChange={(e) => { setCinemaId(e.target.value); setAuditoriumId(''); }} className="bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 outline-none">
              {cinemas.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <label className="text-zinc-400">Phòng</label>
            <select value={currentAuditoriumId} onChange={(e) => setAuditoriumId(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 outline-none">
              {auditoriums.map((a) => (<option key={a.id} value={a.id}>{a.name} · {a.hallType}</option>))}
            </select>
            <label className="text-zinc-400">Ngày</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 outline-none" />
            <label className="text-zinc-400">Bắt đầu</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 outline-none font-mono" />
            <label className="text-zinc-400">Kết thúc</label>
            <input disabled value={calculateEndTimeString(startTime, durationMin)} className="bg-zinc-900 border border-zinc-800 rounded p-1.5 font-mono text-zinc-400 cursor-not-allowed" />
            <label className="text-zinc-400">Giá cơ bản</label>
            <input type="number" step={5000} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 outline-none font-mono" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">Khung giờ gợi ý</div>
            <div className="flex flex-wrap gap-1.5">
              {TIME_SUGGESTIONS.map((t) => (
                <button key={t} type="button" onClick={() => setStartTime(t)} className="rounded border border-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:border-primary hover:text-zinc-200 cursor-pointer">
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Lịch phòng trong ngày</span>
            {isFetchingRoom && <span className="text-zinc-500 font-mono text-[10px]">Đang tải...</span>}
          </div>
          <div className="relative h-9 rounded border border-zinc-800 bg-zinc-950" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 calc(12.5% - 1px), #27272a calc(12.5% - 1px) 12.5%)' }}>
            {filteredRoomShowtimes.map((s) => {
              const pos = getTimelinePosition(toDecimalHour(s.startTime), toDecimalHour(s.endTime));
              if (!pos.isVisible) return null;
              return (
                <div key={s.id} style={{ left: pos.left, width: pos.width }} title={`${s.movieTitle} (${formatTime(s.startTime)} – ${formatTime(s.endTime)})`} className="absolute top-1.5 h-6 rounded bg-zinc-800 border border-zinc-600 text-[10px] text-zinc-300 px-1 truncate">
                  {s.movieTitle}
                </div>
              );
            })}
            {newPos.isVisible && (
              <div style={{ left: newPos.left, width: newPos.width }} className={`absolute top-1.5 h-6 rounded border text-[10px] px-1 font-semibold flex items-center justify-center ${conflict ? 'border-dashed border-red-500 bg-red-950/60 text-red-300' : 'border-emerald-500 bg-emerald-950/60 text-emerald-300'}`}>
                Mới
              </div>
            )}
          </div>
          <div className="flex justify-between text-[11px] font-mono text-zinc-400">
            <span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span>
          </div>

          {serverError && <div className="rounded border-l-2 border-red-500 bg-red-950/30 p-2 text-xs text-red-300">{serverError}</div>}
          {roomFetchError ? (
            <div className="rounded border-l-2 border-amber-500 bg-amber-950/30 p-2 text-xs text-amber-300">
              Không kiểm tra được lịch phòng, backend vẫn sẽ chặn nếu trùng
            </div>
          ) : conflict ? (
            <div className="rounded border-l-2 border-red-500 bg-red-950/30 p-2 text-xs text-red-300">
              Trùng với &quot;{conflict.movieTitle}&quot; ({formatTime(conflict.startTime)} – {formatTime(conflict.endTime)}). Vui lòng chọn giờ khác.
            </div>
          ) : (
            <div className="rounded border border-zinc-800 bg-zinc-950/40 p-2 text-xs text-zinc-400">
              {isFetchingRoom ? 'Đang kiểm tra lịch chiếu của phòng...' : 'Không trùng lịch. Hệ thống sẽ tự động khởi tạo ma trận ghế vật lý cho suất này.'}
            </div>
          )}

          <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5 text-xs space-y-1">
            <div className="text-zinc-400">Giá vé theo loại ghế:</div>
            <div className="font-mono text-zinc-200">
              Standard {formatVnd(Number(basePrice) || 0)} · VIP {formatVnd((Number(basePrice) || 0) + 20000)} · Couple {formatVnd((Number(basePrice) || 0) + 40000)}
            </div>
          </div>
        </div>
      </div>
    </AdminModal>
  );
};

export default CreateShowtimeModal;
