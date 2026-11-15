
import React, { useCallback, useEffect, useState } from 'react';
import {
    Search, Plus, Pencil, Trash2, Film, X, Loader2, RefreshCw,
    Users, ChevronLeft, ChevronRight, UserRound, Save,
} from 'lucide-react';
import { useMovies, useActors } from '../../api';
import { EmptyState, Pagination, TableContainer } from '../../components/admin/ui';

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
    directorIds: [],
    actors: [],
};

const EMPTY_ACTOR_FORM = {
    name: '',
    profilePath: '',
};

const inputClass =
    'w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-primary placeholder:text-zinc-500';

const labelClass = 'mb-1.5 block text-xs font-medium text-zinc-300';

const getItems = (result) => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data?.items)) return result.data.items;
    if (Array.isArray(result?.data)) return result.data;
    return [];
};

const getErrorMessage = (err, fallback) =>
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.message ||
    fallback;

const AdminMovies = () => {
    // Tab
    const [activeTab, setActiveTab] = useState('movies');

    // Movies
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [moviePage, setMoviePage] = useState(1);
    const [moviePageSize, setMoviePageSize] = useState(10);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [modalOpen, setModalOpen] = useState(false);

    // Actors
    const [actors, setActors] = useState([]);
    const [allActors, setAllActors] = useState([]);
    const [actorLoading, setActorLoading] = useState(false);
    const [actorSaving, setActorSaving] = useState(false);
    const [actorSearch, setActorSearch] = useState('');
    const [actorPage, setActorPage] = useState(1);
    const [actorPageSize, setActorPageSize] = useState(50);
    const [actorTotal, setActorTotal] = useState(0);
    const [actorModalOpen, setActorModalOpen] = useState(false);
    const [editingActorId, setEditingActorId] = useState(null);
    const [actorForm, setActorForm] = useState(EMPTY_ACTOR_FORM);

    // Shared messages
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [movieResult, genreResult] = await Promise.all([
                useMovies.getAllMovies({
                    page: 1,
                    pageSize: 100,
                    sortBy: 'latest',
                }),
                useMovies.getGenres(),
            ]);

            setMovies(getItems(movieResult));
            setGenres(getItems(genreResult));
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    'Không thể tải dữ liệu phim. Hãy kiểm tra API và quyền quản trị.'
                )
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const loadActors = useCallback(async () => {
        setActorLoading(true);

        try {
            const result = await useActors.getActors({
                search: actorSearch.trim(),
                page: actorPage,
                pageSize: actorPageSize,
            });

            setActors(getItems(result));
            setActorTotal(
                Number(result?.totalCount ?? result?.data?.totalCount ?? 0)
            );
        } catch (err) {
            setActors([]);
            setActorTotal(0);
            setError(getErrorMessage(err, 'Không thể tải danh sách diễn viên.'));
        } finally {
            setActorLoading(false);
        }
    }, [actorSearch, actorPage, actorPageSize]);

    const loadAllActors = useCallback(async () => {
        try {
            const result = await useActors.getAllActors();
            setAllActors(getItems(result));
        } catch (err) {
            setAllActors([]);
            setError(
                getErrorMessage(err, 'Không thể tải dữ liệu diễn viên để chọn cho phim.')
            );
        }
    }, []);

    useEffect(() => {
        loadData();
        loadAllActors();
    }, [loadData, loadAllActors]);

    useEffect(() => {
        if (activeTab === 'actors') {
            loadActors();
        }
    }, [activeTab, loadActors]);

    // Movie form
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
            releaseDate: movie.releaseDate
                ? String(movie.releaseDate).slice(0, 10)
                : '',
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
            directorIds: Array.isArray(movie.directorIds)
                ? movie.directorIds
                : [],
            actors: (movie.actors || []).map((actor) => ({
                actorId: actor.actorId,
                characterName: actor.characterName || '',
            })),
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

    const addMovieActor = (actorId) => {
        if (!actorId) return;

        setForm((current) => {
            if (current.actors.some((item) => item.actorId === actorId)) {
                return current;
            }

            return {
                ...current,
                actors: [
                    ...current.actors,
                    { actorId, characterName: '' },
                ],
            };
        });
    };

    const updateMovieActor = (actorId, characterName) => {
        setForm((current) => ({
            ...current,
            actors: current.actors.map((item) =>
                item.actorId === actorId
                    ? { ...item, characterName }
                    : item
            ),
        }));
    };

    const removeMovieActor = (actorId) => {
        setForm((current) => ({
            ...current,
            actors: current.actors.filter(
                (item) => item.actorId !== actorId
            ),
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
            ratingScore:
                form.ratingScore === '' ? null : Number(form.ratingScore),
            status: form.status,
            genreIds: form.genreIds,
            directorIds: form.directorIds,
            actors: form.actors,
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
            await loadAllActors();
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    'Không thể lưu phim. Kiểm tra quyền Admin và dữ liệu bắt buộc.'
                )
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (movie) => {
        const confirmed = window.confirm(
            `Bạn có chắc muốn xóa phim "${movie.title}"?`
        );

        if (!confirmed) return;

        setError('');
        setNotice('');

        try {
            await useMovies.deleteMovie(movie.id);
            setMovies((current) =>
                current.filter((item) => item.id !== movie.id)
            );
            setNotice(`Đã gửi yêu cầu xóa phim "${movie.title}".`);
        } catch (err) {
            setError(
                getErrorMessage(err, 'Không thể xóa phim. Hãy kiểm tra quyền Admin.')
            );
        }
    };

    const filteredMovies = movies.filter((movie) =>
        (movie.title || '').toLowerCase().includes(search.trim().toLowerCase())
    );

    const paginatedMovies = filteredMovies.slice(
        (moviePage - 1) * moviePageSize,
        moviePage * moviePageSize
    );

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredMovies.length / moviePageSize));
        if (moviePage > totalPages) setMoviePage(totalPages);
    }, [filteredMovies.length, moviePage, moviePageSize]);

    // Actor form
    const openCreateActor = () => {
        setEditingActorId(null);
        setActorForm({ ...EMPTY_ACTOR_FORM });
        setError('');
        setNotice('');
        setActorModalOpen(true);
    };

    const openEditActor = (actor) => {
        setEditingActorId(actor.id);
        setActorForm({
            name: actor.name || '',
            profilePath: actor.profilePath || '',
        });
        setError('');
        setNotice('');
        setActorModalOpen(true);
    };

    const handleActorSubmit = async (event) => {
        event.preventDefault();

        if (!actorForm.name.trim()) {
            setError('Vui lòng nhập tên diễn viên.');
            return;
        }

        setActorSaving(true);
        setError('');
        setNotice('');

        const payload = {
            name: actorForm.name.trim(),
            profilePath: actorForm.profilePath.trim() || null,
        };

        try {
            if (editingActorId) {
                await useActors.updateActor(editingActorId, payload);
                setNotice('Đã cập nhật diễn viên thành công.');
            } else {
                await useActors.createActor(payload);
                setNotice('Đã thêm diễn viên thành công.');
            }

            setActorModalOpen(false);
            await loadActors();
            await loadAllActors();
        } catch (err) {
            setError(
                getErrorMessage(err, 'Không thể lưu thông tin diễn viên.')
            );
        } finally {
            setActorSaving(false);
        }
    };

    const handleDeleteActor = async (actor) => {
        const confirmed = window.confirm(
            `Bạn có chắc muốn xóa diễn viên "${actor.name}"?`
        );

        if (!confirmed) return;

        setError('');
        setNotice('');

        try {
            await useActors.deleteActor(actor.id);
            setNotice(`Đã xóa diễn viên "${actor.name}".`);
            await loadActors();
            await loadAllActors();
        } catch (err) {
            const status = err?.response?.status;

            if (status === 409) {
                setError(
                    `Không thể xóa "${actor.name}" vì diễn viên đang được liên kết với phim. Hãy gỡ liên kết khỏi phim trước.`
                );
            } else {
                setError(
                    getErrorMessage(err, 'Không thể xóa diễn viên.')
                );
            }
        }
    };

    const actorTotalPages = Math.max(
        1,
        Math.ceil(actorTotal / actorPageSize)
    );

    const changeActorSearch = (value) => {
        setActorSearch(value);
        setActorPage(1);
    };

    return (
        <main className="min-h-screen bg-zinc-950 px-4 py-2 text-white sm:px-6 sm:py-3">
            <div className="mx-auto max-w-7xl space-y-2">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                            <Film size={15} />
                            Cinema management
                        </div>
                        <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                            Quản lý phim và diễn viên
                        </h1>
                        <p className="mt-1 text-xs text-zinc-400">
                            Quản lý danh mục phim, diễn viên và thông tin nhân vật.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (activeTab === 'movies') {
                                loadData();
                            } else {
                                loadActors();
                                loadAllActors();
                            }
                        }}
                        disabled={loading || actorLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={16}
                            className={loading || actorLoading ? 'animate-spin' : ''}
                        />
                        Làm mới
                    </button>
                </header>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-zinc-800">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('movies');
                            setError('');
                            setNotice('');
                        }}
                        className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${activeTab === 'movies'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-zinc-400 hover:text-white'
                            }`}
                    >
                        <Film size={17} />
                        Phim
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                            {movies.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('actors');
                            setError('');
                            setNotice('');
                        }}
                        className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${activeTab === 'actors'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-zinc-400 hover:text-white'
                            }`}
                    >
                        <Users size={17} />
                        Diễn viên
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                            {actorTotal}
                        </span>
                    </button>
                </div>

                {notice && (
                    <div
                        role="status"
                        className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                    >
                        {notice}
                    </div>
                )}

                {error && (
                    <div
                        role="alert"
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                        {error}
                    </div>
                )}

                {/* MOVIES TAB */}
                {activeTab === 'movies' && (
                    <div className="space-y-2">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-zinc-100">
                                    Danh sách phim
                                </h2>
                                <p className="mt-1 text-xs text-zinc-400">
                                    {filteredMovies.length} phim phù hợp
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <div className="relative w-full sm:w-64">
                                    <Search
                                        size={15}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                                    />
                                    <input
                                        value={search}
                                        onChange={(event) => {
                                            setSearch(event.target.value);
                                            setMoviePage(1);
                                        }}
                                        placeholder="Tìm theo tên phim..."
                                        className={`${inputClass} rounded-md py-2 pl-9`}
                                        aria-label="Tìm phim theo tên"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={openCreate}
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                                >
                                    <Plus size={15} />
                                    Thêm phim
                                </button>
                            </div>
                        </div>

                        <TableContainer
                            className="h-[calc(100vh-245px)] min-h-[360px]"
                            isLoading={loading}
                            loadingText="Đang tải danh sách phim..."
                            pagination={
                                <Pagination
                                    page={moviePage}
                                    pageSize={moviePageSize}
                                    total={filteredMovies.length}
                                    itemCount={paginatedMovies.length}
                                    onPageChange={setMoviePage}
                                    onPageSizeChange={(size) => {
                                        setMoviePageSize(size);
                                        setMoviePage(1);
                                    }}
                                    disabled={loading}
                                />
                            }
                        >
                            {filteredMovies.length === 0 && !loading ? (
                                <div className="p-6">
                                    <EmptyState
                                        icon={Film}
                                        title={
                                            search
                                                ? 'Không tìm thấy phim phù hợp'
                                                : 'Chưa có dữ liệu phim'
                                        }
                                        description={
                                            search
                                                ? 'Thử từ khóa khác hoặc xóa nội dung tìm kiếm.'
                                                : 'Bạn có thể thêm phim mới bằng nút phía trên.'
                                        }
                                        action={
                                            search ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSearch('');
                                                        setMoviePage(1);
                                                    }}
                                                    className="text-xs font-medium text-primary hover:brightness-125"
                                                >
                                                    Xóa tìm kiếm
                                                </button>
                                            ) : null
                                        }
                                    />
                                </div>
                            ) : (
                                <table className="w-full min-w-[760px] border-collapse text-left text-xs sm:text-sm">
                                    <thead className="sticky top-0 z-10 select-none border-b border-zinc-800 bg-zinc-900 shadow-sm shadow-black/50">
                                        <tr className="text-xs font-semibold text-zinc-300">
                                            <th className="bg-zinc-900 px-4 py-3">Phim</th>
                                            <th className="bg-zinc-900 px-4 py-3">Thể loại</th>
                                            <th className="bg-zinc-900 px-4 py-3">Thời lượng</th>
                                            <th className="bg-zinc-900 px-4 py-3">Trạng thái</th>
                                            <th className="bg-zinc-900 px-4 py-3 text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {paginatedMovies.map((movie) => (
                                            <tr
                                                key={movie.id}
                                                className="transition-colors hover:bg-zinc-900/50"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={movie.posterUrl || '/backgroundImage.png'}
                                                            alt=""
                                                            onError={(event) => {
                                                                event.currentTarget.onerror = null;
                                                                event.currentTarget.src = '/backgroundImage.png';
                                                            }}
                                                            className="h-14 w-10 rounded-md border border-zinc-800 bg-zinc-800 object-cover"
                                                        />
                                                        <div className="max-w-xs min-w-0">
                                                            <p className="font-medium text-zinc-100">
                                                                {movie.title}
                                                            </p>
                                                            <p className="mt-1 truncate text-xs text-zinc-400">
                                                                {movie.originalTitle || movie.id}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 text-zinc-300">
                                                    {Array.isArray(movie.genres) && movie.genres.length
                                                        ? movie.genres
                                                            .map((genre) =>
                                                                typeof genre === 'string'
                                                                    ? genre
                                                                    : genre.name
                                                            )
                                                            .filter(Boolean)
                                                            .join(', ')
                                                        : 'Chưa phân loại'}
                                                </td>

                                                <td className="px-4 py-3 font-mono text-zinc-200">
                                                    {movie.durationMin || '—'} phút
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${
                                                            movie.status === 'now_showing'
                                                                ? 'bg-emerald-950/40 text-emerald-400'
                                                                : movie.status === 'coming_soon'
                                                                    ? 'bg-amber-950/40 text-amber-400'
                                                                    : 'bg-zinc-800 text-zinc-300'
                                                        }`}
                                                    >
                                                        {movie.status === 'now_showing'
                                                            ? 'Đang chiếu'
                                                            : movie.status === 'coming_soon'
                                                                ? 'Sắp chiếu'
                                                                : movie.status === 'ended' ? 'Đã kết thúc' : movie.status || 'Chưa rõ'}
                                                    </span>
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 text-right">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEdit(movie)}
                                                            title="Sửa phim"
                                                            aria-label={`Sửa phim ${movie.title}`}
                                                            className="inline-flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer"
                                                        >
                                                            <Pencil size={14} />
                                                            Sửa
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(movie)}
                                                            title="Xóa phim"
                                                            aria-label={`Xóa phim ${movie.title}`}
                                                            className="inline-flex items-center gap-1.5 rounded border border-red-950/60 bg-red-950/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-900/30 hover:border-red-800 transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </TableContainer>
                    </div>
                )}

                {/* ACTORS TAB */}
                {activeTab === 'actors' && (
                    <div className="space-y-2">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-zinc-100">
                                    Danh sách diễn viên
                                </h2>
                                <p className="mt-1 text-xs text-zinc-400">
                                    Tổng cộng {actorTotal} diễn viên
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <div className="relative w-full sm:w-64">
                                    <Search
                                        size={15}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                                    />
                                    <input
                                        value={actorSearch}
                                        onChange={(event) => changeActorSearch(event.target.value)}
                                        placeholder="Tìm tên diễn viên..."
                                        className={`${inputClass} rounded-md py-2 pl-9`}
                                        aria-label="Tìm diễn viên"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={openCreateActor}
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                                >
                                    <Plus size={15} />
                                    Thêm diễn viên
                                </button>
                            </div>
                        </div>

                        <TableContainer
                            className="h-[calc(100vh-245px)] min-h-[360px]"
                            isLoading={actorLoading}
                            loadingText="Đang tải danh sách diễn viên..."
                            pagination={
                                <Pagination
                                    page={actorPage}
                                    pageSize={actorPageSize}
                                    total={actorTotal}
                                    itemCount={actors.length}
                                    onPageChange={setActorPage}
                                    onPageSizeChange={(size) => {
                                        setActorPageSize(Math.min(size, 100));
                                        setActorPage(1);
                                    }}
                                    disabled={actorLoading}
                                />
                            }
                        >
                            {actors.length === 0 && !actorLoading ? (
                                <div className="p-6">
                                    <EmptyState
                                        icon={Users}
                                        title={
                                            actorSearch
                                                ? 'Không tìm thấy diễn viên'
                                                : 'Chưa có diễn viên'
                                        }
                                        description="Thêm diễn viên mới để có thể liên kết với phim."
                                    />
                                </div>
                            ) : (
                                <table className="w-full min-w-[600px] border-collapse text-left text-xs sm:text-sm">
                                    <thead className="sticky top-0 z-10 select-none border-b border-zinc-800 bg-zinc-900 shadow-sm shadow-black/50">
                                        <tr className="text-xs font-semibold text-zinc-300">
                                            <th className="bg-zinc-900 px-4 py-3">Diễn viên</th>
                                            <th className="bg-zinc-900 px-4 py-3">Số phim</th>
                                            <th className="bg-zinc-900 px-4 py-3 text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {actors.map((actor) => (
                                            <tr
                                                key={actor.id}
                                                className="transition-colors hover:bg-zinc-900/50"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {actor.profilePath ? (
                                                            <img
                                                                src={actor.profilePath}
                                                                alt=""
                                                                onError={(event) => {
                                                                    event.currentTarget.onerror = null;
                                                                    event.currentTarget.style.display = 'none';
                                                                }}
                                                                className="h-12 w-12 rounded-full border border-zinc-800 bg-zinc-800 object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-800 text-zinc-400">
                                                                <UserRound size={22} />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-zinc-100">
                                                                {actor.name}
                                                            </p>
                                                            <p className="mt-1 truncate text-xs text-zinc-400">
                                                                Mã: <span className="font-mono">{actor.id}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 font-mono text-zinc-200">
                                                    {actor.moviesCount ?? 0} phim
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 text-right">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditActor(actor)}
                                                            title="Sửa diễn viên"
                                                            aria-label={`Sửa diễn viên ${actor.name}`}
                                                            className="inline-flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer"
                                                        >
                                                            <Pencil size={14} />
                                                            Sửa
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteActor(actor)}
                                                            title="Xóa diễn viên"
                                                            aria-label={`Xóa diễn viên ${actor.name}`}
                                                            className="inline-flex items-center gap-1.5 rounded border border-red-950/60 bg-red-950/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-900/30 hover:border-red-800 transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </TableContainer>
                    </div>
                )}
            </div>

            {/* MOVIE MODAL */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:items-center"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !saving
                        ) {
                            setModalOpen(false);
                        }
                    }}
                >
                    <section className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-slate-900 shadow-2xl">
                        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                            <div>
                                <h2 className="text-lg font-bold">
                                    {editingId ? 'Chỉnh sửa phim' : 'Thêm phim mới'}
                                </h2>
                                <p className="mt-1 text-xs text-zinc-400">
                                    Các trường có dấu * là bắt buộc.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                aria-label="Đóng biểu mẫu"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-5 p-5">
                            {error && (
                                <div
                                    role="alert"
                                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                                >
                                    {error}
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className={labelClass} htmlFor="movie-title">
                                        Tên phim *
                                    </label>
                                    <input
                                        id="movie-title"
                                        name="title"
                                        value={form.title}
                                        onChange={updateField}
                                        required
                                        maxLength={200}
                                        className={inputClass}
                                        placeholder="Nhập tên phim"
                                    />
                                </div>

                                <div>
                                    <label className={labelClass} htmlFor="movie-original-title">
                                        Tên gốc
                                    </label>
                                    <input
                                        id="movie-original-title"
                                        name="originalTitle"
                                        value={form.originalTitle}
                                        onChange={updateField}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass} htmlFor="movie-duration">
                                        Thời lượng (phút) *
                                    </label>
                                    <input
                                        id="movie-duration"
                                        name="durationMin"
                                        type="number"
                                        min="1"
                                        max="600"
                                        required
                                        value={form.durationMin}
                                        onChange={updateField}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass} htmlFor="movie-status">
                                        Trạng thái *
                                    </label>
                                    <select
                                        id="movie-status"
                                        name="status"
                                        value={form.status}
                                        onChange={updateField}
                                        className={inputClass}
                                    >
                                        <option value="coming_soon">Sắp chiếu</option>
                                        <option value="now_showing">Đang chiếu</option>
                                        <option value="ended">Đã kết thúc</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass} htmlFor="movie-age-rating">
                                        Phân loại độ tuổi
                                    </label>
                                    <select
                                        id="movie-age-rating"
                                        name="ageRating"
                                        value={form.ageRating}
                                        onChange={updateField}
                                        className={inputClass}
                                    >
                                        <option value="P">P</option>
                                        <option value="K">K</option>
                                        <option value="T13">T13</option>
                                        <option value="T16">T16</option>
                                        <option value="T18">T18</option>
                                        <option value="C">C</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass} htmlFor="movie-release-date">
                                        Ngày khởi chiếu
                                    </label>
                                    <input
                                        id="movie-release-date"
                                        name="releaseDate"
                                        type="date"
                                        value={form.releaseDate}
                                        onChange={updateField}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass} htmlFor="movie-rating">
                                        Điểm đánh giá
                                    </label>
                                    <input
                                        id="movie-rating"
                                        name="ratingScore"
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={form.ratingScore}
                                        onChange={updateField}
                                        className={inputClass}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelClass} htmlFor="movie-overview">
                                        Mô tả
                                    </label>
                                    <textarea
                                        id="movie-overview"
                                        name="overview"
                                        value={form.overview}
                                        onChange={updateField}
                                        rows={4}
                                        className={inputClass}
                                        placeholder="Nội dung giới thiệu phim..."
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelClass} htmlFor="movie-poster">
                                        URL poster
                                    </label>
                                    <input
                                        id="movie-poster"
                                        name="posterUrl"
                                        type="url"
                                        value={form.posterUrl}
                                        onChange={updateField}
                                        className={inputClass}
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelClass} htmlFor="movie-backdrop">
                                        URL backdrop
                                    </label>
                                    <input
                                        id="movie-backdrop"
                                        name="backdropUrl"
                                        type="url"
                                        value={form.backdropUrl}
                                        onChange={updateField}
                                        className={inputClass}
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelClass} htmlFor="movie-trailer">
                                        URL trailer
                                    </label>
                                    <input
                                        id="movie-trailer"
                                        name="trailerUrl"
                                        type="url"
                                        value={form.trailerUrl}
                                        onChange={updateField}
                                        className={inputClass}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            {/* Genres */}
                            <div>
                                <p className={labelClass}>Thể loại</p>
                                {genres.length === 0 ? (
                                    <p className="text-xs text-amber-300">
                                        API chưa trả về thể loại. Bạn vẫn có thể lưu phim.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {genres.map((genre) => (
                                            <label
                                                key={genre.id}
                                                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${form.genreIds.includes(genre.id)
                                                        ? 'border-red-500/50 bg-red-500/10 text-red-200'
                                                        : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
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

                            {/* Actors in movie */}
                            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-white">
                                            Diễn viên tham gia
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-400">
                                            Chọn diễn viên và nhập tên nhân vật trong phim.
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300">
                                        {form.actors.length} diễn viên
                                    </span>
                                </div>

                                <select
                                    value=""
                                    onChange={(event) => {
                                        addMovieActor(event.target.value);
                                        event.target.value = '';
                                    }}
                                    className={inputClass}
                                >
                                    <option value="">+ Chọn diễn viên để thêm</option>
                                    {allActors
                                        .filter(
                                            (actor) =>
                                                !form.actors.some(
                                                    (selected) => selected.actorId === actor.id
                                                )
                                        )
                                        .map((actor) => (
                                            <option key={actor.id} value={actor.id}>
                                                {actor.name}
                                            </option>
                                        ))}
                                </select>

                                {allActors.length === 0 && (
                                    <p className="text-xs text-amber-300">
                                        Chưa có dữ liệu diễn viên. Hãy tạo diễn viên ở tab Diễn viên trước.
                                    </p>
                                )}

                                {form.actors.length > 0 ? (
                                    <div className="space-y-2">
                                        {form.actors.map((item) => {
                                            const actor = allActors.find(
                                                (candidate) => candidate.id === item.actorId
                                            );

                                            return (
                                                <div
                                                    key={item.actorId}
                                                    className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-slate-900 p-3 sm:flex-row sm:items-center"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="mb-1 text-sm font-medium text-slate-200">
                                                            {actor?.name || 'Diễn viên đã liên kết'}
                                                        </p>
                                                        <input
                                                            value={item.characterName}
                                                            onChange={(event) =>
                                                                updateMovieActor(
                                                                    item.actorId,
                                                                    event.target.value
                                                                )
                                                            }
                                                            maxLength={150}
                                                            placeholder="Tên nhân vật (ví dụ: Peter Parker)"
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMovieActor(item.actorId)}
                                                        title="Gỡ diễn viên khỏi phim"
                                                        className="self-end rounded-lg border border-red-500/20 p-2 text-red-300 transition hover:brightness-110/10 sm:self-center"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="rounded-lg border border-dashed border-zinc-800 py-5 text-center text-xs text-zinc-500">
                                        Chưa chọn diễn viên cho phim này.
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col-reverse gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => setModalOpen(false)}
                                    className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving && (
                                        <Loader2 size={16} className="animate-spin" />
                                    )}
                                    {saving
                                        ? 'Đang lưu...'
                                        : editingId
                                            ? 'Lưu thay đổi'
                                            : 'Tạo phim'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {/* ACTOR MODAL */}
            {actorModalOpen && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !actorSaving
                        ) {
                            setActorModalOpen(false);
                        }
                    }}
                >
                    <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-slate-900 shadow-2xl">
                        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                            <div>
                                <h2 className="text-lg font-bold">
                                    {editingActorId ? 'Chỉnh sửa diễn viên' : 'Thêm diễn viên'}
                                </h2>
                                <p className="mt-1 text-xs text-zinc-400">
                                    Nhập thông tin hồ sơ diễn viên.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={actorSaving}
                                onClick={() => setActorModalOpen(false)}
                                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                aria-label="Đóng biểu mẫu diễn viên"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <form onSubmit={handleActorSubmit} className="space-y-4 p-5">
                            {error && (
                                <div
                                    role="alert"
                                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                                >
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className={labelClass} htmlFor="actor-name">
                                    Tên diễn viên *
                                </label>
                                <input
                                    id="actor-name"
                                    value={actorForm.name}
                                    onChange={(event) =>
                                        setActorForm((current) => ({
                                            ...current,
                                            name: event.target.value,
                                        }))
                                    }
                                    required
                                    maxLength={150}
                                    className={inputClass}
                                    placeholder="Nhập tên diễn viên"
                                />
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="actor-profile">
                                    URL ảnh đại diện
                                </label>
                                <input
                                    id="actor-profile"
                                    type="url"
                                    value={actorForm.profilePath}
                                    onChange={(event) =>
                                        setActorForm((current) => ({
                                            ...current,
                                            profilePath: event.target.value,
                                        }))
                                    }
                                    className={inputClass}
                                    placeholder="https://..."
                                />
                            </div>

                            {actorForm.profilePath && (
                                <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                                    <img
                                        src={actorForm.profilePath}
                                        alt="Xem trước ảnh diễn viên"
                                        onError={(event) => {
                                            event.currentTarget.style.display = 'none';
                                        }}
                                        className="h-14 w-14 rounded-full object-cover"
                                    />
                                    <p className="text-xs text-zinc-400">
                                        Xem trước ảnh đại diện
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col-reverse gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    disabled={actorSaving}
                                    onClick={() => setActorModalOpen(false)}
                                    className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={actorSaving}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold hover:brightness-110 disabled:opacity-50"
                                >
                                    {actorSaving ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    {actorSaving
                                        ? 'Đang lưu...'
                                        : editingActorId
                                            ? 'Lưu thay đổi'
                                            : 'Thêm diễn viên'}
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
