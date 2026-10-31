import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, DoorOpen, RefreshCw, Search, X } from 'lucide-react';
import PageHeader from '../../components/admin/ui/PageHeader';
import TableContainer from '../../components/admin/ui/TableContainer';
import Pagination from '../../components/admin/ui/Pagination';
import SearchableSelect from '../../components/admin/ui/SearchableSelect';
import AdminModal from '../../components/admin/ui/AdminModal';
import EmptyState from '../../components/admin/ui/EmptyState';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useCinemas } from '../../api/useCinemas';
import { DEFAULT_PAGE_SIZE } from '../../components/admin/showtimes/constants';

const HALL_TYPES = ['2D', '3D', 'IMAX', 'GOLDCLASS'];
const EMPTY_CINEMA = { name: '', city: '', address: '', hotline: '', imageUrl: '' };
const EMPTY_HALL = { id: null, name: '', hallType: '2D', totalRows: '8', totalColumns: '12' };

const inputCls =
  'w-full rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-primary';
const btnPrimary =
  'rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dull cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const btnGhost =
  'rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer disabled:opacity-50';
const iconBtn =
  'rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer';

const MovieBadge = ({ count }) => (
  <span className="inline-flex items-center rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
    {count ?? 0} phim
  </span>
);

const Field = ({ label, children }) => (
  <label className="block space-y-1">
    <span className="text-[11px] text-zinc-400">{label}</span>
    {children}
  </label>
);

