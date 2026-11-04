import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, RefreshCw, Pencil, Trash2, Film, X, ChevronLeft,
  ChevronRight, SlidersHorizontal, CalendarDays, Clock3, Star,
  Image as ImageIcon, AlertCircle, LoaderCircle, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import useMovies from '../../api/useMovies';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'now_showing', label: 'Đang chiếu' },
  { value: 'coming_soon', label: 'Sắp chiếu' },
];
const SORT_OPTIONS = [
    { value: 'latest', label: 'Ngày phát hành mới nhất' },
  { value: 'rating', label: 'Điểm đánh giá cao' },
  { value: 'title', label: 'Tên phim A–Z' },
];
const EMPTY_FORM = {
  title: '', originalTitle: '', overview: '', durationMin: '120',
  ageRating: 'T13', status: 'coming_soon', posterUrl: '', backdropUrl: '',
  trailerUrl: '', releaseDate: '', ratingScore: '', genreIds: [], actors: [],
};

const inputClass = 'mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15';
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-slate-400';

function unwrapList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.Items)) return value.Items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.data?.Items)) return value.data.Items;
  return [];
}
function pageData(value) {
  const root = value?.data && !Array.isArray(value.data) ? value.data : value;
  return {
    items: unwrapList(root),
    totalItems: Number(root?.totalItems ?? root?.TotalItems ?? unwrapList(root).length),
    totalPages: Number(root?.totalPages ?? root?.TotalPages ?? 1),
  };
}
const idOf = (item) => item?.id ?? item?.Id ?? '';
const nameOf = (item) => item?.name ?? item?.Name ?? '';
const valueOf = (item, lower, upper = lower[0].toUpperCase() + lower.slice(1)) => item?.[lower] ?? item?.[upper];
const text = (value) => value == null ? '' : String(value);
const dateInput = (value) => value ? String(value).slice(0, 10) : '';
const errorText = (error) => error?.response?.data?.message || error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';

function Field({ label, children, className = '' }) {
  return <label className={`block min-w-0 ${className}`}><span className={labelClass}>{label}</span>{children}</label>;
}
function ModalShell({ title, eyebrow, onClose, children, wide = false }) {
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className={`my-auto w-full ${wide ? 'max-w-4xl' : 'max-w-md'} overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50`}>
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">{eyebrow}</p><h2 className="mt-1 text-xl font-bold text-white">{title}</h2></div>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Đóng"><X size={20} /></button>
      </header>
      {children}
    </section>
  </div>;
}

