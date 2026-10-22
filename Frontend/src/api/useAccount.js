import axiosInstance from './axiosInstance';

const unwrap = (response) => response.data;

const request = async (operation) => {
  try {
    return unwrap(await operation());
  } catch (error) {
    const responseData = error.response?.data;
    const validationMessage = Object.values(responseData?.errors ?? {})[0]?.[0];
    const message = responseData?.message
      || responseData?.detail
      || validationMessage
      || responseData?.title;
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

  async clerkSync(clerkToken) {
    return request(() =>
      axiosInstance.post(
        '/auth/clerk-sync',
        {},
        {
          headers: {
            Authorization: `Bearer ${clerkToken}`,
          },
        }
      )
    );
  },
  async getProfile() {
    return request(() => axiosInstance.get('/users/profile'));
  },

  async updateProfile(payload) {
    return request(() => axiosInstance.put('/users/profile', payload));
  },

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    return request(() => axiosInstance.post('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },

  async changePassword(payload) {
    return request(() => axiosInstance.put('/users/change-password', payload));
  },

  async forgotPassword(email) {
    return request(() => axiosInstance.post('/auth/forgot-password', { email }));
  },

  async resetPassword(token, newPassword) {
    return request(() => axiosInstance.post('/auth/reset-password', { token, newPassword }));
  },

  async getUsers() {
    return request(() => axiosInstance.get('/users'));
  },

  async getAdminUsers(params) {
    return request(() => axiosInstance.get('/admin/users', { params }));
  },

  async getAdminUser(id) {
    return request(() => axiosInstance.get(`/admin/users/${id}`));
  },

  async createAdminUser(payload) {
    return request(() => axiosInstance.post('/admin/users', payload));
  },

  async updateAdminUser(id, payload) {
    return request(() => axiosInstance.put(`/admin/users/${id}`, payload));
  },

  async deleteAdminUser(id, hardDelete = false) {
    return request(() => axiosInstance.delete(`/admin/users/${id}`, {
      params: hardDelete ? { hardDelete: true } : undefined,
    }));
  },

  async restoreAdminUser(id) {
    return request(() => axiosInstance.patch(`/admin/users/${id}/restore`));
  },
};

export function useAccount() {
  return accountApi;
}

export default accountApi;
