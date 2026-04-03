import {QueryClient} from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes before considering it stale
      staleTime: 1000 * 60 * 5,
      // Keep unused data in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Retry failed requests twice with exponential backoff
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      // Refetch when window regains focus (user comes back to app)
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect — WatermelonDB sync handles that
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
