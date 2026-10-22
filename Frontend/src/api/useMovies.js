import axiosInstance from './axiosInstance';

const useMovies = {
    async getAllMovies({
        status,
        search,
        genre,
        city,
        cinemaId,
        sortBy = 'latest',
        page = 1,
        pageSize = 12
    } = {}) {
        const params = {
            page,
            pageSize,
            sortBy
        };

        const optionalParams = {
            status,
            search,
            genre: genre && genre !== 'all' ? genre : undefined,
            city,
            cinemaId
        };

        for (const [key, value] of Object.entries(optionalParams)) {
            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ''
            ) {
                params[key] = String(value).trim();
            }
        }

        return axiosInstance.get('/movies', { params });
    },

    async getMovieById(id) {
        if (!id) {
            throw new Error('ID phim không được để trống');
        }

        return axiosInstance.get(`/movies/${encodeURIComponent(id)}`);
    },

    async getCinemas() {
        return axiosInstance.get('/cinemas');
    },

    async getGenres() {
        return axiosInstance.get('/genres');
    },

    async createMovie(data) {
        return axiosInstance.post('/movies', data);
    },

    async updateMovie(id, data) {
        if (!id) {
            throw new Error('ID phim không được để trống');
        }

        return axiosInstance.put(
            `/movies/${encodeURIComponent(id)}`,
            data
        );
    },

    async deleteMovie(id) {
        if (!id) {
            throw new Error('ID phim không được để trống');
        }

        return axiosInstance.delete(
            `/movies/${encodeURIComponent(id)}`
        );
    },

    async getTopMoviesReport(top = 5) {
        if (top !== 5 && top !== 10) {
            throw new Error('top chỉ nhận giá trị 5 hoặc 10');
        }
        return axiosInstance.get('/reports/top-movies', { params: { top } });
    }
};

export { useMovies };
export default useMovies;

