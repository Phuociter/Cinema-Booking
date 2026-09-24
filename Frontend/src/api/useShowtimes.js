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
};

export default useShowtimes;
