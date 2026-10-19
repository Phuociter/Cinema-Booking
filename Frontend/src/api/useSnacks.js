import axiosInstance from './axiosInstance';

export const useSnacks = {
    getAllSnacks: async () => {
        try {
            const response = await axiosInstance.get('/snacks');
            return response.data || response;
        } catch (error) {
            console.error("Lỗi khi lấy danh sách bắp nước:", error);
            return [];
        }
    },

    getCinemaSnacks: async (cinemaId) => {
        try {
            const response = await axiosInstance.get(`/cinemas/${cinemaId}/snacks`);
            return response.data || response;
        } catch (error) {
            console.error(`Lỗi khi lấy menu bắp nước cho rạp ${cinemaId}:`, error);
            return [];
        }
    }
};

export default useSnacks;