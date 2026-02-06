// Hook for fetching and managing events
// Supports both user-submitted and discovered events

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DiscoveredEvent, CombinedEvent, EventFilters, DiscoveredEventsStats } from '@/types/discoveredEvent';

interface UseEventsOptions {
  upcoming?: boolean;
  limit?: number;
  source?: ('user_submitted' | 'discovered')[];
}

interface UseEventsReturn {
  events: CombinedEvent[];
  discoveredEvents: DiscoveredEvent[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
  stats: DiscoveredEventsStats | null;
}

export function useEvents(options: UseEventsOptions = {}): UseEventsReturn {
  const { upcoming = true, limit = 20 } = options;
  
  const [events, setEvents] = useState<CombinedEvent[]>([]);
  const [discoveredEvents, setDiscoveredEvents] = useState<DiscoveredEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState<DiscoveredEventsStats | null>(null);

  const fetchEvents = useCallback(async (currentOffset: number, append: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch combined events
      const response = await fetch(
        `/api/events/combined?upcoming=${upcoming}&limit=${limit}&offset=${currentOffset}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      
      if (append) {
        setEvents(prev => [...prev, ...data.events]);
      } else {
        setEvents(data.events);
      }
      
      setHasMore(data.pagination?.hasMore ?? false);

      // Also fetch discovered events separately for filtering
      const discoveredResponse = await fetch(
        `/api/events/discovered?upcoming=${upcoming}&limit=${limit}`
      );

      if (discoveredResponse.ok) {
        const discoveredData = await discoveredResponse.json();
        setDiscoveredEvents(discoveredData.events);
      }

      // Fetch stats
      const statsResponse = await fetch('/api/events/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [upcoming, limit]);

  // Initial fetch
  useEffect(() => {
    fetchEvents(0, false);
  }, [fetchEvents]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const newOffset = offset + limit;
      setOffset(newOffset);
      fetchEvents(newOffset, true);
    }
  }, [isLoading, hasMore, offset, limit, fetchEvents]);

  const refetch = useCallback(() => {
    setOffset(0);
    fetchEvents(0, false);
  }, [fetchEvents]);

  return {
    events,
    discoveredEvents,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
    stats,
  };
}

interface UseDiscoveredEventsOptions {
  upcoming?: boolean;
  type?: string[];
  tags?: string[];
  city?: string;
  country?: string;
  online?: boolean;
  min_relevance?: number;
  limit?: number;
}

interface UseDiscoveredEventsReturn {
  events: DiscoveredEvent[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useDiscoveredEvents(options: UseDiscoveredEventsOptions = {}): UseDiscoveredEventsReturn {
  const {
    upcoming = true,
    type,
    tags,
    city,
    country,
    online,
    min_relevance = 60,
    limit = 20,
  } = options;

  const [events, setEvents] = useState<DiscoveredEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const buildQueryString = useCallback((currentOffset: number) => {
    const params = new URLSearchParams();
    params.set('upcoming', upcoming.toString());
    params.set('limit', limit.toString());
    params.set('offset', currentOffset.toString());
    params.set('min_relevance', min_relevance.toString());
    
    if (type?.length) params.set('type', type.join(','));
    if (tags?.length) params.set('tags', tags.join(','));
    if (city) params.set('city', city);
    if (country) params.set('country', country);
    if (online !== undefined) params.set('online', online.toString());
    
    return params.toString();
  }, [upcoming, type, tags, city, country, online, min_relevance, limit]);

  const fetchEvents = useCallback(async (currentOffset: number, append: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/events/discovered?${buildQueryString(currentOffset)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch discovered events');
      }

      const data = await response.json();
      
      if (append) {
        setEvents(prev => [...prev, ...data.events]);
      } else {
        setEvents(data.events);
      }
      
      setHasMore(data.pagination?.hasMore ?? false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString]);

  // Fetch when options change
  useEffect(() => {
    setOffset(0);
    fetchEvents(0, false);
  }, [fetchEvents]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const newOffset = offset + limit;
      setOffset(newOffset);
      fetchEvents(newOffset, true);
    }
  }, [isLoading, hasMore, offset, limit, fetchEvents]);

  const refetch = useCallback(() => {
    setOffset(0);
    fetchEvents(0, false);
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

interface UseMapEventsOptions {
  bounds: { north: number; south: number; east: number; west: number } | null;
  types?: string[];
  min_relevance?: number;
}

interface UseMapEventsReturn {
  events: DiscoveredEvent[];
  isLoading: boolean;
  error: string | null;
}

export function useMapEvents(options: UseMapEventsOptions): UseMapEventsReturn {
  const { bounds, types, min_relevance = 60 } = options;
  
  const [events, setEvents] = useState<DiscoveredEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bounds) return;

    const fetchMapEvents = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          north: bounds.north.toString(),
          south: bounds.south.toString(),
          east: bounds.east.toString(),
          west: bounds.west.toString(),
          min_relevance: min_relevance.toString(),
        });

        if (types?.length) {
          params.set('type', types.join(','));
        }

        const response = await fetch(`/api/events/map?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch map events');
        }

        const data = await response.json();
        setEvents(data.events);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapEvents();
  }, [bounds, types, min_relevance]);

  return { events, isLoading, error };
}
