import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { ADMIN_MODULES } from '../../../config/adminNavigation';

export const AdminTopbar = ({ onOpenSidebar }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Tìm tên trang hiện tại dựa trên pathname
  const currentModule = ADMIN_MODULES.find((m) =>
    location.pathname.startsWith(m.path)
  );
  const pageTitle = currentModule ? currentModule.label : 'Quản trị';

  const displayName = user?.fullName || user?.email || 'Quản trị viên';

  return (
    <header className="flex h-12 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6">
      {/* Bên trái: Nút Hamburger (mobile) + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="text-sm text-zinc-400">
          <span>Quản trị</span>
          <span className="mx-2">/</span>
          <b className="font-semibold text-zinc-100">{pageTitle}</b>
        </div>
      </div>

      {/* Bên phải: Link về trang khách + Tên user */}
      <div className="flex items-center gap-4 text-sm">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Về trang khách</span>
        </Link>

        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-zinc-800 text-xs text-zinc-300">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="max-w-[160px] truncate font-medium">{displayName}</span>
        </div>
      </div>
    </header>
  );
};

export default AdminTopbar;
