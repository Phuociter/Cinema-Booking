import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { PageHeader, EmptyState, Pagination } from '../../components/admin/ui';
import {
  ShowtimeFilters, ShowtimeTable, ShowtimeTimeline, ShowtimeDetailPanel,
  CreateShowtimeModal, SeatMapModal, useShowtimeList,
} from '../../components/admin/showtimes';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useShowtimes } from '../../api/useShowtimes';
import { useCinemas } from '../../api/useCinemas';
import axiosInstance from '../../api/axiosInstance';
import { formatTime } from '../../lib/formatters';

export default function AdminShowtimes() {
  const [cinemas, setCinemas] = useState([]);
  const [movies, setMovies] = useState([]);
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSeatMapOpen, setIsSeatMapOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const {
    showtimes, totalCount, serverPageSize, page, pageSize, isLoading, error,
    filterState, tableContainerRef, fetchShowtimes, handleFilterChange, handlePageChange, handlePageSizeChange,
  } = useShowtimeList(viewMode);

  useEffect(() => {
    useCinemas.getCinemas().then((res) => setCinemas(res?.data || [])).catch(() => {});
    axiosInstance.get('/movies?page=1&pageSize=100').then((res) => setMovies(res?.data?.items || [])).catch(() => {});
  }, []);

  const filtered = useMemo(() => showtimes.filter((s) => (
    (!filterState.auditoriumId || s.auditoriumId === filterState.auditoriumId) &&
    (!filterState.status || s.status === filterState.status)
  )), [showtimes, filterState.auditoriumId, filterState.status]);

  useEffect(() => {
    setSelectedShowtime((prev) => filtered.find((s) => s.id === prev?.id) || filtered[0] || null);
  }, [filtered]);

  const handleConfirmCancel = async () => {
    if (!cancelTarget?.id || isCancelling) return;
    setIsCancelling(true);
    try {
      await useShowtimes.cancelShowtime(cancelTarget.id);
      toast.success('Đã hủy suất chiếu thành công!');
      setCancelTarget(null);
      await fetchShowtimes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi hủy suất chiếu.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget?.id || isRestoring) return;
    setIsRestoring(true);
    try {
      await useShowtimes.restoreShowtime(restoreTarget.id);
      toast.success('Mở lại suất chiếu thành công!');
      setRestoreTarget(null);
      await fetchShowtimes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi mở lại suất chiếu.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="px-4 py-2 sm:px-6 sm:py-3 max-w-7xl mx-auto space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight">Lịch chiếu</h1>
          <p className="text-[11px] text-zinc-400">Lên lịch, hủy suất và kiểm soát ghế theo từng suất.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dull cursor-pointer shadow-sm shadow-primary/30"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo suất chiếu</span>
        </button>
      </div>

      <ShowtimeFilters
        cinemas={cinemas} movies={movies} filterState={filterState}
        onFilterChange={handleFilterChange} onRefresh={fetchShowtimes}
        viewMode={viewMode} onViewModeChange={setViewMode} isLoading={isLoading}
      />

      {error && (
        <div className="rounded border border-red-500/50 bg-red-950/30 p-2.5 text-xs text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchShowtimes} className="px-2.5 py-1 rounded border border-red-500 text-red-200 hover:bg-red-900/40 cursor-pointer">Thử lại</button>
        </div>
      )}

      {viewMode === 'timeline' && !filterState.cinemaId && (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-sm text-zinc-400">
          Chọn cụm rạp để xem lịch theo phòng
        </div>
      )}

      {viewMode === 'timeline' && filterState.cinemaId && totalCount > showtimes.length && (
        <div className="rounded border-l-2 border-amber-500 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-300">
          Còn suất chưa hiển thị, hãy chọn phòng hoặc rạp cụ thể
        </div>
      )}

      {isLoading && filtered.length === 0 && (
        <div className="p-8 text-center text-xs text-zinc-400">Đang tải danh sách suất chiếu...</div>
      )}

      {!isLoading && filtered.length === 0 && !error && (viewMode !== 'timeline' || Boolean(filterState.cinemaId)) && (
        <EmptyState
          title="Không tìm thấy suất chiếu nào"
          description="Thử thay đổi bộ lọc hoặc tạo một suất chiếu mới cho rạp này."
          action={<button type="button" onClick={() => setIsCreateOpen(true)} className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dull cursor-pointer">Tạo suất chiếu ngay</button>}
        />
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-3 items-stretch h-[calc(100vh-185px)] min-h-[420px]">
          {/* Cột trái: Khung Table tĩnh (Header và Pagination đứng yên, Data cuộn bên trong) */}
          {viewMode === 'table' ? (
            <div className="flex flex-col h-full min-h-0 rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden shadow-lg shadow-black/40">
              {/* Vùng cuộn dữ liệu: Co giãn linh hoạt chiếm trọn chiều cao, header sticky top, pagination ở đáy */}
              <div ref={tableContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative scroll-smooth">
                {isLoading && (
                  <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[1px] flex items-center justify-center text-xs text-zinc-300 z-20">
                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-md shadow-lg">
                      <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span>Đang tải trang mới...</span>
                    </div>
                  </div>
                )}
                <ShowtimeTable
                  showtimes={filtered}
                  selectedId={selectedShowtime?.id}
                  onSelectShowtime={setSelectedShowtime}
                  onCancelClick={setCancelTarget}
                  onRestoreClick={setRestoreTarget}
                />
              </div>

              {/* Phân trang đứng yên cố định ở đáy table */}
              <div className="border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm px-4 py-2.5 z-10 shrink-0">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={totalCount}
                  itemCount={showtimes.length}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  disabled={isLoading}
                />
                {serverPageSize && (
                  <div className="text-[10px] text-zinc-500 italic mt-1">
                    Máy chủ đang giới hạn tối đa {serverPageSize} dòng mỗi trang
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Chế độ Lịch theo phòng (Timeline) */
            <div className="flex flex-col h-full min-h-0 rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden shadow-lg shadow-black/40">
              <div ref={tableContainerRef} className="flex-1 min-h-0 overflow-auto relative">
                {isLoading && (
                  <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[1px] flex items-center justify-center text-xs text-zinc-300 z-10">
                    Đang tải trang mới...
                  </div>
                )}
                <ShowtimeTimeline
                  showtimes={filtered}
                  selectedId={selectedShowtime?.id}
                  onSelectShowtime={setSelectedShowtime}
                />
              </div>
            </div>
          )}

          <ShowtimeDetailPanel
            showtime={selectedShowtime}
            onOpenSeatMap={() => setIsSeatMapOpen(true)}
            onCancelShowtime={setCancelTarget}
            onRestoreShowtime={setRestoreTarget}
          />
        </div>
      )}

      <CreateShowtimeModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} cinemas={cinemas} movies={movies} onSuccess={fetchShowtimes} />
      <SeatMapModal isOpen={isSeatMapOpen} onClose={() => setIsSeatMapOpen(false)} showtime={selectedShowtime} />
      <ConfirmModal
        isOpen={Boolean(cancelTarget)}
        title="Xác nhận hủy suất chiếu"
        message={`Hủy suất chiếu "${cancelTarget?.movieTitle}" (${cancelTarget?.auditoriumName}, ${formatTime(cancelTarget?.startTime)})? Các đơn đang chờ thanh toán của suất này sẽ bị hủy. Thao tác không thể hoàn tác.`}
        confirmText={isCancelling ? 'Đang hủy...' : 'Đồng ý hủy'}
        type="danger" isLoading={isCancelling} onConfirm={handleConfirmCancel} onCancel={() => setCancelTarget(null)}
      />
      <ConfirmModal
        isOpen={Boolean(restoreTarget)}
        title="Xác nhận mở lại suất chiếu"
        message={`Mở lại suất chiếu "${restoreTarget?.movieTitle}" (${restoreTarget?.auditoriumName}, ${formatTime(restoreTarget?.startTime)})? Suất chiếu sẽ được chuyển về trạng thái hoạt động để tiếp tục bán vé.`}
        confirmText={isRestoring ? 'Đang mở lại...' : 'Đồng ý mở lại'}
        type="primary" isLoading={isRestoring} onConfirm={handleConfirmRestore} onCancel={() => setRestoreTarget(null)}
      />
    </div>
  );
}
