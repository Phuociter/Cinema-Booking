import axiosInstance from './axiosInstance';

/**
 * API Module: Showtimes & Real-time Seat Hold Engine (Phụ trách: Dev C)
 * Quản lý toàn bộ API Lịch chiếu, Sơ đồ ghế suất chiếu và Tạm giữ ghế 5 phút (Redis)
 */
export const useShowtimes = {
  // Lấy danh sách suất chiếu (hỗ trợ lọc theo movieId, cinemaId, date)
  getShowtimes: async (params = {}) => {
    return await axiosInstance.get('/showtimes', { params });
  },

  // Lấy chi tiết 1 suất chiếu theo ID
  getShowtimeById: async (id) => {
    return await axiosInstance.get(`/showtimes/${id}`);
  },

  // Lấy sơ đồ 48 ghế thực tế của suất chiếu
  getShowtimeSeats: async (showtimeId) => {
    return await axiosInstance.get(`/showtimes/${showtimeId}/seats`);
  },

  // Giữ ghế tạm thời (5 phút qua Redis)
  holdSeats: async (showtimeId, seatIds) => {
    return await axiosInstance.post(`/showtimes/${showtimeId}/hold-seats`, { seatIds });
  },

  // Tạo suất chiếu mới (Admin)
  createShowtime: async (data) => {
    return await axiosInstance.post('/showtimes', data);
  },

  // Hủy suất chiếu (Admin)
  cancelShowtime: async (id) => {
    return await axiosInstance.put(`/showtimes/${id}/cancel`);
  },

  // Mở lại suất chiếu đã hủy (Admin)
  restoreShowtime: async (id) => {
    return await axiosInstance.put(`/showtimes/${id}/restore`);
  },

  // Lấy sơ đồ ghế Admin (kèm thông tin khách hàng và 4 trạng thái)
  getAdminShowtimeSeats: async (id) => {
    return await axiosInstance.get(`/showtimes/${id}/admin-seats`);
  },

  // Khóa / Mở khóa bảo trì ghế vật lý cho suất chiếu (Admin)
  setSeatMaintenance: async (id, seatId, maintenance) => {
    return await axiosInstance.put(`/showtimes/${id}/seats/${seatId}/maintenance`, { maintenance });
  },
};

export default useShowtimes;
