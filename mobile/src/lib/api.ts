import axios from 'axios';
import {useAuthStore} from '../store/authStore';

const API_URL = (process.env.API_URL as string) ?? 'http://192.168.1.103:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',  // Accept GZip compressed responses
  },
  timeout: 15000,  // 15s timeout — fail fast rather than hang
});

// Attach JWT on every request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle auth expiry and network errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearToken();
    }
    // Improve error messages for network failures
    if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    }
    return Promise.reject(error);
  },
);
