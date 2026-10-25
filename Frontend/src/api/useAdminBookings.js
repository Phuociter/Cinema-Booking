import axiosInstance from './axiosInstance';

export const useAdminBookings = {
  getList: async (params = {}, options = {}) => {
    const cleanParams = {};
    Object.keys(params).forEach((key) => {
      const val = params[key];
      if (val !== undefined && val !== null && val !== '') {
        cleanParams[key] = typeof val === 'string' ? val.trim() : val;
      }
    });

    const res = await axiosInstance.get('/admin/bookings', {
      params: cleanParams,
      signal: options.signal,
    });
    return res?.data ?? res;
  },

  getDetail: async (id, options = {}) => {
    const res = await axiosInstance.get(`/admin/bookings/${id}`, {
      signal: options.signal,
    });
    return res?.data ?? res;
  },
};

export default useAdminBookings;
