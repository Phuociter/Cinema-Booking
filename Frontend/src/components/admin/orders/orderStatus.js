/**
 * Pure JavaScript module for order status metadata and date range validation.
 * No JSX or React imports.
 */

export const STATUS_META = {
  success: {
    label: 'Đã thanh toán',
    tone: 'success',
  },
  pending: {
    label: 'Chờ thanh toán',
    tone: 'warning',
  },
  expired: {
    label: 'Hết hạn',
    tone: 'muted',
  },
  cancelled: {
    label: 'Đã hủy',
    tone: 'danger',
  },
};

export const getOrderStatusMeta = (status) => {
  if (!status || typeof status !== 'string') {
    return {
      label: status || '—',
      tone: 'neutral',
    };
  }

  const normalized = status.trim().toLowerCase();
  if (STATUS_META[normalized]) {
    return STATUS_META[normalized];
  }

  return {
    label: status,
    tone: 'neutral',
  };
};

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'success', label: 'Đã thanh toán' },
  { value: 'pending', label: 'Chờ thanh toán' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export const isDateRangeInvalid = (from, to) => {
  if (!from || !to) {
    return false;
  }
  const strFrom = String(from).trim();
  const strTo = String(to).trim();
  if (!strFrom || !strTo) {
    return false;
  }
  return strFrom > strTo;
};

export default {
  STATUS_META,
  getOrderStatusMeta,
  STATUS_FILTER_OPTIONS,
  isDateRangeInvalid,
};