export default function AdminCinemas() {
  const [cinemas, setCinemas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({ city: '', cinemaId: '', auditoriumId: '', search: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Modal rạp
  const [cinemaModal, setCinemaModal] = useState({ open: false, id: null });
  const [cinemaForm, setCinemaForm] = useState(EMPTY_CINEMA);
  const [isSaving, setIsSaving] = useState(false);

  // Modal phòng chiếu
  const [hallCinemaId, setHallCinemaId] = useState(null);
  const [hallForm, setHallForm] = useState(EMPTY_HALL);

  // Xóa
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'cinema' | 'hall', item }
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCinemas = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await useCinemas.getCinemas();
      setCinemas(Array.isArray(res) ? res : res?.items ?? []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách rạp.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCinemas();
  }, [fetchCinemas]);

  // ----- Bộ lọc cascade: Tỉnh/Thành -> Cụm rạp -> Phòng chiếu -----
  const cityOptions = useMemo(
    () =>
      [...new Set(cinemas.map((c) => c.city?.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'vi'))
        .map((city) => ({ value: city, label: city })),
    [cinemas]
  );

  const cinemaOptions = useMemo(
    () =>
      cinemas
        .filter((c) => !filters.city || c.city === filters.city)
        .map((c) => ({ value: c.id, label: c.name, sublabel: c.city })),
    [cinemas, filters.city]
  );

  const auditoriumOptions = useMemo(() => {
    const cinema = cinemas.find((c) => c.id === filters.cinemaId);
    return (cinema?.auditoriums ?? []).map((a) => ({
      value: a.id,
      label: a.name,
      sublabel: a.hallType,
    }));
  }, [cinemas, filters.cinemaId]);

  const setFilter = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return cinemas.filter((c) => {
      if (filters.city && c.city !== filters.city) return false;
      if (filters.cinemaId && c.id !== filters.cinemaId) return false;
      if (filters.auditoriumId && !c.auditoriums?.some((a) => a.id === filters.auditoriumId)) return false;
      if (q && !(c.name?.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [cinemas, filters]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const hasFilter = Object.values(filters).some(Boolean);
  const hallCinema = cinemas.find((c) => c.id === hallCinemaId) || null;

  // ----- CRUD rạp -----
  const openCinemaModal = (cinema = null) => {
    setCinemaForm(
      cinema
        ? {
            name: cinema.name ?? '',
            city: cinema.city ?? '',
            address: cinema.address ?? '',
            hotline: cinema.hotline ?? '',
            imageUrl: cinema.imageUrl ?? '',
          }
        : EMPTY_CINEMA
    );
    setCinemaModal({ open: true, id: cinema?.id ?? null });
  };

  const saveCinema = async () => {
    if (!cinemaForm.name.trim()) return toast.error('Vui lòng nhập tên rạp.');
    if (!cinemaForm.city.trim()) return toast.error('Vui lòng nhập tỉnh/thành.');
    if (!cinemaForm.address.trim()) return toast.error('Vui lòng nhập địa chỉ chi tiết.');

    setIsSaving(true);
    try {
      if (cinemaModal.id) {
        await useCinemas.updateCinema(cinemaModal.id, cinemaForm);
        toast.success('Đã cập nhật cụm rạp.');
      } else {
        await useCinemas.createCinema(cinemaForm);
        toast.success('Đã thêm cụm rạp mới.');
      }
      setCinemaModal({ open: false, id: null });
      await fetchCinemas();
    } catch (err) {
      toast.error(err.message || 'Không thể lưu cụm rạp.');
    } finally {
      setIsSaving(false);
    }
  };

  // ----- CRUD phòng chiếu -----
  const openHallModal = (cinema) => {
    setHallForm(EMPTY_HALL);
    setHallCinemaId(cinema.id);
  };

  const editHall = (hall) =>
    setHallForm({
      id: hall.id,
      name: hall.name ?? '',
      hallType: hall.hallType ?? '2D',
      totalRows: String(hall.totalRows ?? ''),
      totalColumns: String(hall.totalColumns ?? ''),
    });

  const saveHall = async () => {
    const rows = Number(hallForm.totalRows);
    const cols = Number(hallForm.totalColumns);
    if (!hallForm.name.trim()) return toast.error('Vui lòng nhập tên phòng.');
    if (!Number.isInteger(rows) || rows < 1 || rows > 26) return toast.error('Số hàng ghế phải từ 1 đến 26.');
    if (!Number.isInteger(cols) || cols < 1 || cols > 30) return toast.error('Số cột ghế phải từ 1 đến 30.');

    const payload = { name: hallForm.name, hallType: hallForm.hallType, totalRows: rows, totalColumns: cols };
    setIsSaving(true);
    try {
      if (hallForm.id) {
        await useCinemas.updateAuditorium(hallForm.id, payload);
        toast.success('Đã cập nhật phòng chiếu.');
      } else {
        await useCinemas.createAuditorium(hallCinemaId, payload);
        toast.success('Đã thêm phòng chiếu.');
      }
      setHallForm(EMPTY_HALL);
      await fetchCinemas();
    } catch (err) {
      toast.error(err.message || 'Không thể lưu phòng chiếu.');
    } finally {
      setIsSaving(false);
    }
  };

  // ----- Xóa -----
  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'cinema') {
        await useCinemas.deleteCinema(deleteTarget.item.id);
        toast.success('Đã xóa cụm rạp.');
        if (filters.cinemaId === deleteTarget.item.id) setFilter({ cinemaId: '', auditoriumId: '' });
      } else {
        await useCinemas.deleteAuditorium(deleteTarget.item.id);
        toast.success('Đã xóa phòng chiếu.');
        if (hallForm.id === deleteTarget.item.id) setHallForm(EMPTY_HALL);
      }
      setDeleteTarget(null);
      await fetchCinemas();
    } catch (err) {
      toast.error(err.message || 'Không thể xóa.');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteMessage =
    deleteTarget?.type === 'cinema'
      ? `Xóa cụm rạp "${deleteTarget.item.name}" cùng ${deleteTarget.item.auditoriums?.length ?? 0} phòng chiếu? Thao tác không thể hoàn tác.`
      : deleteTarget
      ? `Xóa phòng chiếu "${deleteTarget.item.name}"? Thao tác không thể hoàn tác.`
      : '';

  return (
    <div className="px-4 py-2 sm:px-6 sm:py-3 max-w-7xl mx-auto space-y-2">
      <PageHeader
        title="Cụm rạp & Phòng chiếu"
        description="Quản lý cụm rạp, cấu hình phòng chiếu và theo dõi số phim đang chiếu trong tháng."
        badge={`${cinemas.length} rạp`}
      >
        <button type="button" onClick={() => openCinemaModal()} className={`flex items-center gap-1.5 ${btnPrimary}`}>
          <Plus className="h-4 w-4" />
          <span>Thêm cụm rạp</span>
        </button>
      </PageHeader>

      {/* Thanh lọc */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 p-2">
        <SearchableSelect
          value={filters.city}
          onChange={(v) => setFilter({ city: v, cinemaId: '', auditoriumId: '' })}
          options={cityOptions}
          placeholder="Tất cả tỉnh/thành"
          searchPlaceholder="Tìm tỉnh/thành..."
        />
        <SearchableSelect
          value={filters.cinemaId}
          onChange={(v) => setFilter({ cinemaId: v, auditoriumId: '' })}
          options={cinemaOptions}
          placeholder="Tất cả cụm rạp"
          searchPlaceholder="Tìm cụm rạp..."
        />
        <SearchableSelect
          value={filters.auditoriumId}
          onChange={(v) => setFilter({ auditoriumId: v })}
          options={auditoriumOptions}
          placeholder={filters.cinemaId ? 'Tất cả phòng chiếu' : 'Chọn rạp để lọc phòng'}
          searchPlaceholder="Tìm phòng chiếu..."
          disabled={!filters.cinemaId}
        />
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            placeholder="Tìm theo tên rạp hoặc địa chỉ..."
            className={`${inputCls} pl-7`}
          />
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={() => setFilter({ city: '', cinemaId: '', auditoriumId: '', search: '' })}
            className={`flex items-center gap-1 ${btnGhost}`}
          >
            <X className="h-3.5 w-3.5" /> Xóa lọc
          </button>
        )}
        <button type="button" onClick={fetchCinemas} className={iconBtn} title="Tải lại">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded border border-red-500/50 bg-red-950/30 p-2.5 text-xs text-red-300">
          <span>{error}</span>
          <button type="button" onClick={fetchCinemas} className="rounded border border-red-500 px-2.5 py-1 text-red-200 hover:bg-red-900/40 cursor-pointer">
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 ? (
        <EmptyState
          title="Không tìm thấy cụm rạp nào"
          description="Thử thay đổi bộ lọc hoặc thêm một cụm rạp mới."
          action={<button type="button" onClick={() => openCinemaModal()} className={btnPrimary}>Thêm cụm rạp</button>}
        />
      ) : (
        <div className="h-[calc(100vh-230px)] min-h-[420px] flex flex-col">
          <TableContainer
            className="h-full"
            isLoading={isLoading}
            loadingText="Đang tải danh sách rạp..."
            pagination={
              <Pagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                itemCount={paged.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                disabled={isLoading}
              />
            }
          >
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-zinc-900 text-[11px] uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Ảnh</th>
                  <th className="px-3 py-2 font-medium">Tên rạp</th>
                  <th className="px-3 py-2 font-medium">Địa chỉ</th>
                  <th className="px-3 py-2 font-medium">Tỉnh/thành</th>
                  <th className="px-3 py-2 font-medium">Hotline</th>
                  <th className="px-3 py-2 font-medium text-center">Phòng</th>
                  <th className="px-3 py-2 font-medium text-center">Phim trong tháng</th>
                  <th className="px-3 py-2 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {paged.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-900/60">
                    <td className="px-3 py-2">
                      {c.imageUrl ? (
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          loading="lazy"
                          className="h-10 w-16 rounded object-cover bg-zinc-800"
                          onError={(e) => { e.target.style.visibility = 'hidden'; }}
                        />
                      ) : (
                        <div className="h-10 w-16 rounded bg-zinc-800" />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-zinc-100">{c.name}</td>
                    <td className="px-3 py-2 text-zinc-400 max-w-[260px] truncate" title={c.address}>{c.address}</td>
                    <td className="px-3 py-2 text-zinc-300">{c.city}</td>
                    <td className="px-3 py-2 text-zinc-400">{c.hotline || '—'}</td>
                    <td className="px-3 py-2 text-center text-zinc-200">{c.auditoriums?.length ?? 0}</td>
                    <td className="px-3 py-2 text-center"><MovieBadge count={c.activeMovieCountThisMonth} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <button type="button" className={iconBtn} title="Phòng chiếu" onClick={() => openHallModal(c)}>
                          <DoorOpen className="h-4 w-4" />
                        </button>
                        <button type="button" className={iconBtn} title="Sửa rạp" onClick={() => openCinemaModal(c)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={`${iconBtn} hover:!text-red-400`}
                          title="Xóa rạp"
                          onClick={() => setDeleteTarget({ type: 'cinema', item: c })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        </div>
      )}

      {/* Modal thêm/sửa rạp */}
      <AdminModal
        isOpen={cinemaModal.open}
        onClose={() => !isSaving && setCinemaModal({ open: false, id: null })}
        title={cinemaModal.id ? 'Sửa cụm rạp' : 'Thêm cụm rạp'}
        maxWidth="max-w-lg"
        footer={
          <>
            <button type="button" className={btnGhost} disabled={isSaving} onClick={() => setCinemaModal({ open: false, id: null })}>Hủy</button>
            <button type="button" className={btnPrimary} disabled={isSaving} onClick={saveCinema}>
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Tên rạp *">
            <input className={inputCls} value={cinemaForm.name} onChange={(e) => setCinemaForm({ ...cinemaForm, name: e.target.value })} />
          </Field>
          <Field label="Tỉnh/thành *">
            <input className={inputCls} list="city-suggestions" value={cinemaForm.city} onChange={(e) => setCinemaForm({ ...cinemaForm, city: e.target.value })} />
            <datalist id="city-suggestions">
              {cityOptions.map((o) => <option key={o.value} value={o.value} />)}
            </datalist>
          </Field>
          <Field label="Địa chỉ chi tiết *">
            <input className={inputCls} value={cinemaForm.address} onChange={(e) => setCinemaForm({ ...cinemaForm, address: e.target.value })} />
          </Field>
          <Field label="Hotline">
            <input className={inputCls} value={cinemaForm.hotline} onChange={(e) => setCinemaForm({ ...cinemaForm, hotline: e.target.value })} />
          </Field>
          <Field label="Ảnh đại diện (Image URL)">
            <input className={inputCls} value={cinemaForm.imageUrl} onChange={(e) => setCinemaForm({ ...cinemaForm, imageUrl: e.target.value })} />
          </Field>
        </div>
      </AdminModal>

      {/* Modal phòng chiếu */}
      <AdminModal
        isOpen={Boolean(hallCinema)}
        onClose={() => setHallCinemaId(null)}
        title={hallCinema ? `Phòng chiếu - ${hallCinema.name}` : 'Phòng chiếu'}
        maxWidth="max-w-3xl"
      >
        {hallCinema && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 text-[11px] uppercase text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tên phòng</th>
                    <th className="px-3 py-2 font-medium">Định dạng</th>
                    <th className="px-3 py-2 font-medium text-center">Hàng × Cột</th>
                    <th className="px-3 py-2 font-medium text-center">Phim trong tháng</th>
                    <th className="px-3 py-2 font-medium text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {(hallCinema.auditoriums ?? []).map((a) => (
                    <tr key={a.id} className={hallForm.id === a.id ? 'bg-primary/5' : ''}>
                      <td className="px-3 py-2 text-zinc-100">{a.name}</td>
                      <td className="px-3 py-2 text-zinc-300">{a.hallType}</td>
                      <td className="px-3 py-2 text-center text-zinc-300">{a.totalRows} × {a.totalColumns}</td>
                      <td className="px-3 py-2 text-center"><MovieBadge count={a.activeMovieCountThisMonth} /></td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-0.5">
                          <button type="button" className={iconBtn} title="Sửa" onClick={() => editHall(a)}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" className={`${iconBtn} hover:!text-red-400`} title="Xóa" onClick={() => setDeleteTarget({ type: 'hall', item: a })}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(hallCinema.auditoriums ?? []).length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">Rạp chưa có phòng chiếu nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3 space-y-3">
              <div className="text-xs font-semibold text-zinc-200">
                {hallForm.id ? 'Sửa phòng chiếu' : 'Thêm phòng chiếu mới'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Tên phòng *">
                  <input className={inputCls} placeholder="Phòng 1, IMAX..." value={hallForm.name} onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })} />
                </Field>
                <Field label="Định dạng">
                  <select className={inputCls} value={hallForm.hallType} onChange={(e) => setHallForm({ ...hallForm, hallType: e.target.value })}>
                    {HALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Số hàng ghế (1-26)">
                  <input type="number" min="1" max="26" className={inputCls} value={hallForm.totalRows} onChange={(e) => setHallForm({ ...hallForm, totalRows: e.target.value })} />
                </Field>
                <Field label="Số cột ghế (1-30)">
                  <input type="number" min="1" max="30" className={inputCls} value={hallForm.totalColumns} onChange={(e) => setHallForm({ ...hallForm, totalColumns: e.target.value })} />
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                {hallForm.id && (
                  <button type="button" className={btnGhost} disabled={isSaving} onClick={() => setHallForm(EMPTY_HALL)}>Hủy sửa</button>
                )}
                <button type="button" className={btnPrimary} disabled={isSaving} onClick={saveHall}>
                  {isSaving ? 'Đang lưu...' : hallForm.id ? 'Cập nhật phòng' : 'Thêm phòng'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminModal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'cinema' ? 'Xác nhận xóa cụm rạp' : 'Xác nhận xóa phòng chiếu'}
        message={deleteMessage}
        confirmText={isDeleting ? 'Đang xóa...' : 'Đồng ý xóa'}
        type="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}