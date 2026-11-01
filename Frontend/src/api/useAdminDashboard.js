import axiosInstance from './axiosInstance';

export const useAdminDashboard = {
  getOverview: (params) => axiosInstance.get('/reports/overview', { params }),
  getTopMovies: (params) => axiosInstance.get('/reports/top-movies', { params }),
};

export default useAdminDashboard;
