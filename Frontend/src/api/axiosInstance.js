import axios from 'axios';

// Base URL kết nối tới Backend ASP.NET Core 8 Web API (Port 5000)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'cinema_access_token';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Đính kèm JWT token vào Header nếu có
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Chuẩn hóa dữ liệu & tương thích cả 2 cách gọi
axiosInstance.interceptors.response.use(
  (response) => {
    // Tạo alias .data trỏ về chính nó:
    // Vừa cho phép truy cập trực tiếp res.items (Dev C), vừa tương thích hàm unwrap(res) => res.data (Dev E)
    if (response.data && typeof response.data === 'object' && !('data' in response.data)) {
      Object.defineProperty(response.data, 'data', {
        value: response.data,
        enumerable: false,
        configurable: true,
      });
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('cinema_user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('cinema:auth-expired'));
    }
    return Promise.reject(error);
  }
);

export { API_BASE_URL, TOKEN_KEY };
export default axiosInstance;
