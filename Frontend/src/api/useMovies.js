
import axiosInstance from './axiosInstance';

const useMovies = {
    async getAllMovies({ status, search, page = 1, pageSize = 12 } = {}) {
        const params = { page, pageSize };

        if (status) params.status = status;
        if (search) params.search = search;

        return axiosInstance.get('/movies', { params });
    },

    async getMovieById(id) {
        if (!id) throw new Error('ID phim không được để trống');
        return axiosInstance.get(`/movies/${encodeURIComponent(id)}`);
    },

    async getGenres() {
        return axiosInstance.get('/genres');
    },

    async createMovie(data) {
        return axiosInstance.post('/movies', data);
    },

    async updateMovie(id, data) {
        if (!id) throw new Error('ID phim không được để trống');
        return axiosInstance.put(`/movies/${encodeURIComponent(id)}`, data);
    },

    async deleteMovie(id) {
        if (!id) throw new Error('ID phim không được để trống');
        return axiosInstance.delete(`/movies/${encodeURIComponent(id)}`);
    },

    async getTopMoviesReport() {
        return axiosInstance.get('/movies/reports/top');
    },
};

export { useMovies };
export default useMovies;
