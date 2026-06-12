import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Attach admin token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Attach student ID automatically
api.interceptors.request.use((config) => {
  const studentId = sessionStorage.getItem('studentId');
  if (studentId) config.headers['x-student-id'] = studentId;
  return config;
});

// Retry once on network error (Render cold start)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    if (!config || config._retry) return Promise.reject(err);

    if (!err.response || err.code === 'ECONNABORTED' || err.response?.status >= 500) {
      config._retry = true;
      await new Promise((res) => setTimeout(res, 3000));
      return api(config);
    }
    return Promise.reject(err);
  }
);

export default api;