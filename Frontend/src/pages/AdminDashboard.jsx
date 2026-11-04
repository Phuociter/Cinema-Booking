import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Film,
  RefreshCw,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { accountApi } from '../api/useAccount';
import useAdminDashboard from '../api/useAdminDashboard';
import { resolveApiAssetUrl } from '../api/axiosInstance';
import { useAuth } from '../auth/AuthContext';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
});

const localDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultRange = () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return {
    from: localDateInputValue(start),
    to: localDateInputValue(today),
  };
};

const formatDateKey = (value) => String(value).slice(0, 10);

function RevenueChart({ dailyTotals = [], from, to }) {
  const points = useMemo(() => {
    if (!from || !to) return [];

    const totalsByDate = new Map(
      dailyTotals.map((day) => [formatDateKey(day.date), day.revenue]),
    );
    const start = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);
    const result = [];

    for (let timestamp = start.getTime(); timestamp <= end.getTime(); timestamp += 86400000) {
      const date = new Date(timestamp).toISOString().slice(0, 10);
      result.push({
        date,
        revenue: Number(totalsByDate.get(date) ?? 0),
      });
    }

    return result;
  }, [dailyTotals, from, to]);

  if (!points.length) {
    return <p className="py-12 text-center text-sm text-slate-400">Chọn khoảng ngày hợp lệ để xem biểu đồ.</p>;
  }

  const width = 900;
  const height = 270;
  const padding = { top: 20, right: 18, bottom: 38, left: 62 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(...points.map((point) => point.revenue), 1);
  const coordinates = points.map((point, index) => ({
    ...point,
    x: padding.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth),
    y: padding.top + chartHeight - (point.revenue / maximum) * chartHeight,
  }));
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${coordinates.at(-1).x} ${padding.top + chartHeight} L ${coordinates[0].x} ${padding.top + chartHeight} Z`;
  const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[270px] min-w-[640px] w-full"
        role="img"
        aria-label="Biểu đồ doanh thu theo ngày"
      >
        {[0, 0.5, 1].map((fraction) => {
          const y = padding.top + chartHeight * fraction;
          const value = maximum * (1 - fraction);
          return (
            <g key={fraction}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(148,163,184,0.16)" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11">
                {compactCurrencyFormatter.format(value)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#revenueGradient)" />
        <path d={linePath} fill="none" stroke="#f87171" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {coordinates.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r="3.5" fill="#fecaca" stroke="#ef4444" strokeWidth="2">
            <title>{`${point.date}: ${currencyFormatter.format(point.revenue)}`}</title>
          </circle>
        ))}
        {labelIndexes.map((index) => {
          const point = coordinates[index];
          const [year, month, day] = point.date.split('-').map(Number);
          return (
            <text key={point.date} x={point.x} y={height - 10} textAnchor="middle" fill="#94a3b8" fontSize="11">
              {dateFormatter.format(new Date(Date.UTC(year, month - 1, day)))}
            </text>
          );
        })}
        <defs>
          <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function GrowthIndicator({ value }) {
  if (value == null) {
    return <span className="text-xs text-slate-500">Chưa có kỳ đối chiếu</span>;
  }

  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% so với kỳ trước
    </span>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const initialRange = useMemo(getDefaultRange, []);
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [report, setReport] = useState(null);
  const [topMovies, setTopMovies] = useState([]);
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [accountSummary, setAccountSummary] = useState(null);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);

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
        setAccountSummary({
          recentUsers: all.items ?? [],
          totalUsers: all.totalCount ?? 0,
          customers: customers.totalCount ?? 0,
          staff: staff.totalCount ?? 0,
          admins: admins.totalCount ?? 0,
          locked: locked.totalCount ?? 0,
        });
      })
      .catch((error) => {
        if (active) toast.error(error.message || 'Không thể tải tổng quan tài khoản.');
      })
      .finally(() => {
        if (active) setIsAccountsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!dateFrom || !dateTo) return undefined;
    let active = true;
    setIsReportLoading(true);
    setIsRefreshing(true);

    Promise.all([
      useAdminDashboard.getOverview({ from: dateFrom, to: dateTo }),
      useAdminDashboard.getTopMovies({ top: 5, from: dateFrom, to: dateTo }),
    ])
      .then(([overview, movies]) => {
        if (!active) return;
        setReport(overview);
        setTopMovies(Array.isArray(movies) ? movies : []);
      })
      .catch((error) => {
        if (active) toast.error(error.message || 'Không thể tải báo cáo doanh thu.');
      })
      .finally(() => {
        if (active) {
          setIsReportLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dateFrom, dateTo]);

  const setPresetRange = (days) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    setDateFrom(localDateInputValue(start));
    setDateTo(localDateInputValue(end));
  };

  const summary = report?.summary;
  const metrics = [
    {
      label: 'Doanh thu',
      value: currencyFormatter.format(summary?.revenue ?? 0),
      growth: summary?.revenueGrowthPercent,
      icon: CircleDollarSign,
      color: 'text-emerald-300 bg-emerald-400/10',
    },
    {
      label: 'Đơn thành công',
      value: (summary?.orders ?? 0).toLocaleString('vi-VN'),
      growth: summary?.ordersGrowthPercent,
      icon: Ticket,
      color: 'text-blue-300 bg-blue-400/10',
    },
    {
      label: 'Vé đã bán',
      value: (summary?.ticketsSold ?? 0).toLocaleString('vi-VN'),
      growth: summary?.ticketsGrowthPercent,
      icon: Film,
      color: 'text-amber-300 bg-amber-400/10',
    },
    {
      label: 'Giá trị đơn trung bình',
      value: currencyFormatter.format(summary?.averageOrderValue ?? 0),
      icon: TrendingUp,
      color: 'text-violet-300 bg-violet-400/10',
    },
  ];

  return (
    <main className="min-h-full bg-zinc-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-red-300">
              <ShieldCheck className="h-4 w-4" /> Admin Portal
            </p>
            <h1 className="text-3xl font-bold">Báo cáo doanh thu & tăng trưởng</h1>
            <p className="mt-2 text-sm text-slate-400">
              Xin chào, {user?.fullName || user?.email}. Theo dõi hiệu quả kinh doanh theo kỳ.
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Quản lý đơn vé <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <CalendarDays className="h-4 w-4 text-red-300" /> Khoảng thời gian
            </p>
            <div className="flex flex-wrap gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  type="button"
                  key={days}
                  onClick={() => setPresetRange(days)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-white"
                >
                  {days} ngày
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1.5 text-xs text-slate-400">
              Từ ngày
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(event) => setDateFrom(event.target.value)}
                className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white scheme-dark"
              />
            </label>
            <label className="grid gap-1.5 text-xs text-slate-400">
              Đến ngày
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={localDateInputValue(new Date())}
                onChange={(event) => setDateTo(event.target.value)}
                className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white scheme-dark"
              />
            </label>
            <span className="inline-flex items-center gap-2 pb-2 text-xs text-slate-500">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Đang cập nhật' : 'So sánh cùng độ dài kỳ trước'}
            </span>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, growth, icon: Icon, color }) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-400">{label}</span>
                <span className={`rounded-xl p-2 ${color}`}>{React.createElement(Icon, { className: 'h-5 w-5' })}</span>
              </div>
              <p className="mt-4 truncate text-2xl font-bold">
                {isReportLoading ? <span className="text-base text-slate-500">Đang tải...</span> : value}
              </p>
              {growth !== undefined && !isReportLoading && (
                <div className="mt-2"><GrowthIndicator value={growth} /></div>
              )}
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
          <article className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Xu hướng doanh thu</h2>
                <p className="mt-1 text-xs text-slate-400">Tổng giá trị các đơn đã thanh toán thành công theo ngày.</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                {isReportLoading ? 'Đang tải' : currencyFormatter.format(summary?.revenue ?? 0)}
              </span>
            </div>
            {isReportLoading && !report ? (
              <div className="h-[270px] animate-pulse rounded-xl bg-white/[0.03]" />
            ) : (
              <RevenueChart dailyTotals={report?.dailyTotals} from={dateFrom} to={dateTo} />
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-semibold">Phim có doanh thu vé cao nhất</h2>
                <p className="mt-1 text-xs text-slate-400">Trong khoảng thời gian đã chọn.</p>
              </div>
              <Film className="h-5 w-5 text-amber-300" />
            </div>
            {isReportLoading && !topMovies.length ? (
              <p className="py-8 text-center text-sm text-slate-400">Đang tải báo cáo...</p>
            ) : topMovies.length ? (
              <div className="space-y-3">
                {topMovies.map((movie, index) => (
                  <div key={movie.movieId} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-2.5">
                    <span className="w-5 text-center text-xs font-bold text-slate-500">{index + 1}</span>
                    {movie.posterUrl ? (
                      <img
                        src={resolveApiAssetUrl(movie.posterUrl)}
                        alt=""
                        className="h-14 w-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-500">
                        <Film className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{movie.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{movie.totalTicketsSold} vé đã bán</p>
                    </div>
                    <p className="shrink-0 text-right text-xs font-semibold text-emerald-300">
                      {currencyFormatter.format(movie.totalRevenue)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">Chưa có vé bán thành công trong kỳ này.</p>
            )}
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="font-semibold">Tài khoản mới</h2>
                <p className="mt-1 text-xs text-slate-400">Các tài khoản được tạo gần đây.</p>
              </div>
              <Link to="/admin/users" className="text-sm font-medium text-red-300 hover:text-red-200">Xem tất cả</Link>
            </div>
            {isAccountsLoading ? (
              <p className="px-5 py-8 text-sm text-slate-400">Đang tải dữ liệu...</p>
            ) : accountSummary?.recentUsers?.length ? (
              <div className="divide-y divide-white/[0.06]">
                {accountSummary.recentUsers.map((item) => (
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
          </article>

          <aside className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Tài khoản hệ thống</h2>
              <Users className="h-5 w-5 text-blue-300" />
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {isAccountsLoading ? 'Đang tải số liệu...' : `${(accountSummary?.totalUsers ?? 0).toLocaleString('vi-VN')} tài khoản đang được quản lý.`}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-black/20 p-3 text-slate-400">Khách hàng <strong className="mt-1 block text-base text-cyan-200">{accountSummary?.customers ?? '—'}</strong></div>
              <div className="rounded-lg bg-black/20 p-3 text-slate-400">Nhân viên <strong className="mt-1 block text-base text-amber-200">{accountSummary?.staff ?? '—'}</strong></div>
              <div className="rounded-lg bg-black/20 p-3 text-slate-400">Quản trị viên <strong className="mt-1 block text-base text-red-200">{accountSummary?.admins ?? '—'}</strong></div>
              <div className="rounded-lg bg-black/20 p-3 text-slate-400">Đã khóa <strong className="mt-1 block text-base text-slate-200">{accountSummary?.locked ?? '—'}</strong></div>
            </div>
            <Link
              to="/admin/users"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
            >
              Quản lý tài khoản <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
