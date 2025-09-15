/**
 * Profile Quality Control Types
 * 
 * Defines interfaces for profile quality assessment and enhanced profile types
 * used across the CivicMatch platform for quality control.
 */

export interface ProfileQualityInfo {
  userId: string;
  completionPercentage: number;
  isQualityProfile: boolean; // >= 50% complete
  missingFields: string[];
}

export interface BaseProfile {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  tags?: string[];
  username?: string;
  created_at?: string;
}

export interface ProfileWithQuality extends BaseProfile {
  qualityInfo: ProfileQualityInfo;
}

export interface ProfileWithLocation extends ProfileWithQuality {
  location: {
    coordinates?: { lat: number; lng: number; accuracy: string };
    displayName?: string;
    placeId?: string;
    source?: 'places_autocomplete' | 'geocoded' | 'manual';
    geocodedAt?: string;
    raw: string | object; // original location data (legacy)
    needsUpdate?: boolean; // true for legacy string locations
  };
}

// Database row interface for type safety
export interface ProfileRow {
  user_id: string;
  username: string;
  data: Record<string, unknown>;
  created_at?: string;
}

// Quality filtering options
export interface QualityFilterOptions {
  qualityOnly?: boolean;
  includeQualityInfo?: boolean;
  threshold?: number; // Custom threshold (default 50)
}

// API response interfaces
export interface QualityProfilesResponse {
  profiles: ProfileWithQuality[];
  hasMore: boolean;
  nextOffset?: number;
  totalCount?: number;
}
