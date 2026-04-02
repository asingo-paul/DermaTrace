import axios from 'axios';
import {useAuthStore} from '../store/authStore';

const API_URL = (process.env.API_URL as string) ?? 'http://192.168.1.103:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {'Content-Type': 'application/json'},
});

// Attach JWT on every request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear auth state (navigation handled by RootNavigator reacting to null token)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearToken();
    }
    return Promise.reject(error);
  },
);
