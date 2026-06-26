import axios from 'axios';

const api = axios.create({
  baseURL: 'https://orbem-solutions-backend.onrender.com/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('orbem_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('orbem_token');
      localStorage.removeItem('orbem_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;