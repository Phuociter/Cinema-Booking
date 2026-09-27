import axiosInstance from './axiosInstance';

/**
 * API Module: Cinemas, Auditoriums & Physical Seats
 * Phụ trách: Dev B
 *
 * Quản lý:
 * - Danh sách cụm rạp
 * - Chi tiết cụm rạp
 * - Danh sách ghế của phòng chiếu
 */

export const useCinemas = {

    // Lấy tất cả cụm rạp, có thể lọc theo thành phố
    getAllCinemas: async (city = '') => {
        return await axiosInstance.get('/cinemas', {
            params: city ? { city } : {}
        });
    },

    // Lấy thông tin chi tiết một cụm rạp
    getCinemaById: async (id) => {
        return await axiosInstance.get(`/cinemas/${id}`);
    },

    // Lấy danh sách ghế của một phòng chiếu
    getAuditoriumSeats: async (auditoriumId) => {
        return await axiosInstance.get(
            `/auditoriums/${auditoriumId}/seats`
        );
    }
};

export default useCinemas;