function MovieModal({ movie, genres, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(movie);

  useEffect(() => {
    if (!movie) {
      setForm({ ...EMPTY_FORM, actors: [] });
      return;
    }
    const movieGenres = valueOf(movie, 'genres') || [];
    const selectedGenreIds = genres.filter((genre) =>
      movieGenres.some((entry) => (typeof entry === 'string' ? entry : nameOf(entry)).toLowerCase() === nameOf(genre).toLowerCase())
    ).map(idOf);
    const actors = valueOf(movie, 'actors') || [];
    setForm({
      title: text(valueOf(movie, 'title')), originalTitle: text(valueOf(movie, 'originalTitle')),
      overview: text(valueOf(movie, 'overview')), durationMin: text(valueOf(movie, 'durationMin') ?? 120),
      ageRating: text(valueOf(movie, 'ageRating') || 'T13'), status: text(valueOf(movie, 'status') || 'coming_soon'),
      posterUrl: text(valueOf(movie, 'posterUrl')), backdropUrl: text(valueOf(movie, 'backdropUrl')),
      trailerUrl: text(valueOf(movie, 'trailerUrl')), releaseDate: dateInput(valueOf(movie, 'releaseDate')),
      ratingScore: text(valueOf(movie, 'ratingScore')),
      genreIds: selectedGenreIds,
      actors: actors.map((actor) => ({
        actorId: text(valueOf(actor, 'actorId')), characterName: text(valueOf(actor, 'characterName')),
        name: text(valueOf(actor, 'name')), profilePath: text(valueOf(actor, 'profilePath')),
      })),
    });
  }, [movie, genres]);

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateActor = (index, key, value) => setForm((current) => ({
    ...current, actors: current.actors.map((actor, i) => i === index ? { ...actor, [key]: value } : actor),
  }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return toast.error('Vui lòng nhập tên phim.');
    if (!Number.isFinite(Number(form.durationMin)) || Number(form.durationMin) <= 0) return toast.error('Thời lượng phải lớn hơn 0 phút.');
    if (!form.genreIds.length) return toast.error('Vui lòng chọn ít nhất một thể loại.');
    if (form.ratingScore !== '' && (Number(form.ratingScore) < 0 || Number(form.ratingScore) > 10)) return toast.error('Điểm đánh giá phải từ 0 đến 10.');
    const actorsToSave = form.actors.filter((actor) =>
      actor.name.trim() || actor.profilePath.trim() ||
      actor.characterName.trim() || actor.actorId.trim()
    );
    if (actorsToSave.some((actor) => !actor.name.trim())) {
      return toast.error('Vui lòng nhập tên cho từng diễn viên.');
    }
    const payload = {
      title: form.title.trim(), originalTitle: form.originalTitle.trim() || null,
      overview: form.overview.trim() || null, durationMin: Number(form.durationMin),
      ageRating: form.ageRating || null, status: form.status,
      posterUrl: form.posterUrl.trim() || null, backdropUrl: form.backdropUrl.trim() || null,
      trailerUrl: form.trailerUrl.trim() || null, releaseDate: form.releaseDate || null,
      ratingScore: form.ratingScore === '' ? null : Number(form.ratingScore),
      genreIds: form.genreIds,
      actors: actorsToSave.map((actor) => ({
        actorId: actor.actorId.trim() || null,
        name: actor.name.trim(),
        profilePath: actor.profilePath.trim() || null,
        characterName: actor.characterName.trim() || null,
      })),
      // Không gửi directorIds vì biểu mẫu không chỉnh sửa đạo diễn.
    };
    setSaving(true);
    try { await onSave(payload); } finally { setSaving(false); }
  };

  return <ModalShell title={isEdit ? 'Chỉnh sửa phim' : 'Thêm phim mới'} eyebrow={isEdit ? 'Cập nhật dữ liệu' : 'Thư viện điện ảnh'} onClose={() => !saving && onClose()} wide>
    <form onSubmit={submit} className="max-h-[calc(100vh-150px)] space-y-6 overflow-y-auto p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên phim *"><input className={inputClass} value={form.title} onChange={(e) => setValue('title', e.target.value)} required maxLength={200} placeholder="Tên phim" /></Field>
        <Field label="Tên gốc"><input className={inputClass} value={form.originalTitle} onChange={(e) => setValue('originalTitle', e.target.value)} placeholder="Original title" /></Field>
        <Field label="Thời lượng (phút) *"><input className={inputClass} type="number" min="1" max="600" value={form.durationMin} onChange={(e) => setValue('durationMin', e.target.value)} required /></Field>
        <Field label="Phân loại độ tuổi"><select className={inputClass} value={form.ageRating} onChange={(e) => setValue('ageRating', e.target.value)}><option value="P">P — Phổ biến</option><option value="K">K</option><option value="T13">T13</option><option value="T16">T16</option><option value="T18">T18</option><option value="C">C</option></select></Field>
        <Field label="Trạng thái"><select className={inputClass} value={form.status} onChange={(e) => setValue('status', e.target.value)}><option value="coming_soon">Sắp chiếu</option><option value="now_showing">Đang chiếu</option></select></Field>
        <Field label="Ngày phát hành"><input className={inputClass} type="date" value={form.releaseDate} onChange={(e) => setValue('releaseDate', e.target.value)} /></Field>
        <Field label="Điểm đánh giá (0–10)"><input className={inputClass} type="number" min="0" max="10" step="0.1" value={form.ratingScore} onChange={(e) => setValue('ratingScore', e.target.value)} placeholder="8.5" /></Field>
        <Field label="URL poster"><input className={inputClass} type="url" value={form.posterUrl} onChange={(e) => setValue('posterUrl', e.target.value)} placeholder="https://..." /></Field>
        <Field label="URL ảnh nền" className="sm:col-span-2"><input className={inputClass} type="url" value={form.backdropUrl} onChange={(e) => setValue('backdropUrl', e.target.value)} placeholder="https://..." /></Field>
        <Field label="URL trailer" className="sm:col-span-2"><input className={inputClass} type="url" value={form.trailerUrl} onChange={(e) => setValue('trailerUrl', e.target.value)} placeholder="https://..." /></Field>
        <Field label="Nội dung phim" className="sm:col-span-2"><textarea className={`${inputClass} min-h-28 resize-y`} value={form.overview} onChange={(e) => setValue('overview', e.target.value)} rows={4} placeholder="Tóm tắt nội dung phim..." /></Field>
      </div>
      <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold text-white">Thể loại *</h3><p className="mt-1 text-xs text-slate-500">Chọn một hoặc nhiều thể loại.</p></div><span className="rounded-full bg-violet-400/10 px-2.5 py-1 text-xs text-violet-200">{form.genreIds.length} đã chọn</span></div>
        {!genres.length ? <p className="text-sm text-amber-300">Không tải được danh sách thể loại từ API.</p> : <div className="flex flex-wrap gap-2">{genres.map((genre) => {
          const id = idOf(genre); const checked = form.genreIds.includes(id);
          return <button key={id} type="button" onClick={() => setValue('genreIds', checked ? form.genreIds.filter((x) => x !== id) : [...form.genreIds, id])} className={`rounded-full border px-3 py-1.5 text-sm transition ${checked ? 'border-violet-300 bg-violet-400/15 text-violet-100' : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-white'}`}>{checked ? '✓ ' : '+ '}{nameOf(genre)}</button>;
        })}</div>}
      </section>
      <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-violet-300" />
            <div>
              <h3 className="font-semibold text-white">Diễn viên</h3>
              <p className="mt-1 text-xs text-slate-500">
                Nhập tên, link ảnh đại diện và vai diễn. Diễn viên đã tồn tại sẽ được dùng lại.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValue('actors', [
              ...form.actors,
              { actorId: '', name: '', profilePath: '', characterName: '' }
            ])}
            className="inline-flex items-center gap-1 rounded-lg border border-violet-300/30 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-400/10"
          >
            <Plus size={14} /> Thêm diễn viên
          </button>
        </div>

        {!form.actors.length && (
          <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-500">
            Chưa có diễn viên. Bấm “Thêm diễn viên” để nhập thông tin.
          </p>
        )}

        <div className="space-y-3">
          {form.actors.map((actor, index) => (
            <div
                  key={actor.actorId || index}
              className="grid gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1fr_auto]"
            >
              <Field label="Tên diễn viên *">
                <input
                  className={inputClass}
                  value={actor.name}
                  onChange={(e) => updateActor(index, 'name', e.target.value)}
                  placeholder="Họ tên diễn viên"
                />
              </Field>

              <Field label="Link ảnh đại diện">
                <input
                  className={inputClass}
                  value={actor.profilePath}
                  onChange={(e) => updateActor(index, 'profilePath', e.target.value)}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Vai diễn">
                <input
                  className={inputClass}
                  value={actor.characterName}
                  onChange={(e) => updateActor(index, 'characterName', e.target.value)}
                  placeholder="Tên nhân vật"
                />
              </Field>

              <button
                type="button"
                onClick={() => setValue('actors', form.actors.filter((_, i) => i !== index))}
                className="self-end rounded-lg p-2.5 text-rose-300 hover:bg-rose-400/10"
                aria-label="Xóa diễn viên"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      </section>
      <footer className="flex flex-col-reverse gap-3 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50">Hủy</button>
        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400 disabled:opacity-60">{saving && <LoaderCircle size={16} className="animate-spin" />}{isEdit ? 'Lưu thay đổi' : 'Tạo phim'}</button>
      </footer>
    </form>
  </ModalShell>;
}

function DeleteModal({ movie, onClose, onConfirm, deleting }) {
  if (!movie) return null;
  return <ModalShell title="Xóa phim?" eyebrow="Xác nhận thao tác" onClose={onClose}>
    <div className="p-5 sm:p-6"><div className="flex gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4"><AlertCircle className="mt-0.5 shrink-0 text-rose-300" size={21} /><p className="text-sm leading-6 text-slate-300">Bạn sắp xóa <strong className="text-white">{valueOf(movie, 'title')}</strong>. Phim sẽ được xóa mềm thông qua API. Bạn có chắc muốn tiếp tục?</p></div>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={onClose} disabled={deleting} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5">Hủy</button><button onClick={onConfirm} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-400 disabled:opacity-60">{deleting && <LoaderCircle size={16} className="animate-spin" />}Xác nhận xóa</button></div>
    </div>
  </ModalShell>;
}

export default function AdminMovies() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [genre, setGenre] = useState('all');
  const [city, setCity] = useState('all');
  const [cinemaId, setCinemaId] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [modalMovie, setModalMovie] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteMovie, setDeleteMovie] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState('movies');
  const [genreName, setGenreName] = useState('');
  const [editingGenre, setEditingGenre] = useState(null);
  const [genreToDelete, setGenreToDelete] = useState(null);
  const [savingGenre, setSavingGenre] = useState(false);
  const [deletingGenre, setDeletingGenre] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadLookups = useCallback(async () => {
    const [genreResult, cinemaResult] = await Promise.allSettled([useMovies.getGenres(), useMovies.getCinemas()]);
    if (genreResult.status === 'fulfilled') setGenres(unwrapList(genreResult.value));
    else toast.error(`Không tải được thể loại: ${errorText(genreResult.reason)}`);
    if (cinemaResult.status === 'fulfilled') setCinemas(unwrapList(cinemaResult.value));
    else toast.error(`Không tải được rạp: ${errorText(cinemaResult.reason)}`);
  }, []);

  const loadMovies = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const response = await useMovies.getAllMovies({
        status: status === 'all' ? undefined : status,
        search: search || undefined,
        genre: genre === 'all' ? undefined : genre,
        city: city === 'all' ? undefined : city,
        cinemaId: cinemaId === 'all' ? undefined : cinemaId,
        sortBy, page, pageSize,
      });
      const result = pageData(response);
      setMovies(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(Math.max(1, result.totalPages));
      if (page > Math.max(1, result.totalPages)) setPage(Math.max(1, result.totalPages));
    } catch (error) {
      setMovies([]); setTotalItems(0); setTotalPages(1);
      setLoadError(errorText(error));
    } finally { setLoading(false); }
  }, [status, search, genre, city, cinemaId, sortBy, page, pageSize, reloadKey]);

  useEffect(() => { loadLookups(); }, [loadLookups]);
  useEffect(() => { loadMovies(); }, [loadMovies]);

  const cityOptions = useMemo(() => [...new Set(cinemas.map((item) => text(valueOf(item, 'city')).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')), [cinemas]);
    const filteredCinemas = useMemo(
        () =>
            cinemas.filter(
                (item) =>
                    city === 'all' ||
                    text(valueOf(item, 'city')).trim().localeCompare(
                        city,
                        'vi',
                        { sensitivity: 'accent' }
                    ) === 0
            ),
        [cinemas, city]
    );
  const resetFilters = () => {
    setSearchInput(''); setSearch(''); setStatus('all'); setGenre('all');
    setCity('all'); setCinemaId('all'); setSortBy('latest'); setPage(1);
  };
  const refresh = () => { setReloadKey((key) => key + 1); loadLookups(); };

  const saveMovie = async (payload) => {
    try {
      if (modalMovie) {
        await useMovies.updateMovie(idOf(modalMovie), payload);
        toast.success('Đã cập nhật phim.');
      } else {
        await useMovies.createMovie(payload);
        toast.success('Đã thêm phim mới.');
      }
      setCreateOpen(false); setModalMovie(null); setReloadKey((key) => key + 1);
    } catch (error) { toast.error(errorText(error)); }
  };

  const confirmDelete = async () => {
    if (!deleteMovie) return;
    setDeleting(true);
    try {
      await useMovies.deleteMovie(idOf(deleteMovie));
      toast.success('Đã xóa phim.');
      setDeleteMovie(null);
      setReloadKey((key) => key + 1);
    } catch (error) { toast.error(errorText(error)); }
    finally { setDeleting(false); }
  };

  const saveGenre = async (event) => {
    event.preventDefault();
    const normalizedName = genreName.trim();

    if (!normalizedName) {
      toast.error('Vui lòng nhập tên thể loại.');
      return;
    }

    setSavingGenre(true);
    try {
      if (editingGenre) {
        await useMovies.updateGenre(idOf(editingGenre), { name: normalizedName });
        toast.success('Đã cập nhật thể loại.');
      } else {
        await useMovies.createGenre({ name: normalizedName });
        toast.success('Đã thêm thể loại mới.');
      }

      setGenreName('');
      setEditingGenre(null);
      await loadLookups();
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSavingGenre(false);
    }
  };

  const confirmDeleteGenre = async () => {
    if (!genreToDelete) return;

    setDeletingGenre(true);
    try {
      await useMovies.deleteGenre(idOf(genreToDelete));
      toast.success('Đã xóa thể loại.');
      setGenreToDelete(null);
      if (editingGenre && idOf(editingGenre) === idOf(genreToDelete)) {
        setEditingGenre(null);
        setGenreName('');
      }
      await loadLookups();
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setDeletingGenre(false);
    }
  };

  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return <main className="min-h-screen bg-[#080d1a] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
  <div>
    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-violet-300">
      <Film size={15} /> Cinema Admin / Catalog
    </div>
    <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
      {activeTab === 'movies' ? 'Quản lý phim' : 'Quản lý thể loại'}
    </h1>
    <p className="mt-2 max-w-2xl text-sm text-slate-400">
      Quản lý danh mục phim và thể loại trong cùng một giao diện.
    </p>
  </div>
  <div className="flex flex-wrap gap-2">
    <button onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[.08]">
      <RefreshCw size={16} /> Làm mới
    </button>
    {activeTab === 'movies' && (
      <button onClick={() => { setModalMovie(null); setCreateOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400">
        <Plus size={17} /> Thêm phim
      </button>
    )}
  </div>
</header>

<nav className="flex gap-2 rounded-2xl border border-white/[.08] bg-slate-900/60 p-1.5" aria-label="Danh mục quản lý">
  <button type="button" onClick={() => setActiveTab('movies')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeTab === 'movies' ? 'bg-violet-500 text-white shadow-lg shadow-violet-950/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
    <Film size={16} /> Quản lý phim
  </button>
  <button type="button" onClick={() => setActiveTab('genres')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeTab === 'genres' ? 'bg-violet-500 text-white shadow-lg shadow-violet-950/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
    <SlidersHorizontal size={16} /> Quản lý thể loại
    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{genres.length}</span>
  </button>
</nav>

            {activeTab === 'movies' && <>
      <section className="rounded-2xl border border-white/[.08] bg-slate-900/70 p-4 shadow-xl shadow-black/10 sm:p-5">
        <div className="mb-4 flex items-center gap-2"><SlidersHorizontal size={17} className="text-violet-300" /><h2 className="text-sm font-bold text-white">Bộ lọc nâng cao</h2><span className="text-xs text-slate-500">Tìm kiếm và thu hẹp kết quả</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="sm:col-span-2"><span className={labelClass}>Tìm theo tên phim</span><span className="relative mt-1.5 block"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input className={`${inputClass} mt-0 pl-10`} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Nhập tên phim..." /></span></label>
          <Field label="Trạng thái"><select className={inputClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          <Field label="Thể loại"><select className={inputClass} value={genre} onChange={(e) => { setGenre(e.target.value); setPage(1); }}><option value="all">Tất cả thể loại</option>{genres.map((item) => <option key={idOf(item)} value={nameOf(item)}>{nameOf(item)}</option>)}</select></Field>
          <Field label="Tỉnh / thành phố"><select className={inputClass} value={city} onChange={(e) => { setCity(e.target.value); setCinemaId('all'); setPage(1); }}><option value="all">Tất cả tỉnh / thành</option>{cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
          <Field label="Rạp chiếu phim"><select className={inputClass} value={cinemaId} onChange={(e) => { setCinemaId(e.target.value); setPage(1); }}><option value="all">Tất cả rạp</option>{filteredCinemas.map((item) => <option key={idOf(item)} value={idOf(item)}>{nameOf(item)}</option>)}</select></Field>
          <Field label="Sắp xếp theo"><select className={inputClass} value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          <div className="flex items-end"><button onClick={resetFilters} className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[.06]">Đặt lại bộ lọc</button></div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[.08] bg-slate-900/70 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-2 border-b border-white/[.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="font-bold text-white">Danh sách phim</h2><p className="mt-1 text-xs text-slate-500">{totalItems.toLocaleString('vi-VN')} phim trong kết quả</p></div><label className="flex items-center gap-2 text-xs text-slate-400">Hiển thị <select className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm text-white outline-none" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select> dòng</label></div>

        {loadError && <div className="m-4 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-200"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div className="flex-1"><p className="font-semibold">Không tải được danh sách phim</p><p className="mt-1 text-rose-200/80">{loadError}</p></div><button onClick={refresh} className="font-semibold underline">Thử lại</button></div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead><tr className="border-b border-white/[.08] bg-white/[.025] text-[11px] uppercase tracking-wider text-slate-500"><th className="px-5 py-3.5 font-semibold">Phim</th><th className="px-4 py-3.5 font-semibold">Thời lượng / độ tuổi</th><th className="px-4 py-3.5 font-semibold">Thể loại</th><th className="px-4 py-3.5 font-semibold">Trạng thái</th><th className="px-4 py-3.5 font-semibold">Đánh giá</th><th className="px-4 py-3.5 font-semibold">Phát hành</th><th className="px-5 py-3.5 text-right font-semibold">Thao tác</th></tr></thead>
            <tbody className="divide-y divide-white/[.06]">
              {loading ? <tr><td colSpan="7" className="px-5 py-16 text-center"><LoaderCircle className="mx-auto animate-spin text-violet-300" size={26} /><p className="mt-3 text-sm text-slate-400">Đang tải dữ liệu phim...</p></td></tr>
              : movies.length === 0 ? <tr><td colSpan="7" className="px-5 py-16 text-center"><Film className="mx-auto text-slate-600" size={32} /><p className="mt-3 font-semibold text-slate-300">Không tìm thấy phim</p><p className="mt-1 text-sm text-slate-500">Thử thay đổi bộ lọc hoặc thêm phim mới.</p><button onClick={resetFilters} className="mt-4 text-sm font-semibold text-violet-300 hover:text-violet-200">Xóa bộ lọc</button></td></tr>
              : movies.map((movie) => {
                const id = idOf(movie);
                const title = text(valueOf(movie, 'title') || 'Chưa có tên');
                const originalTitle = text(valueOf(movie, 'originalTitle'));
                const poster = valueOf(movie, 'posterUrl');
                const movieGenres = valueOf(movie, 'genres') || [];
                const movieStatus = valueOf(movie, 'status');
                const score = valueOf(movie, 'ratingScore');
                const release = valueOf(movie, 'releaseDate');
                return <tr key={id} className="transition hover:bg-white/[.025]">
                  <td className="px-5 py-4"><div className="flex min-w-[250px] items-center gap-3"><div className="h-[76px] w-[54px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950">{poster ? <img src={poster} alt={`Poster ${title}`} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <div className="flex h-full items-center justify-center text-slate-600"><ImageIcon size={20} /></div>}</div><div className="min-w-0"><p className="max-w-[280px] truncate font-bold text-white" title={title}>{title}</p>{originalTitle && <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500" title={originalTitle}>{originalTitle}</p>}<p className="mt-2 text-[11px] text-slate-600">ID: {id ? `${String(id).slice(0, 8)}…` : '—'}</p></div></div></td>
                  <td className="px-4 py-4"><div className="flex items-center gap-1.5 text-sm text-slate-300"><Clock3 size={14} className="text-slate-500" />{valueOf(movie, 'durationMin') ?? '—'} phút</div><span className="mt-2 inline-flex rounded-md border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-400">{valueOf(movie, 'ageRating') || 'Chưa phân loại'}</span></td>
                  <td className="px-4 py-4"><div className="flex max-w-[210px] flex-wrap gap-1.5">{movieGenres.length ? movieGenres.slice(0, 3).map((item, index) => <span key={`${typeof item === 'string' ? item : nameOf(item)}-${index}`} className="rounded-md border border-violet-300/15 bg-violet-400/[.07] px-2 py-1 text-[11px] text-violet-200">{typeof item === 'string' ? item : nameOf(item)}</span>) : <span className="text-xs text-slate-600">Chưa phân loại</span>}{movieGenres.length > 3 && <span className="text-[11px] text-slate-500">+{movieGenres.length - 3}</span>}</div></td>
                  <td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset ${movieStatus === 'now_showing' ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20' : 'bg-amber-400/10 text-amber-300 ring-amber-400/20'}`}><span className={`mr-1.5 mt-1 h-1.5 w-1.5 rounded-full ${movieStatus === 'now_showing' ? 'bg-emerald-300' : 'bg-amber-300'}`} />{movieStatus === 'now_showing' ? 'Đang chiếu' : movieStatus === 'coming_soon' ? 'Sắp chiếu' : movieStatus || 'Chưa xác định'}</span></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 font-bold text-amber-300"><Star size={14} fill="currentColor" />{score == null || score === '' ? '—' : Number(score).toFixed(1)}<span className="text-xs font-normal text-slate-600">/10</span></span></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-400"><CalendarDays size={14} />{release ? new Date(`${dateInput(release)}T00:00:00`).toLocaleDateString('vi-VN') : '—'}</span></td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => { setCreateOpen(false); setModalMovie(movie); }} title="Chỉnh sửa phim" aria-label={`Chỉnh sửa ${title}`} className="rounded-lg border border-white/10 p-2.5 text-slate-400 transition hover:border-violet-300/30 hover:bg-violet-400/10 hover:text-violet-200"><Pencil size={16} /></button><button onClick={() => setDeleteMovie(movie)} title="Xóa phim" aria-label={`Xóa ${title}`} className="rounded-lg border border-white/10 p-2.5 text-slate-400 transition hover:border-rose-300/30 hover:bg-rose-400/10 hover:text-rose-200"><Trash2 size={16} /></button></div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col gap-3 border-t border-white/[.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-xs text-slate-500">Hiển thị <strong className="text-slate-300">{firstItem}–{lastItem}</strong> trên <strong className="text-slate-300">{totalItems}</strong> kết quả</p><div className="flex items-center justify-between gap-2 sm:justify-end"><button disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft size={16} /> Trước</button><span className="rounded-lg bg-white/[.05] px-3 py-2 text-xs font-semibold text-slate-300">Trang {page} / {Math.max(1, totalPages)}</span><button disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30">Sau <ChevronRight size={16} /></button></div></footer>
      </section>
            </>}
      {activeTab === 'genres' && (
        <section className="overflow-hidden rounded-2xl border border-white/[.08] bg-slate-900/70 shadow-xl shadow-black/10">
          <div className="border-b border-white/[.08] p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">Movie catalog</p>
                <h2 className="mt-1 text-xl font-black text-white">Danh mục thể loại</h2>
                <p className="mt-1 text-sm text-slate-400">Thêm, đổi tên hoặc xóa thể loại phim.</p>
              </div>
              <div className="rounded-xl border border-violet-300/15 bg-violet-400/5 px-4 py-3">
                <p className="text-xs text-slate-400">Tổng số thể loại</p>
                <p className="mt-1 text-2xl font-black text-violet-200">{genres.length}</p>
              </div>
            </div>
          </div>

          <form onSubmit={saveGenre} className="border-b border-white/[.08] bg-slate-950/30 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label>
                <span className={labelClass}>{editingGenre ? 'Tên thể loại cần cập nhật' : 'Tên thể loại mới'} *</span>
                <input
                  className={`${inputClass} mt-1.5`}
                  value={genreName}
                  onChange={(event) => setGenreName(event.target.value)}
                  placeholder="Ví dụ: Hành động, Hài, Tình cảm..."
                  maxLength={100}
                  required
                />
                <span className="mt-1.5 block text-xs text-slate-500">Tên thể loại không được để trống.</span>
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={savingGenre} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60">
                  {savingGenre ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
                  {savingGenre ? 'Đang lưu...' : editingGenre ? 'Lưu thay đổi' : 'Thêm thể loại'}
                </button>
                {editingGenre && (
                  <button type="button" onClick={() => { setEditingGenre(null); setGenreName(''); }} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5">
                    Hủy
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="border-b border-white/[.06] px-5 py-3 text-xs text-slate-500">
            Danh sách được đồng bộ từ API thể loại.
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left">
              <thead>
                <tr className="border-b border-white/[.08] bg-white/[.025] text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 font-semibold">Tên thể loại</th>
                  <th className="px-5 py-4 font-semibold">Mã định danh</th>
                  <th className="px-5 py-4 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.06]">
                {genres.map((item) => (
                  <tr key={idOf(item)} className="transition hover:bg-white/[.025]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/10 text-sm font-black text-violet-200">
                          {nameOf(item).trim().charAt(0).toUpperCase() || '?'}
                        </span>
                        <span className="font-semibold text-slate-100">{nameOf(item)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{idOf(item) || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" title="Sửa thể loại" onClick={() => { setEditingGenre(item); setGenreName(nameOf(item)); }} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300/20 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-400/10">
                          <Pencil size={14} /> Sửa
                        </button>
                        <button type="button" title="Xóa thể loại" onClick={() => setGenreToDelete(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/10">
                          <Trash2 size={14} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {genres.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
                        <SlidersHorizontal size={22} />
                      </div>
                      <p className="mt-3 font-semibold text-slate-300">Chưa có thể loại nào</p>
                      <p className="mt-1 text-sm text-slate-500">Thêm thể loại đầu tiên bằng biểu mẫu phía trên.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <p className="text-center text-xs text-slate-600">Cinema Booking · Movie Management</p>
    </div>
      {genreToDelete && (
    <ModalShell title="Xóa thể loại?" eyebrow="Xác nhận thao tác" onClose={() => setGenreToDelete(null)}>
      <div className="p-5 sm:p-6">
        <div className="flex gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4">
          <AlertCircle className="mt-0.5 shrink-0 text-rose-300" size={21} />
          <div className="text-sm leading-6 text-slate-300">
            <p>Bạn đang yêu cầu xóa thể loại <strong className="text-white">{nameOf(genreToDelete)}</strong>.</p>
            <p className="mt-1 text-slate-400">Nếu thể loại đang được phim sử dụng, API có thể từ chối thao tác này.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setGenreToDelete(null)} disabled={deletingGenre} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5">
            Hủy
          </button>
          <button type="button" onClick={confirmDeleteGenre} disabled={deletingGenre} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-400 disabled:opacity-60">
            {deletingGenre && <LoaderCircle size={16} className="animate-spin" />}
            Xác nhận xóa
          </button>
        </div>
      </div>
    </ModalShell>
  )}
  {(createOpen || modalMovie) && <MovieModal key={modalMovie ? idOf(modalMovie) : 'create'} movie={modalMovie} genres={genres} onClose={() => { setCreateOpen(false); setModalMovie(null); }} onSave={saveMovie} />}
    {deleteMovie && <DeleteModal movie={deleteMovie} onClose={() => !deleting && setDeleteMovie(null)} onConfirm={confirmDelete} deleting={deleting} />}
  </main>;
}
