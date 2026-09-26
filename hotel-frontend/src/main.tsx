import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';

/**
 * Shared cache for server data.
 *
 * Until now the app hand-rolled `useState` + `useEffect` + a service call on
 * every page, so nothing was shared, nothing was cached, and navigating away
 * and back refetched from zero. `@tanstack/react-query` was already a
 * dependency but was never wired up.
 *
 * Defaults chosen for how this app is used:
 * - `staleTime` 30s: room lists and task queues do not change second to second,
 *   so a page revisited within half a minute renders from cache.
 * - `refetchOnWindowFocus` off: staff alt-tab constantly, and refetching every
 *   board on focus made the Network tab look far busier than the app warranted.
 * - `retry` 1: enough to ride out a blip without stacking slow retries on an
 *   endpoint that is genuinely down.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
