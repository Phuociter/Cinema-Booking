import axiosInstance from './axiosInstance';

/**
 * API Module: Bookings & Tickets (Phụ trách: Dev D)
 * Quản lý toàn bộ API Đặt vé (Transaction DB), Lịch sử đặt vé và Xuất vé điện tử QR Code
 */
export const useBookings = {
  // Tạo đơn đặt vé mới từ holdToken và danh sách bắp nước
  createBooking: async (payload) => {
    return await axiosInstance.post('/bookings', payload);
  },

  // Chi tiết đơn đặt vé theo ID
  getBookingById: async (id) => {
    return await axiosInstance.get(`/bookings/${id}`);
  },

  // Danh sách vé đã đặt của người dùng hiện tại
  getMyBookings: async (page = 1, pageSize = 10) => {
    return await axiosInstance.get('/bookings/my-bookings', {
      params: { page, pageSize }
    });
  },

  // Hủy đơn đặt vé đang chờ thanh toán và nhả ghế
  cancelBooking: async (id) => {
    return await axiosInstance.post(`/bookings/${id}/cancel`);
  },
};

export default useBookings;
