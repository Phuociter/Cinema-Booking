/**
 * Constants for Showtimes management module
 */

export const PAGE_SIZE_OPTIONS = [50, 100, 200];
export const DEFAULT_PAGE_SIZE = 50;

export const TIME_SUGGESTIONS = [
  '08:30',
  '11:15',
  '14:00',
  '16:45',
  '19:30',
  '22:15',
];

export const SHOWTIME_STATUS = {
  SCHEDULED: 'scheduled',
  CANCELLED: 'cancelled',
};

export const SHOWTIME_STATUS_LABELS = {
  scheduled: 'Đã lên lịch',
  cancelled: 'Đã hủy',
};

export const SEAT_STATUS = {
  AVAILABLE: 'available',
  HOLDING: 'holding',
  SOLD: 'sold',
  MAINTENANCE: 'maintenance',
};

export const SEAT_STATUS_LABELS = {
  available: 'Trống',
  holding: 'Đang giữ',
  sold: 'Đã bán',
  maintenance: 'Bảo trì',
};

export const SEAT_TYPE_EXTRAS = {
  standard: 0,
  vip: 20000,
  couple: 40000,
};

export const TIMELINE_HOURS = [8, 10, 12, 14, 16, 18, 20, 22, 24];
export const TIMELINE_START_HOUR = 8;
export const TIMELINE_TOTAL_HOURS = 16; // Từ 08:00 đến 24:00
