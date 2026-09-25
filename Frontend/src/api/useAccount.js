import axiosInstance from './axiosInstance';

const unwrap = (response) => response.data;

const request = async (operation) => {
  try {
    return unwrap(await operation());
  } catch (error) {
    const message = error.response?.data?.message;
    if (message) throw new Error(message);
    if (!error.response) throw new Error('Không thể kết nối đến máy chủ');
    throw new Error(`Yêu cầu thất bại (${error.response.status})`);
  }
};

export const accountApi = {
  async register(payload) {
    return request(() => axiosInstance.post('/auth/register', payload));
  },

  async login(payload) {
    return request(() => axiosInstance.post('/auth/login', payload));
  },

  async getProfile() {
    return request(() => axiosInstance.get('/auth/me'));
  },

  async updateProfile(payload) {
    return request(() => axiosInstance.put('/users/profile', payload));
  },

  async changePassword(payload) {
    return request(() => axiosInstance.put('/users/change-password', payload));
  },

  async getUsers() {
    return request(() => axiosInstance.get('/users'));
  }
};

export function useAccount() {
  return accountApi;
}

export default accountApi;
