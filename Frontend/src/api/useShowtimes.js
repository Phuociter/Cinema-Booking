
import axiosInstance from './axiosInstance';

/**
 * API suất chiếu, sơ đồ ghế và giữ ghế bằng Redis.
 */
export const useShowtimes = {
    // Lấy danh sách suất chiếu.
    getShowtimes: async (params = {}) => {
        return await axiosInstance.get('/showtimes', { params });
    },

    // Lấy chi tiết suất chiếu.
    getShowtimeById: async (id) => {
        return await axiosInstance.get(`/showtimes/${id}`);
    },

    // Lấy sơ đồ ghế của suất chiếu.
    getShowtimeSeats: async (showtimeId) => {
        return await axiosInstance.get(`/showtimes/${showtimeId}/seats`);
    },

    // Giữ các ghế đã chọn trong 5 phút.
    // Backend yêu cầu người dùng đăng nhập.
    holdSeats: async (showtimeId, showtimeSeatIds) => {
        return await axiosInstance.post(
            `/showtimes/${showtimeId}/seat-holds`,
            {
                showtimeSeatIds,
            }
        );
    },
};

export default useShowtimes;
