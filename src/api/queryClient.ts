import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute default for ERP operational data
      gcTime: 300_000, // 5 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: false, // Prevents unexpected refetches during multi-tab ERP sessions
    },
    mutations: {
      retry: 0, // Never auto-retry mutations to prevent duplicate records or charges
    },
  },
});

/**
 * Authentication and Cache Isolation:
 * Clears all cached server state from memory upon logout or auth expiration.
 */
export function clearAppCache(): void {
  queryClient.clear();
}
