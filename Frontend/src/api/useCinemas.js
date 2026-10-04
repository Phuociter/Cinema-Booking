import axiosInstance from './axiosInstance';

/**
 * API Module: Cinemas, Auditoriums & Physical Seats (Phụ trách: Dev B)
 * Quản lý toàn bộ API Cụm rạp, Phòng chiếu, Loại ghế và Sơ đồ ghế mẫu
 */
export const useCinemas = {
  // Lấy danh sách cụm rạp (hỗ trợ lọc theo thành phố)
  getCinemas: async (city = null) => {
    const params = city ? { city } : {};
    return await axiosInstance.get('/cinemas', { params });
  },

  // Chi tiết rạp theo ID
  getCinemaById: async (id) => {
    return await axiosInstance.get(`/cinemas/${id}`);
  },

  // Lấy danh sách ghế vật lý của phòng chiếu
  getSeatsByAuditoriumId: async (auditoriumId) => {
    return await axiosInstance.get(`/auditoriums/${auditoriumId}/seats`);
  },
};

export default useCinemas;
