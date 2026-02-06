// Civic Challenge types for the news module

export type ChallengeCategory = 
  | 'environment' 
  | 'housing' 
  | 'transport' 
  | 'public_safety' 
  | 'governance' 
  | 'education' 
  | 'health' 
  | 'climate';

export type ChallengeSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ChallengeStatus = 'active' | 'expired' | 'flagged' | 'hidden';

export interface Challenge {
  id: string;
  
  // Source article info
  source_uri: string;
  source_url: string;
  source_title: string | null;
  article_title: string;
  article_image: string | null;
  published_at: string;
  
  // AI-generated content
  title: string;
  summary: string;
  call_to_action: string | null;
  category: ChallengeCategory;
  subcategory: string | null;
  severity: ChallengeSeverity;
  skills_needed: string[];
  
  // Location
  location_name: string;
  location_city: string | null;
  location_country: string | null;
  latitude: number;
  longitude: number;
  geocode_query: string | null;
  
  // Metadata
  sentiment: number | null;
  language: string | null;
  status: ChallengeStatus;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

// Challenge for map display (lightweight)
export interface ChallengeForMap {
  id: string;
  title: string;
  summary: string;
  call_to_action: string | null;
  category: ChallengeCategory;
  subcategory: string | null;
  severity: ChallengeSeverity;
  skills_needed: string[];
  location_name: string;
  latitude: number;
  longitude: number;
  source_url: string;
  source_title: string | null;
  article_image: string | null;
  published_at: string;
  created_at: string;
}

// Category stats for filter UI
export interface ChallengeCategoryStats {
  category: ChallengeCategory;
  count: number;
  critical_count: number;
  high_count: number;
  new_24h: number;
}

// Category display info
export interface ChallengeCategoryInfo {
  name: ChallengeCategory;
  label: string;
  icon: string;
  color: string;
  description: string;
}

// Challenge filters
export interface ChallengeFilters {
  categories?: ChallengeCategory[];
  severity?: ChallengeSeverity | null;
  searchQuery?: string;
}

// Bounding box for map queries
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Geocode cache entry
export interface GeocodeCacheEntry {
  query: string;
  latitude: number;
  longitude: number;
  display_name: string | null;
  cached_at: string;
}

// AI Processing result from OpenRouter
export interface AIChallengeAnalysis {
  is_civic_challenge: boolean;
  reason?: string;
  location?: {
    specific: string;
    city: string;
    country: string;
    geocode_query: string;
  };
  category?: ChallengeCategory;
  subcategory?: string;
  title?: string;
  summary?: string;
  call_to_action?: string;
  severity?: ChallengeSeverity;
  skills_needed?: string[];
}

// NewsAPI.ai article
export interface NewsApiArticle {
  uri: string;
  title: string;
  body: string;
  url: string;
  dateTimePub: string;
  lang: string;
  source: {
    uri: string;
    title: string;
  };
  sentiment?: number;
  concepts?: Array<{
    uri: string;
    label: { [lang: string]: string };
    type: string;
  }>;
  categories?: Array<{
    uri: string;
    label: string;
  }>;
  image?: string;
}

// NewsAPI.ai response
export interface NewsApiResponse {
  articles: {
    results: NewsApiArticle[];
    totalResults: number;
    page: number;
    count: number;
    pages: number;
  };
}

// Category configuration for ingestion
export interface NewsCategoryConfig {
  name: ChallengeCategory;
  keywords: string[];
}

// Challenge with nearby entities
export interface ChallengeWithNearby extends Challenge {
  nearby_people?: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    distance_km: number;
  }>;
  nearby_projects?: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    distance_km: number;
  }>;
}

// Severity order for sorting
export const SEVERITY_ORDER: Record<ChallengeSeverity, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

// Category display configuration
export const CHALLENGE_CATEGORIES: ChallengeCategoryInfo[] = [
  {
    name: 'environment',
    label: 'Environment',
    icon: 'Leaf',
    color: '#22c55e', // green-500
    description: 'Pollution, waste, deforestation, and environmental issues',
  },
  {
    name: 'housing',
    label: 'Housing',
    icon: 'Home',
    color: '#f97316', // orange-500
    description: 'Housing crisis, homelessness, evictions, and gentrification',
  },
  {
    name: 'transport',
    label: 'Transport',
    icon: 'Bus',
    color: '#3b82f6', // blue-500
    description: 'Transit, traffic, road safety, and public transport issues',
  },
  {
    name: 'public_safety',
    label: 'Public Safety',
    icon: 'Shield',
    color: '#ef4444', // red-500
    description: 'Crime, emergency services, and community safety',
  },
  {
    name: 'governance',
    label: 'Governance',
    icon: 'Landmark',
    color: '#a855f7', // purple-500
    description: 'Corruption, transparency, and civic participation',
  },
  {
    name: 'education',
    label: 'Education',
    icon: 'GraduationCap',
    color: '#eab308', // yellow-500
    description: 'School funding, education access, and digital divide',
  },
  {
    name: 'health',
    label: 'Health',
    icon: 'Heart',
    color: '#ec4899', // pink-500
    description: 'Healthcare access, mental health, and public health',
  },
  {
    name: 'climate',
    label: 'Climate',
    icon: 'ThermometerSun',
    color: '#14b8a6', // teal-500
    description: 'Floods, droughts, wildfires, and extreme weather',
  },
];

// Get category info by name
export function getCategoryInfo(name: ChallengeCategory): ChallengeCategoryInfo {
  return CHALLENGE_CATEGORIES.find(c => c.name === name) || CHALLENGE_CATEGORIES[0];
}

// Get severity color
export function getSeverityColor(severity: ChallengeSeverity): string {
  const colors: Record<ChallengeSeverity, string> = {
    critical: '#dc2626', // red-600
    high: '#ea580c',     // orange-600
    medium: '#ca8a04',   // yellow-600
    low: '#16a34a',      // green-600
  };
  return colors[severity];
}

// Get severity label
export function getSeverityLabel(severity: ChallengeSeverity): string {
  const labels: Record<ChallengeSeverity, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return labels[severity];
}
