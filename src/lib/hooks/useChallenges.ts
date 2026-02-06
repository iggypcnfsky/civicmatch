// React hook for fetching and managing civic challenges

import { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  ChallengeForMap, 
  ChallengeCategory, 
  ChallengeSeverity,
  ChallengeCategoryStats,
  BoundingBox 
} from '@/types/challenge';

interface UseChallengesOptions {
  enabled?: boolean;
  categories?: ChallengeCategory[];
  severity?: ChallengeSeverity | null;
  limit?: number;
  debounceMs?: number;
}

interface UseChallengesReturn {
  challenges: ChallengeForMap[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useChallenges(
  bounds: BoundingBox | null,
  options: UseChallengesOptions = {}
): UseChallengesReturn {
  const {
    enabled = true,
    categories,
    severity,
    limit = 100,
    debounceMs = 800, // Increased debounce to reduce API calls
  } = options;

  const [challenges, setChallenges] = useState<ChallengeForMap[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce bounds to prevent excessive API calls during map movement
  const debouncedBounds = useDebounce(bounds, debounceMs);
  
  // Track the padded bounds of the last successful fetch
  // Skip re-fetch when the viewport is still inside these bounds
  const lastFetchBoundsRef = useRef<BoundingBox | null>(null);
  
  // Track last error to allow retry on same bounds
  const lastErrorBoundsRef = useRef<BoundingBox | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Track retry attempt count
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset cached fetch bounds when filters change to force a re-fetch
  useEffect(() => {
    lastFetchBoundsRef.current = null;
    lastErrorBoundsRef.current = null;
    retryCountRef.current = 0;
  }, [categories, severity]);

  const fetchChallenges = useCallback(async (isRetry = false) => {
    if (!debouncedBounds || !enabled) {
      setChallenges([]);
      lastFetchBoundsRef.current = null;
      lastErrorBoundsRef.current = null;
      return;
    }

    // Skip fetch if current viewport is still inside the previously-fetched padded bounds
    // BUT: allow retry if the previous fetch at these bounds failed
    const prev = lastFetchBoundsRef.current;
    const prevError = lastErrorBoundsRef.current;
    
    const isSameAsError = prevError &&
      debouncedBounds.north === prevError.north &&
      debouncedBounds.south === prevError.south &&
      debouncedBounds.east === prevError.east &&
      debouncedBounds.west === prevError.west;
    
    if (!isRetry && prev &&
      debouncedBounds.north <= prev.north &&
      debouncedBounds.south >= prev.south &&
      debouncedBounds.east <= prev.east &&
      debouncedBounds.west >= prev.west &&
      !isSameAsError
    ) {
      console.log('[useChallenges] Skipping fetch - still inside cached bounds');
      return; // Still inside padded area, no need to re-fetch
    }

    // Expand fetch bounds by 50% of viewport size in each direction
    const latPad = (debouncedBounds.north - debouncedBounds.south) * 0.5;
    const lngPad = (debouncedBounds.east - debouncedBounds.west) * 0.5;
    const fetchBounds: BoundingBox = {
      north: Math.min(debouncedBounds.north + latPad, 90),
      south: Math.max(debouncedBounds.south - latPad, -90),
      east: Math.min(debouncedBounds.east + lngPad, 180),
      west: Math.max(debouncedBounds.west - lngPad, -180),
    };

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        north: fetchBounds.north.toString(),
        south: fetchBounds.south.toString(),
        east: fetchBounds.east.toString(),
        west: fetchBounds.west.toString(),
        limit: limit.toString(),
      });

      if (categories && categories.length > 0) {
        params.set('categories', categories.join(','));
      }

      if (severity) {
        params.set('severity', severity);
      }

      console.log(`[useChallenges] Fetching challenges (attempt ${retryCountRef.current + 1})...`);
      
      const response = await fetch(`/api/challenges?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch challenges (${response.status})`);
      }

      const data = await response.json();
      
      if (isMountedRef.current) {
        console.log(`[useChallenges] Fetched ${data.challenges?.length || 0} challenges`);
        setChallenges(data.challenges || []);
        lastFetchBoundsRef.current = fetchBounds;
        lastErrorBoundsRef.current = null;
        retryCountRef.current = 0;
      }
    } catch (err) {
      console.error('[useChallenges] Error fetching challenges:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        lastErrorBoundsRef.current = debouncedBounds;
        
        // Auto-retry on error (up to MAX_RETRIES)
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          const delay = 1000 * retryCountRef.current; // Exponential backoff
          console.log(`[useChallenges] Retrying in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})...`);
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchChallenges(true);
            }
          }, delay);
        } else {
          console.error('[useChallenges] Max retries reached');
          retryCountRef.current = 0;
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedBounds, enabled, categories, severity, limit]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Manual refetch that forces a re-fetch regardless of bounds
  const refetch = useCallback(() => {
    console.log('[useChallenges] Manual refetch triggered');
    lastFetchBoundsRef.current = null;
    lastErrorBoundsRef.current = null;
    retryCountRef.current = 0;
    fetchChallenges(true);
  }, [fetchChallenges]);

  return {
    challenges,
    loading,
    error,
    refetch,
  };
}

// Hook for fetching category stats
export function useChallengeCategories(): {
  categories: ChallengeCategoryStats[];
  loading: boolean;
  error: string | null;
} {
  const [categories, setCategories] = useState<ChallengeCategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchCategories() {
      try {
        const response = await fetch('/api/challenges/categories');
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        
        if (isMounted) {
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  return { categories, loading, error };
}

// Hook for fetching a single challenge
export function useChallenge(id: string | null): {
  challenge: ChallengeForMap | null;
  loading: boolean;
  error: string | null;
} {
  const [challenge, setChallenge] = useState<ChallengeForMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setChallenge(null);
      return;
    }

    let isMounted = true;

    async function fetchChallenge() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/challenges/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch challenge');
        }

        const data = await response.json();
        
        if (isMounted) {
          setChallenge(data.challenge);
        }
      } catch (err) {
        console.error('Error fetching challenge:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchChallenge();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { challenge, loading, error };
}
