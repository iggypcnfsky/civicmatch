import { loadGoogleMaps } from '@/lib/google/maps-loader';

export interface GeocodeResult {
  lat: number;
  lng: number;
  accuracy: string;
  displayName: string;
  placeId?: string;
  geocodedAt: string;
  source: 'geocoded';
}

export interface LocationObject {
  city?: string;
  country?: string;
  timezone?: string;
  [key: string]: unknown;
}

export class GeocodingService {
  private static instance: GeocodingService;
  private geocoder: google.maps.Geocoder | null = null;
  private cache = new Map<string, GeocodeResult>();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await loadGoogleMaps();
      this.geocoder = new google.maps.Geocoder();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize geocoding service:', error);
      throw new Error('Geocoding service initialization failed');
    }
  }

  public async geocodeLocation(location: string | LocationObject): Promise<GeocodeResult> {
    await this.initialize();

    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(location);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Geocode using Google API
    const result = await this.performGeocode(location);

    // Cache result
    this.cache.set(cacheKey, result);

    return result;
  }

  public async batchGeocode(locations: (string | LocationObject)[]): Promise<(GeocodeResult | null)[]> {
    await this.initialize();

    const results: (GeocodeResult | null)[] = [];
    
    // Process in batches to respect API limits
    const batchSize = 10;
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      const batchPromises = batch.map(async (location) => {
        try {
          return await this.geocodeLocation(location);
        } catch (error) {
          console.warn('Failed to geocode location:', location, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < locations.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  private getCacheKey(location: string | LocationObject): string {
    if (typeof location === 'string') {
      return location.toLowerCase().trim();
    }
    
    // Create consistent key for object locations
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.country) parts.push(location.country);
    return parts.join(', ').toLowerCase().trim();
  }

  private async performGeocode(location: string | LocationObject): Promise<GeocodeResult> {
    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    const address = typeof location === 'string' 
      ? location 
      : this.buildAddressString(location);

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode({ address }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const result = results[0];
          resolve({
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
            accuracy: this.determineAccuracy(result),
            displayName: result.formatted_address,
            placeId: result.place_id,
            geocodedAt: new Date().toISOString(),
            source: 'geocoded'
          });
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  private buildAddressString(location: LocationObject): string {
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.country) parts.push(location.country);
    return parts.join(', ') || 'Unknown Location';
  }

  private determineAccuracy(result: google.maps.GeocoderResult): string {
    // Determine accuracy based on result types
    const types = result.types || [];
    
    if (types.includes('street_address')) return 'ROOFTOP';
    if (types.includes('route')) return 'RANGE_INTERPOLATED';
    if (types.includes('intersection')) return 'GEOMETRIC_CENTER';
    if (types.includes('political')) return 'APPROXIMATE';
    if (types.includes('locality')) return 'APPROXIMATE';
    if (types.includes('administrative_area_level_1')) return 'APPROXIMATE';
    if (types.includes('country')) return 'APPROXIMATE';
    
    return 'APPROXIMATE';
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheSize(): number {
    return this.cache.size;
  }
}

// Convenience function for single geocoding
export async function geocodeLocation(location: string | LocationObject): Promise<GeocodeResult> {
  const service = GeocodingService.getInstance();
  return service.geocodeLocation(location);
}

// Convenience function for batch geocoding
export async function batchGeocodeLocations(locations: (string | LocationObject)[]): Promise<(GeocodeResult | null)[]> {
  const service = GeocodingService.getInstance();
  return service.batchGeocode(locations);
}
