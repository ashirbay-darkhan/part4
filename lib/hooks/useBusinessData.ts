import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { toast } from 'sonner';

// Define types for cache entries
interface CacheEntry<T> {
  data: T[];
  timestamp: number;
  businessId: string;
}

// Global cache object to persist data between component renders and navigation
const dataCache: Record<string, CacheEntry<any>> = {};

// Cache expiration time in ms (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Enhanced generic data fetching hook with caching and improved error handling
export function useBusinessData<T>(
  fetchFunction: (businessId: string) => Promise<T[]>,
  options: {
    dependencies?: any[];
    cacheKey?: string;
    cacheDuration?: number;
    skipCache?: boolean;
    retryCount?: number;
    retryDelay?: number;
  } = {}
) {
  // Destructure options with defaults
  const {
    dependencies = [],
    cacheKey,
    cacheDuration = CACHE_EXPIRATION,
    skipCache = false,
    retryCount = 2,
    retryDelay = 1000
  } = options;

  // State for data, loading, and error
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get user from auth context
  const { user } = useAuth();
  
  // Store current retry attempt
  const retryAttemptRef = useRef(0);

  // Generate a unique cache key if not provided
  const effectiveCacheKey = cacheKey || fetchFunction.name;
  
  // Fetch data function wrapped in useCallback for memoization
  const fetchData = useCallback(async (forceRefresh = false) => {
    // Validate business ID
    if (!user?.businessId) {
      setIsLoading(false);
      setError('No business ID found');
      return;
    }

    // Check cache first unless skipCache or forceRefresh is true
    if (!skipCache && !forceRefresh) {
      const cachedData = dataCache[effectiveCacheKey];
      const now = Date.now();
      
      if (
        cachedData && 
        cachedData.businessId === user.businessId && 
        now - cachedData.timestamp < cacheDuration
      ) {
        // Use cached data if available and not expired
        setData(cachedData.data);
        setIsLoading(false);
        setError(null);
        return;
      }
    }

    // Set loading state
    setIsLoading(true);
    
    // Helper function for retries
    const attemptFetch = async (attempt: number): Promise<T[]> => {
      try {
        const result = await fetchFunction(user.businessId);
        return result;
      } catch (err) {
        // If we have retries left, try again after delay
        if (attempt < retryCount) {
          console.log(`Retry attempt ${attempt + 1} for ${effectiveCacheKey}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptFetch(attempt + 1);
        }
        // Otherwise, re-throw the error
        throw err;
      }
    };

    try {
      // Reset error
      setError(null);
      
      // Fetch data with retry logic
      const result = await attemptFetch(0);
      
      // Update state with fetched data
      setData(result);
      
      // Update cache
      dataCache[effectiveCacheKey] = {
        data: result,
        timestamp: Date.now(),
        businessId: user.businessId
      };
      
    } catch (err) {
      console.error(`Error fetching data (${effectiveCacheKey}):`, err);
      
      // Set error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      
      // Show toast notification only once
      toast.error(errorMessage);
      
      // Use stale data if available rather than empty state
      if (dataCache[effectiveCacheKey]?.businessId === user.businessId) {
        console.log('Using stale cached data');
        setData(dataCache[effectiveCacheKey].data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, effectiveCacheKey, fetchFunction, skipCache, cacheDuration, retryCount, retryDelay]);

  // Run effect when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData, user, ...dependencies]);

  // Allow manual refresh of data
  const refetch = useCallback(() => fetchData(true), [fetchData]);
  
  // Get isStale status
  const isStale = useCallback(() => {
    const cachedData = dataCache[effectiveCacheKey];
    if (!cachedData || cachedData.businessId !== user?.businessId) {
      return true;
    }
    return Date.now() - cachedData.timestamp >= cacheDuration;
  }, [effectiveCacheKey, cacheDuration, user]);

  // Clear cache for this key
  const clearCache = useCallback(() => {
    delete dataCache[effectiveCacheKey];
  }, [effectiveCacheKey]);

  return { 
    data, 
    isLoading, 
    error, 
    refetch,
    isStale: isStale(),
    clearCache
  };
}