import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BadgeCheck, LockKeyhole, Pencil, Plus, RotateCcw, Search, Shield, Trash2, Users, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { accountApi } from '../../api/useAccount';
import UserAvatar from '../../components/UserAvatar';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../auth/AuthContext';

const PAGE_SIZE = 15;
const ROLE_OPTIONS = [
  { value: 'Customer', label: 'Khách hàng', description: 'Đặt vé và quản lý tài khoản cá nhân.' },
  { value: 'Staff', label: 'Nhân viên', description: 'Hỗ trợ vận hành quầy vé.' },
  { value: 'Admin', label: 'Quản trị viên', description: 'Toàn quyền quản trị hệ thống.' },
];

const roleStyles = {
  Admin: 'border-red-500/30 bg-red-500/10 text-red-300',
  Staff: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Customer: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
};

const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(amount ?? 0);

const formatDate = (date) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
}).format(new Date(date));

const getRoleLabel = (role) => ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ totalCount: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const listRequestId = useRef(0);
  const [modalMode, setModalMode] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [action, setAction] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    newPassword: '',
    role: 'Customer',
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const loadUsers = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setIsLoading(true);
    try {
      const result = await accountApi.getAdminUsers({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      if (requestId !== listRequestId.current) return;
      setUsers(result.items ?? []);
      setPageInfo({
        totalCount: result.totalCount ?? 0,
        totalPages: result.totalPages ?? 0,
      });
    } catch (error) {
      if (requestId === listRequestId.current)
        toast.error(error.message || 'Không thể tải danh sách người dùng.');
    } finally {
      if (requestId === listRequestId.current) setIsLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
    return () => {
      listRequestId.current += 1;
    };
  }, [loadUsers, refreshKey]);

  const startCreate = () => {
    setEditingUser(null);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      newPassword: '',
      role: 'Customer',
    });
    setModalMode('create');
  };

  const startEdit = async (id) => {
    setIsDetailLoading(true);
    try {
      const detail = await accountApi.getAdminUser(id);
      setEditingUser(detail);
      setForm({
        fullName: detail.fullName ?? '',
        email: detail.email ?? '',
        phone: detail.phone ?? '',
        password: '',
        newPassword: '',
        role: currentUser?.id?.toLowerCase() === detail.id?.toLowerCase()
          ? 'Admin'
          : detail.roles?.[0] ?? 'Customer',
      });
      setModalMode('edit');
    } catch (error) {
      toast.error(error.message || 'Không thể tải thông tin người dùng.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalMode(null);
    setEditingUser(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await accountApi.createAdminUser({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          password: form.password,
          role: form.role,
        });
        toast.success('Đã tạo tài khoản mới.');
        setPage(1);
      } else {
        await accountApi.updateAdminUser(editingUser.id, {
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          newPassword: form.newPassword || null,
        });
        toast.success('Thông tin người dùng đã được cập nhật.');
      }
      setModalMode(null);
      setEditingUser(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error.message || 'Không thể lưu thông tin người dùng.');
    } finally {
      setIsSaving(false);
    }
  };

  const openAction = (targetUser, type) => setAction({ user: targetUser, type });

  const performAction = async () => {
    if (!action) return;
    setIsActionLoading(true);
    try {
      if (action.type === 'restore') {
        await accountApi.restoreAdminUser(action.user.id);
        toast.success('Đã khôi phục tài khoản.');
      } else {
        await accountApi.deleteAdminUser(action.user.id, action.type === 'hardDelete');
        toast.success(action.type === 'hardDelete' ? 'Đã xóa vĩnh viễn tài khoản.' : 'Đã khóa tài khoản.');
      }
      setAction(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error.message || 'Không thể thực hiện thao tác.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const actionConfirmation = useMemo(() => {
    if (!action) return null;
    if (action.type === 'hardDelete') {
      return {
        title: 'Xóa vĩnh viễn tài khoản?',
        message: `Tài khoản ${action.user.email} sẽ bị xóa khỏi hệ thống. Chỉ dùng với tài khoản chưa từng có đơn đặt vé. Thao tác này không thể hoàn tác.`,
        confirmText: 'Xóa vĩnh viễn',
        type: 'danger',
      };
    }
    if (action.type === 'restore') {
      return {
        title: 'Khôi phục tài khoản?',
        message: `Mở khóa và cho phép ${action.user.email} đăng nhập lại?`,
        confirmText: 'Khôi phục',
        type: 'info',
      };
    }
    return {
      title: 'Khóa tài khoản?',
      message: `Tài khoản ${action.user.email} sẽ không thể đăng nhập. Lịch sử đặt vé và dữ liệu đối soát được giữ nguyên.`,
      confirmText: 'Khóa tài khoản',
      type: 'warning',
    };
  }, [action]);

  const isSelf = (targetUser) => currentUser?.id?.toLowerCase() === targetUser.id?.toLowerCase();

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <Link to="/admin" className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-red-300 hover:text-red-200">
              <ArrowLeft className="h-4 w-4" /> Admin Portal
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý người dùng</h1>
            <p className="mt-2 text-sm text-slate-400">
              Quản lý khách hàng, nhân viên và tài khoản quản trị.
            </p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            disabled={isDetailLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            <Plus className="h-5 w-5" /> Thêm người dùng
          </button>
        </header>

        <section className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:grid-cols-[minmax(240px,1fr)_190px_190px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, email hoặc số điện thoại"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-red-500"
            />
          </label>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Lọc theo vai trò"
            className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500"
          >
            <option value="">Tất cả vai trò</option>
            {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Lọc theo trạng thái"
            className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã khóa</option>
          </select>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Users className="h-4 w-4 text-red-300" /> Danh sách tài khoản
            </div>
            <span className="text-xs text-slate-400">{pageInfo.totalCount} tài khoản</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Người dùng</th>
                  <th className="px-4 py-3 font-medium">Điện thoại</th>
                  <th className="px-4 py-3 font-medium">Tài khoản</th>
                  <th className="px-4 py-3 font-medium">Vai trò</th>
                  <th className="px-4 py-3 font-medium">Đơn vé / Chi tiêu</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-5 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {isLoading ? (
                  <tr><td colSpan="7" className="px-5 py-14 text-center text-slate-400">Đang tải danh sách...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="7" className="px-5 py-14 text-center text-slate-400">Không tìm thấy người dùng phù hợp.</td></tr>
                ) : users.map((item) => (
                  <tr key={item.id} className="transition hover:bg-white/[0.025]">
                    <td className="px-5 py-4">
                      <div className="flex min-w-64 items-center gap-3">
                        <UserAvatar src={item.avatarUrl} name={item.fullName || item.email} className="h-10 w-10 text-sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{item.fullName || 'Chưa cập nhật tên'}</p>
                          <p className="truncate text-xs text-slate-400">{item.email}</p>
                          <p className="mt-1 text-[11px] text-slate-500">Tạo {formatDate(item.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{item.phone || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${item.authProvider?.toLowerCase() === 'clerk' ? 'border-violet-500/30 bg-violet-500/10 text-violet-300' : 'border-slate-500/30 bg-slate-500/10 text-slate-300'}`}>
                        {item.authProvider?.toLowerCase() === 'clerk' ? <BadgeCheck className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                        {item.authProvider?.toLowerCase() === 'clerk' ? 'Clerk / Google' : 'Local'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex max-w-44 flex-wrap gap-1.5">
                        {(item.roles ?? []).map((role) => (
                          <span key={role} className={`rounded-full border px-2.5 py-1 text-xs ${roleStyles[role] ?? roleStyles.Customer}`}>
                            {getRoleLabel(role)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-white">{item.bookingsCount} đơn</p>
                      <p className="mt-1 text-xs text-slate-400">{formatMoney(item.totalSpent)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                        {item.isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(item.id)}
                          disabled={isDetailLoading}
                          title="Chỉnh sửa người dùng"
                          className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-300 disabled:opacity-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {item.isActive ? (
                          <button
                            type="button"
                            onClick={() => openAction(item, 'lock')}
                            disabled={isSelf(item)}
                            title={isSelf(item) ? 'Không thể tự khóa tài khoản đang sử dụng' : 'Khóa tài khoản'}
                            className="rounded-lg border border-white/10 p-2 text-amber-300 transition hover:border-amber-400/40 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <LockKeyhole className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openAction(item, 'restore')}
                            title="Khôi phục tài khoản"
                            className="rounded-lg border border-white/10 p-2 text-emerald-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        {item.bookingsCount === 0 && !isSelf(item) && (
                          <button
                            type="button"
                            onClick={() => openAction(item, 'hardDelete')}
                            title="Xóa vĩnh viễn tài khoản chưa có đơn vé"
                            className="rounded-lg border border-white/10 p-2 text-red-300 transition hover:border-red-400/40 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-sm sm:flex-row">
            <p className="text-xs text-slate-400">
              Trang {page} / {Math.max(pageInfo.totalPages, 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || isLoading}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(pageInfo.totalPages, value + 1))}
                disabled={pageInfo.totalPages === 0 || page >= pageInfo.totalPages || isLoading}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Tiếp
              </button>
            </div>
          </footer>
        </section>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section className="my-auto w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <header className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{modalMode === 'create' ? 'Thêm tài khoản mới' : 'Chỉnh sửa người dùng'}</h2>
                <p className="mt-1 text-sm text-slate-400">Thông tin tài khoản và phạm vi quyền hạn.</p>
              </div>
              <button type="button" onClick={closeModal} disabled={isSaving} aria-label="Đóng" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </header>
            {isDetailLoading ? (
              <p className="py-10 text-center text-slate-400">Đang tải thông tin...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm text-slate-300">
                  Họ và tên
                  <input
                    required
                    maxLength={150}
                    value={form.fullName}
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-red-500"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Email
                  <input
                    required
                    type="email"
                    maxLength={254}
                    readOnly={modalMode === 'edit'}
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none read-only:cursor-not-allowed read-only:text-slate-400 focus:border-red-500"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Số điện thoại
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Tùy chọn, gồm 10 chữ số"
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none placeholder:text-slate-500 focus:border-red-500"
                  />
                </label>
                <fieldset>
                  <legend className="mb-2 text-sm text-slate-300">Vai trò</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {ROLE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`cursor-pointer rounded-xl border p-3 transition ${form.role === option.value ? 'border-red-500/60 bg-red-500/10' : 'border-white/10 bg-zinc-950 hover:border-white/20'} ${modalMode === 'edit' && isSelf(editingUser ?? {}) && option.value !== 'Admin' ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={option.value}
                          checked={form.role === option.value}
                          disabled={modalMode === 'edit' && isSelf(editingUser ?? {}) && option.value !== 'Admin'}
                          onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                          className="sr-only"
                        />
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className="mt-1 block text-[11px] leading-4 text-slate-400">{option.description}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {modalMode === 'create' ? (
                  <label className="block text-sm text-slate-300">
                    Mật khẩu khởi tạo
                    <input
                      required
                      type="password"
                      minLength={6}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-red-500"
                    />
                  </label>
                ) : editingUser?.authProvider?.toLowerCase() === 'local' ? (
                  <label className="block text-sm text-slate-300">
                    Đặt lại mật khẩu <span className="text-xs text-slate-500">(để trống nếu không đổi)</span>
                    <input
                      type="password"
                      minLength={6}
                      autoComplete="new-password"
                      value={form.newPassword}
                      onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-red-500"
                    />
                  </label>
                ) : (
                  <p className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-xs text-violet-200">
                    Đây là tài khoản liên kết Clerk/Google; mật khẩu được quản lý bởi nhà cung cấp đăng nhập.
                  </p>
                )}
                <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                  <button type="button" onClick={closeModal} disabled={isSaving} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50">
                    Hủy
                  </button>
                  <button type="submit" disabled={isSaving} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {isSaving ? 'Đang lưu...' : modalMode === 'create' ? 'Tạo tài khoản' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(action)}
        title={actionConfirmation?.title}
        message={actionConfirmation?.message}
        confirmText={actionConfirmation?.confirmText}
        type={actionConfirmation?.type}
        isLoading={isActionLoading}
        onConfirm={performAction}
        onCancel={() => !isActionLoading && setAction(null)}
      />
    </main>
  );
};

export default AdminUsers;
