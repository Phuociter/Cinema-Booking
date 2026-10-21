import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const AdminModal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-2xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full ${maxWidth} bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3 bg-zinc-900">
          <h2 className="text-sm sm:text-base font-semibold text-zinc-100 truncate pr-4">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            aria-label="Đóng cửa sổ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs sm:text-sm text-zinc-200">
          {children}
        </div>

        {/* Footer (nếu có) */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-950/60 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModal;
