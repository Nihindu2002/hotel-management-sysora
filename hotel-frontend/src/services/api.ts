import axios from 'axios';
import { getAuth } from 'firebase/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const user = getAuth().currentUser;

  if (user) {
    const token = await user.getIdToken();

    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

