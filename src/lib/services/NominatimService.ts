// Nominatim (OpenStreetMap) geocoding client
// Docs: https://nominatim.org/release-docs/develop/api/Search/

import type { GeocodeCacheEntry } from '@/types/challenge';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
  address?: {
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

export class NominatimService {
  private userAgent: string;
  private lastRequestTime: number = 0;
  private minDelayMs: number = 1100; // 1.1 seconds = max 1 request per second

  constructor(userAgent: string) {
    this.userAgent = userAgent;
  }

  /**
   * Search for a location by query string
   */
  async search(
    query: string,
    options: {
      limit?: number;
      addressDetails?: boolean;
    } = {}
  ): Promise<NominatimResult[]> {
    const { limit = 1, addressDetails = true } = options;

    // Rate limiting - ensure at least 1 second between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelayMs) {
      await sleep(this.minDelayMs - timeSinceLastRequest);
    }

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: limit.toString(),
      addressdetails: addressDetails ? '1' : '0',
    });

    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
      },
    });

    this.lastRequestTime = Date.now();

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nominatim error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Geocode a single query with fallback to city+country
   */
  async geocode(
    query: string,
    fallback?: { city: string; country: string }
  ): Promise<{ lat: number; lng: number; display_name: string } | null> {
    // Try primary query
    const results = await this.search(query);
    
    if (results.length > 0) {
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
        display_name: results[0].display_name,
      };
    }

    // Fallback to city + country if provided
    if (fallback) {
      const fallbackQuery = `${fallback.city}, ${fallback.country}`;
      const fallbackResults = await this.search(fallbackQuery);
      
      if (fallbackResults.length > 0) {
        return {
          lat: parseFloat(fallbackResults[0].lat),
          lng: parseFloat(fallbackResults[0].lon),
          display_name: fallbackResults[0].display_name,
        };
      }
    }

    return null;
  }

  /**
   * Geocode with caching support
   */
  async geocodeWithCache(
    query: string,
    cacheLookup: (query: string) => Promise<GeocodeCacheEntry | null>,
    cacheStore: (entry: Omit<GeocodeCacheEntry, 'cached_at'>) => Promise<void>,
    fallback?: { city: string; country: string }
  ): Promise<{ lat: number; lng: number; display_name: string } | null> {
    // Check cache first
    const cached = await cacheLookup(query);
    if (cached) {
      return {
        lat: cached.latitude,
        lng: cached.longitude,
        display_name: cached.display_name || query,
      };
    }

    // Geocode
    const result = await this.geocode(query, fallback);
    
    if (result) {
      // Store in cache
      await cacheStore({
        query,
        latitude: result.lat,
        longitude: result.lng,
        display_name: result.display_name,
      });
    }

    return result;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Factory function for server-side usage
export function createNominatimService(): NominatimService {
  const userAgent = process.env.NOMINATIM_USER_AGENT || 'CivicMatch/1.0 (contact@civicmatch.com)';
  return new NominatimService(userAgent);
}
