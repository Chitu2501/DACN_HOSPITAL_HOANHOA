import { useQuery, UseQueryOptions } from '@tanstack/react-query';

/**
 * Optimized query hook với caching và staleTime được tối ưu
 * 
 * @param queryKey - Query key
 * @param queryFn - Query function
 * @param options - Additional options với defaults tối ưu
 */
export function useOptimizedQuery<TData = unknown, TError = Error>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Query hook cho dữ liệu realtime (dashboard, notifications)
 */
export function useRealtimeQuery<TData = unknown, TError = Error>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  refetchInterval?: number,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    staleTime: 30 * 1000, // 30 seconds - data is fresh
    gcTime: 2 * 60 * 1000, // 2 minutes - keep in cache
    refetchInterval: refetchInterval || 30000, // Default 30 seconds
    refetchOnWindowFocus: true, // Refetch on focus for realtime data
    refetchOnMount: true,
    retry: 2,
    ...options,
  });
}

/**
 * Query hook cho dữ liệu ít thay đổi (profiles, static data)
 */
export function useStaticQuery<TData = unknown, TError = Error>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    staleTime: 15 * 60 * 1000, // 15 minutes - data is fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if data exists
    retry: 1,
    ...options,
  });
}

