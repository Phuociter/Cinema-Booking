import React from 'react';
import { getOrderStatusMeta } from './orderStatus';

const TONE_CLASSES = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  danger: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  muted: 'border-zinc-700 bg-zinc-800/60 text-zinc-400',
  neutral: 'border-zinc-700 bg-zinc-800/60 text-zinc-300',
};

export const OrderStatusBadge = ({ status }) => {
  const meta = getOrderStatusMeta(status);
  const toneClass = TONE_CLASSES[meta.tone] || TONE_CLASSES.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </span>
  );
};

export default OrderStatusBadge;
