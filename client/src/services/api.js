import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout'),
};

// Room Category APIs
export const roomCategoryAPI = {
  getAll: () => api.get('/rooms/category'),
  getOne: (id) => api.get(`/rooms/category/${id}`),
  create: (data) => api.post('/rooms/category', data),
  update: (id, data) => api.put(`/rooms/category/${id}`, data),
  delete: (id) => api.delete(`/rooms/category/${id}`),
};

// Room APIs
export const roomAPI = {
  getAll: (params) => api.get('/rooms', { params }),
  getOne: (id) => api.get(`/rooms/${id}`),
  create: (data) => api.post('/rooms', data),
  bulkCreate: (data) => api.post('/rooms/bulk', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  updateStatus: (id, status) => api.patch(`/rooms/${id}/status`, { status }),
  delete: (id) => api.delete(`/rooms/${id}`),
};

// Booking APIs
export const bookingAPI = {
  checkAvailability: (data) => api.post('/bookings/check-availability', data),
  create: (data) => api.post('/bookings', data),
  getAll: (params) => api.get('/bookings', { params }),
  getOne: (id) => api.get(`/bookings/${id}`),
  getByReference: (reference) => api.get(`/bookings/reference/${reference}`),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`),
  checkIn: (id, data) => api.post(`/bookings/${id}/check-in`, data),
  checkOut: (id, data) => api.post(`/bookings/${id}/check-out`, data),
  markNoShow: (id) => api.patch(`/bookings/${id}/no-show`),
  getStats: (params) => api.get('/bookings/stats', { params }),
  getCheckedIn: () => api.get('/bookings/checked-in'),
  getTodayCheckIns: () => api.get('/bookings/today/check-ins'),
  getTodayCheckOuts: () => api.get('/bookings/today/check-outs'),
  getUpcomingCheckIns: (days) => api.get('/bookings/upcoming-checkins', { params: { days } }),
  getUpcomingCheckOuts: (days) => api.get('/bookings/upcoming-checkouts', { params: { days } }),
};

export default api;
