import React from 'react';

const STATUS_CONFIG = {
  scheduled: {
    color: 'bg-emerald-400',
    defaultLabel: 'Đã lên lịch',
  },
  cancelled: {
    color: 'bg-red-400',
    defaultLabel: 'Đã hủy',
  },
  available: {
    color: 'bg-emerald-400',
    defaultLabel: 'Trống',
  },
  holding: {
    color: 'bg-amber-400',
    defaultLabel: 'Đang giữ',
  },
  sold: {
    color: 'bg-red-400',
    defaultLabel: 'Đã bán',
  },
  maintenance: {
    color: 'bg-zinc-400',
    defaultLabel: 'Bảo trì',
  },
};

export const StatusDot = ({ status, label, className = '' }) => {
  const key = String(status || '').toLowerCase();
  const config = STATUS_CONFIG[key] || {
    color: 'bg-zinc-400',
    defaultLabel: status || 'Chưa xác định',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-zinc-300 ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.color}`} />
      <span>{label || config.defaultLabel}</span>
    </span>
  );
};

export default StatusDot;
