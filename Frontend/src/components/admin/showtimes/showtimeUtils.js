/**
 * Pure utility functions for showtimes calculations and formatting
 */

export const toDecimalHour = (val) => {
  if (!val) return 0;
  if (val instanceof Date) {
    return val.getHours() + val.getMinutes() / 60;
  }
  if (typeof val === 'string') {
    // Nếu là chuỗi ISO hoặc có 'T'/'Z'
    if (val.includes('T') || val.includes('-')) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.getHours() + d.getMinutes() / 60;
      }
    }
    // Nếu là chuỗi "HH:mm"
    const parts = val.split(':');
    if (parts.length >= 2) {
      return Number(parts[0]) + Number(parts[1]) / 60;
    }
  }
  return Number(val) || 0;
};

export const formatDecimalToTime = (decimal) => {
  const totalMinutes = Math.round(decimal * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
};

export const calculateEndTimeString = (startTimeStr, durationMin) => {
  if (!startTimeStr || !durationMin) return '--:--';
  const startDecimal = toDecimalHour(startTimeStr);
  const endDecimal = startDecimal + durationMin / 60;
  const timeFormatted = formatDecimalToTime(endDecimal);
  const isNextDay = endDecimal >= 24;
  return `${timeFormatted}${isNextDay ? ' (+1 ngày)' : ''}`;
};

export const toIsoUtcString = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return '';
  // Tạo Date từ local time và đổi sang ISO UTC chuẩn
  const localDate = new Date(`${dateStr}T${timeStr}:00`);
  return localDate.toISOString();
};

export const checkTimeOverlap = (startA, endA, startB, endB) => {
  return startA < endB && endA > startB;
};

export const getTimelinePosition = (startDec, endDec, startLimit = 8, totalHours = 16) => {
  const effectiveStart = Math.max(startDec, startLimit);
  const effectiveEnd = Math.min(endDec, startLimit + totalHours);

  if (effectiveEnd <= startLimit || effectiveStart >= startLimit + totalHours) {
    return { left: '0%', width: '0%', isVisible: false };
  }

  const leftPercent = Math.max(0, ((effectiveStart - startLimit) / totalHours) * 100);
  const widthPercent = Math.max(2, ((effectiveEnd - effectiveStart) / totalHours) * 100);

  return {
    left: `${leftPercent.toFixed(2)}%`,
    width: `${widthPercent.toFixed(2)}%`,
    isVisible: true,
  };
};

export const formatVnd = (amount) => {
  if (amount == null || isNaN(amount)) return '0 đ';
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
};
