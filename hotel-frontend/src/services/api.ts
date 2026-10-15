import axios from 'axios';

// The backend serves its endpoints under /api. Vercel deployments have
// occasionally been configured with only the Render origin, which sends
// requests to /auth/... and bypasses both the API routes and their CORS rules.
const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
const apiBaseURL = configuredBaseURL && !/\/api$/i.test(configuredBaseURL)
  ? `${configuredBaseURL}/api`
  : configuredBaseURL;

const api = axios.create({
  baseURL: apiBaseURL,
  // Axios defaults to no timeout, so a slow endpoint used to hang the UI
  // indefinitely with no error to show. Generous, because some dashboard
  // endpoints legitimately take several seconds — this is a backstop against
  // a request that never comes back, not a performance budget.
  timeout: 30_000,
});

/** Retry a request once when a sleeping backend or its proxy briefly fails. */
export async function withTransientRetry<T>(request: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      const temporaryFailure = axios.isAxiosError(error)
        && (!error.response || [502, 503, 504].includes(error.response.status));
      if (attempt >= 1 || !temporaryFailure) throw error;
      await new Promise<void>((resolve) => window.setTimeout(resolve, 2_000));
    }
  }
}

// No `Content-Type` is set here on purpose. Declaring `application/json` on the
// instance made axios send it on GETs with no body, which is not a CORS-safelisted
// value and so forced an OPTIONS preflight on every public request. Axios sets the
// header itself when there is an actual JSON body.
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('hotel_session_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

export default api;

