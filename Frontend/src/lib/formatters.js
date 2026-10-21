/**
 * Utility functions for formatting currency, date, and time
 * Converts UTC datetime from Backend to local time for display
 */

export const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '0 đ';
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
};

const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const padZero = (n) => String(n).padStart(2, '0');

export const formatDateTime = (val) => {
  const d = parseDate(val);
  if (!d) return '--:-- --/--/----';
  const hours = padZero(d.getHours());
  const minutes = padZero(d.getMinutes());
  const day = padZero(d.getDate());
  const month = padZero(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
};

export const formatDate = (val) => {
  const d = parseDate(val);
  if (!d) return '--/--/----';
  const day = padZero(d.getDate());
  const month = padZero(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatTime = (val) => {
  const d = parseDate(val);
  if (!d) return '--:--';
  const hours = padZero(d.getHours());
  const minutes = padZero(d.getMinutes());
  return `${hours}:${minutes}`;
};

export default {
  formatCurrency,
  formatDateTime,
  formatDate,
  formatTime,
};
