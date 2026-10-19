import React, { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, LockKeyhole, ShieldCheck, Ticket, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { accountApi } from '../api/useAccount';
import { useAuth } from '../auth/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      accountApi.getAdminUsers({ page: 1, pageSize: 5 }),
      accountApi.getAdminUsers({ page: 1, pageSize: 1, role: 'Customer', status: 'active' }),
      accountApi.getAdminUsers({ page: 1, pageSize: 1, role: 'Staff', status: 'active' }),
      accountApi.getAdminUsers({ page: 1, pageSize: 1, role: 'Admin', status: 'active' }),
      accountApi.getAdminUsers({ page: 1, pageSize: 1, status: 'locked' }),
    ])
      .then(([all, customers, staff, admins, locked]) => {
        if (!active) return;
        setSummary({
          recentUsers: all.items ?? [],
          totalUsers: all.totalCount ?? 0,
          customers: customers.totalCount ?? 0,
          staff: staff.totalCount ?? 0,
          admins: admins.totalCount ?? 0,
          locked: locked.totalCount ?? 0,
        });
      })
      .catch((error) => {
        if (active) toast.error(error.message || 'Không thể tải tổng quan quản trị.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const metrics = [
    { label: 'Tổng tài khoản', value: summary?.totalUsers, icon: Users, color: 'text-blue-300 bg-blue-400/10' },
    { label: 'Khách hàng', value: summary?.customers, icon: Ticket, color: 'text-cyan-300 bg-cyan-400/10' },
    { label: 'Nhân viên', value: summary?.staff, icon: BadgeCheck, color: 'text-amber-300 bg-amber-400/10' },
    { label: 'Quản trị viên', value: summary?.admins, icon: ShieldCheck, color: 'text-red-300 bg-red-400/10' },
    { label: 'Tài khoản bị khóa', value: summary?.locked, icon: LockKeyhole, color: 'text-slate-300 bg-slate-400/10' },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-red-300">
              <ShieldCheck className="h-4 w-4" /> Admin Portal
            </p>
            <h1 className="text-3xl font-bold">Tổng quan quản trị</h1>
            <p className="mt-2 text-sm text-slate-400">
              Xin chào, {user?.fullName || user?.email}. Quản lý hoạt động và tài khoản Cinema tại đây.
            </p>
          </div>
          <Link
            to="/admin/users"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Quản lý người dùng <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map(({ label, value, icon: Icon, color }) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{label}</span>
                <span className={`rounded-xl p-2 ${color}`}>{React.createElement(Icon, { className: 'h-5 w-5' })}</span>
              </div>
              <p className="mt-4 text-3xl font-bold">
                {isLoading ? <span className="text-xl text-slate-500">Đang tải...</span> : value ?? '—'}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="font-semibold">Tài khoản mới</h2>
                <p className="mt-1 text-xs text-slate-400">Các tài khoản được tạo gần đây.</p>
              </div>
              <Link to="/admin/users" className="text-sm font-medium text-red-300 hover:text-red-200">Xem tất cả</Link>
            </div>
            {isLoading ? (
              <p className="px-5 py-8 text-sm text-slate-400">Đang tải dữ liệu...</p>
            ) : summary?.recentUsers?.length ? (
              <div className="divide-y divide-white/[0.06]">
                {summary.recentUsers.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.fullName || 'Chưa cập nhật tên'}</p>
                      <p className="truncate text-xs text-slate-400">{item.email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${item.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                      {item.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-slate-400">Chưa có tài khoản nào.</p>
            )}
          </div>

          <aside className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <h2 className="font-semibold">Quản lý người dùng</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Tạo tài khoản nhân viên hoặc quản trị viên, chỉnh sửa vai trò, đặt lại mật khẩu, khóa và khôi phục tài khoản.
            </p>
            <Link
              to="/admin/users"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
            >
              Mở quản lý tài khoản <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
