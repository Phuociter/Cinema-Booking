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

  // ----- Admin: CRUD cụm rạp -----
  createCinema: async (data) => await axiosInstance.post('/cinemas', data),
  updateCinema: async (id, data) => await axiosInstance.put(`/cinemas/${id}`, data),
  deleteCinema: async (id) => await axiosInstance.delete(`/cinemas/${id}`),

  // ----- Admin: CRUD phòng chiếu -----
  createAuditorium: async (cinemaId, data) =>
    await axiosInstance.post(`/cinemas/${cinemaId}/auditoriums`, data),
  updateAuditorium: async (id, data) => await axiosInstance.put(`/auditoriums/${id}`, data),
  deleteAuditorium: async (id) => await axiosInstance.delete(`/auditoriums/${id}`),
};

export default useCinemas;