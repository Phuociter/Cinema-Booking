import React, { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Film, X, Loader2, RefreshCw } from 'lucide-react';
import { useMovies } from '../../api';

const EMPTY_FORM = {
  title: '',
  originalTitle: '',
  overview: '',
  durationMin: 120,
  ageRating: 'P',
  posterUrl: '',
  backdropUrl: '',
  trailerUrl: '',
  releaseDate: '',
  ratingScore: '',
  status: 'coming_soon',
  genreIds: [],
};

const inputClass =
  'w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-red-500 placeholder:text-slate-500';

const labelClass = 'mb-1.5 block text-xs font-medium text-slate-300';

const getItems = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

const AdminMovies = () => {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [movieResult, genreResult] = await Promise.all([
        useMovies.getAllMovies({ page: 1, pageSize: 100, sortBy: 'latest' }),
        useMovies.getGenres(),
      ]);

      setMovies(getItems(movieResult));
      setGenres(getItems(genreResult));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể tải dữ liệu. Hãy kiểm tra API và quyền quản trị.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setNotice('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (movie) => {
    setEditingId(movie.id);
    setForm({
      title: movie.title || '',
      originalTitle: movie.originalTitle || '',
      overview: movie.overview || '',
      durationMin: movie.durationMin || 120,
      ageRating: movie.ageRating || 'P',
      posterUrl: movie.posterUrl || '',
      backdropUrl: movie.backdropUrl || '',
      trailerUrl: movie.trailerUrl || '',
      releaseDate: movie.releaseDate ? String(movie.releaseDate).slice(0, 10) : '',
      ratingScore: movie.ratingScore ?? '',
      status: movie.status || 'coming_soon',
      genreIds: genres
        .filter((genre) =>
          (movie.genres || []).some((name) =>
            typeof name === 'string'
              ? name === genre.name
              : name?.id === genre.id || name?.name === genre.name
          )
        )
        .map((genre) => genre.id),
    });
    setNotice('');
    setError('');
    setModalOpen(true);
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const toggleGenre = (genreId) => {
    setForm((current) => ({
      ...current,
      genreIds: current.genreIds.includes(genreId)
        ? current.genreIds.filter((id) => id !== genreId)
        : [...current.genreIds, genreId],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      title: form.title.trim(),
      originalTitle: form.originalTitle.trim() || null,
      overview: form.overview.trim() || null,
      durationMin: Number(form.durationMin),
      ageRating: form.ageRating || 'P',
      posterUrl: form.posterUrl.trim() || null,
      backdropUrl: form.backdropUrl.trim() || null,
      trailerUrl: form.trailerUrl.trim() || null,
      releaseDate: form.releaseDate || null,
      ratingScore: form.ratingScore === '' ? null : Number(form.ratingScore),
      status: form.status,
      genreIds: form.genreIds,
      ...(!editingId ? { directorIds: [], actors: [] } : {}),
    };

    try {
      if (editingId) {
        await useMovies.updateMovie(editingId, payload);
        setNotice('Đã cập nhật phim thành công.');
      } else {
        await useMovies.createMovie(payload);
        setNotice('Đã thêm phim thành công.');
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể lưu phim. Kiểm tra quyền Admin và dữ liệu bắt buộc.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (movie) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa phim "${movie.title}"? Phim sẽ được xóa theo cơ chế của API.`
    );

    if (!confirmed) return;

    setError('');
    setNotice('');

    try {
      await useMovies.deleteMovie(movie.id);
      setMovies((current) => current.filter((item) => item.id !== movie.id));
      setNotice(`Đã gửi yêu cầu xóa phim "${movie.title}".`);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể xóa phim. Hãy kiểm tra quyền Admin.'
      );
    }
  };

  const filteredMovies = movies.filter((movie) =>
    (movie.title || '').toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
              <Film size={15} />
              Cinema management
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Quản lý phim
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Thêm, chỉnh sửa và xóa phim trong hệ thống.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-red-500"
            >
              <Plus size={17} />
              Thêm phim
            </button>
          </div>
        </header>

        {notice && (
          <div role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-white">Danh sách phim</h2>
              <p className="mt-1 text-xs text-slate-400">
                {filteredMovies.length} phim phù hợp
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên phim..."
                className={`${inputClass} pl-9`}
                aria-label="Tìm phim theo tên"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-400">
              <Loader2 className="animate-spin" size={20} />
              Đang tải danh sách phim...
            </div>
          ) : filteredMovies.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Film size={34} className="mx-auto mb-3 text-slate-600" />
              <p className="font-medium text-slate-200">
                {search ? 'Không tìm thấy phim phù hợp' : 'Chưa có dữ liệu phim'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {search ? 'Thử từ khóa khác hoặc xóa nội dung tìm kiếm.' : 'Bạn có thể thêm phim mới bằng nút phía trên.'}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-4 text-sm font-medium text-red-400 hover:text-red-300"
                >
                  Xóa tìm kiếm
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Phim</th>
                    <th className="px-4 py-3 font-medium">Thể loại</th>
                    <th className="px-4 py-3 font-medium">Thời lượng</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMovies.map((movie) => (
                    <tr key={movie.id} className="transition hover:bg-white/[0.025]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={movie.posterUrl || '/backgroundImage.png'}
                            alt=""
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = '/backgroundImage.png';
                            }}
                            className="h-14 w-10 rounded-md border border-white/10 bg-slate-800 object-cover"
                          />
                          <div className="max-w-xs">
                            <p className="font-semibold text-slate-100">{movie.title}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {movie.originalTitle || movie.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {Array.isArray(movie.genres) && movie.genres.length
                          ? movie.genres.map((genre) => typeof genre === 'string' ? genre : genre.name).filter(Boolean).join(', ')
                          : 'Chưa phân loại'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {movie.durationMin || '—'} phút
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          movie.status === 'now_showing'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : movie.status === 'coming_soon'
                              ? 'bg-amber-500/10 text-amber-300'
                              : 'bg-slate-700 text-slate-300'
                        }`}>
                          {movie.status === 'now_showing'
                            ? 'Đang chiếu'
                            : movie.status === 'coming_soon'
                              ? 'Sắp chiếu'
                              : movie.status || 'Chưa rõ'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(movie)}
                            title="Sửa phim"
                            aria-label={`Sửa phim ${movie.title}`}
                            className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-blue-300"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(movie)}
                            title="Xóa phim"
                            aria-label={`Xóa phim ${movie.title}`}
                            className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setModalOpen(false);
          }}
        >
          <section className="my-0 w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">{editingId ? 'Chỉnh sửa phim' : 'Thêm phim mới'}</h2>
                <p className="mt-1 text-xs text-slate-400">Các trường có dấu * là bắt buộc.</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Đóng biểu mẫu"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              {error && (
                <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="movie-title">Tên phim *</label>
                  <input id="movie-title" name="title" value={form.title} onChange={updateField} required maxLength={200} className={inputClass} placeholder="Nhập tên phim" />
                </div>

                <div>
                  <label className={labelClass} htmlFor="movie-original-title">Tên gốc</label>
                  <input id="movie-original-title" name="originalTitle" value={form.originalTitle} onChange={updateField} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass} htmlFor="movie-duration">Thời lượng (phút) *</label>
                  <input id="movie-duration" name="durationMin" type="number" min="1" max="600" required value={form.durationMin} onChange={updateField} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass} htmlFor="movie-status">Trạng thái *</label>
                  <select id="movie-status" name="status" value={form.status} onChange={updateField} className={inputClass}>
                    <option value="coming_soon">Sắp chiếu</option>
                    <option value="now_showing">Đang chiếu</option>
                    <option value="ended">Đã kết thúc</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="movie-age-rating">Phân loại độ tuổi</label>
                  <select id="movie-age-rating" name="ageRating" value={form.ageRating} onChange={updateField} className={inputClass}>
                    <option value="P">P</option>
                    <option value="K">K</option>
                    <option value="T13">T13</option>
                    <option value="T16">T16</option>
                    <option value="T18">T18</option>
                    <option value="C">C</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="movie-release-date">Ngày khởi chiếu</label>
                  <input id="movie-release-date" name="releaseDate" type="date" value={form.releaseDate} onChange={updateField} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass} htmlFor="movie-rating">Điểm đánh giá</label>
                  <input id="movie-rating" name="ratingScore" type="number" min="0" max="10" step="0.1" value={form.ratingScore} onChange={updateField} className={inputClass} />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="movie-overview">Mô tả</label>
                  <textarea id="movie-overview" name="overview" value={form.overview} onChange={updateField} rows={4} className={inputClass} placeholder="Nội dung giới thiệu phim..." />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="movie-poster">URL poster</label>
                  <input id="movie-poster" name="posterUrl" type="url" value={form.posterUrl} onChange={updateField} className={inputClass} placeholder="https://..." />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="movie-backdrop">URL backdrop</label>
                  <input id="movie-backdrop" name="backdropUrl" type="url" value={form.backdropUrl} onChange={updateField} className={inputClass} placeholder="https://..." />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="movie-trailer">URL trailer</label>
                  <input id="movie-trailer" name="trailerUrl" type="url" value={form.trailerUrl} onChange={updateField} className={inputClass} placeholder="https://..." />
                </div>
              </div>

              <div>
                <p className={labelClass}>Thể loại</p>
                {genres.length === 0 ? (
                  <p className="text-xs text-amber-300">
                    API chưa trả về thể loại. Bạn vẫn có thể lưu phim; không có thao tác tạo/sửa thể loại ở API hiện tại.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre) => (
                      <label
                        key={genre.id}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                          form.genreIds.includes(genre.id)
                            ? 'border-red-500/50 bg-red-500/10 text-red-200'
                            : 'border-white/10 bg-slate-950 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.genreIds.includes(genre.id)}
                          onChange={() => toggleGenre(genre.id)}
                          className="accent-red-500"
                        />
                        {genre.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo phim'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
};

export default AdminMovies;
