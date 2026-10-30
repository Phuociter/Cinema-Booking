import axiosInstance from './axiosInstance';

const useActors = {
  getActors: async ({ search = '', page = 1, pageSize = 12 } = {}) => {
    return axiosInstance.get('/actors', {
      params: { search, page, pageSize }
    });
  },

  getAllActors: async (search = '') => {
    return axiosInstance.get('/actors', {
      params: { all: true, search }
    });
  },

  getActorById: async (id) => {
    return axiosInstance.get(`/actors/${id}`);
  },

  createActor: async (payload) => {
    return axiosInstance.post('/actors', payload);
  },

  updateActor: async (id, payload) => {
    return axiosInstance.put(`/actors/${id}`, payload);
  },

  deleteActor: async (id) => {
    return axiosInstance.delete(`/actors/${id}`);
  }
};

export default useActors;
