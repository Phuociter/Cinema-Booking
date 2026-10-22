import React, { useState, useCallback } from 'react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

/**
 * ConfirmModal: Component modal hộp thoại xác nhận hiện đại, chuẩn phong cách Dark Mode của QuickShow
 */
export const ConfirmModal = ({
  isOpen,
  title = 'Xác nhận hành động',
  message,
  confirmText = 'Đồng ý',
  cancelText = 'Hủy bỏ',
  type = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const iconMap = {
    danger: <AlertTriangle className="w-6 h-6 text-red-400" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-400" />,
    info: <Info className="w-6 h-6 text-blue-400" />,
  };

  const btnBgMap = {
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30',
    info: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative text-left backdrop-blur-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng góc phải */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer p-1.5 rounded-xl hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Nội dung thông báo */}
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0">
            {iconMap[type] || iconMap.danger}
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-lg font-bold text-white leading-snug">{title}</h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 whitespace-pre-line leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Nút thao tác Đồng ý / Hủy */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold rounded-xl border border-white/10 transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 font-bold text-xs sm:text-sm rounded-xl transition shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${btnBgMap[type] || btnBgMap.danger}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * useConfirm: Custom Hook cung cấp hàm confirm() dạng Promise và component Dialog hiển thị
 */
export const useConfirm = () => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Đồng ý',
    cancelText: 'Hủy bỏ',
    type: 'danger',
    resolve: null,
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title: options.title || 'Xác nhận hành động',
        message: options.message || '',
        confirmText: options.confirmText || 'Đồng ý',
        cancelText: options.cancelText || 'Hủy bỏ',
        type: options.type || 'danger',
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (dialogState.resolve) dialogState.resolve(true);
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, [dialogState]);

  const handleCancel = useCallback(() => {
    if (dialogState.resolve) dialogState.resolve(false);
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, [dialogState]);

  const ConfirmDialog = useCallback(() => {
    return (
      <ConfirmModal
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        type={dialogState.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }, [dialogState, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };
};

export default ConfirmModal;
