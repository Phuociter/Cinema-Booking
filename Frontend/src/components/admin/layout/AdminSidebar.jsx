import React from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { ADMIN_MODULES } from '../../../config/adminNavigation';

export const AdminSidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-52 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-4">
          <div className="text-base font-semibold text-zinc-100 tracking-wide">
            Cinema<span className="text-primary">.</span>admin
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 lg:hidden cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 py-3">
          {ADMIN_MODULES.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors border-l-2 ${
                    isActive
                      ? 'border-primary bg-zinc-900 text-zinc-100'
                      : 'border-transparent text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default AdminSidebar;
