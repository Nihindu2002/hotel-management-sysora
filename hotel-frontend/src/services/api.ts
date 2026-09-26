import axios from 'axios';
import { getAuth } from 'firebase/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // Axios defaults to no timeout, so a slow endpoint used to hang the UI
  // indefinitely with no error to show. Generous, because some dashboard
  // endpoints legitimately take several seconds — this is a backstop against
  // a request that never comes back, not a performance budget.
  timeout: 30_000,
});

// No `Content-Type` is set here on purpose. Declaring `application/json` on the
// instance made axios send it on GETs with no body, which is not a CORS-safelisted
// value and so forced an OPTIONS preflight on every public request. Axios sets the
// header itself when there is an actual JSON body.
api.interceptors.request.use(async (config) => {
  const user = getAuth().currentUser;

  if (user) {
    const token = await user.getIdToken();

    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

