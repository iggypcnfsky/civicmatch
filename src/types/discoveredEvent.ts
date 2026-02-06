// Discovered Event Types
// Types for civic tech events discovered via automated sources (Brave Search, NewsAPI.ai)

export type EventType = 'conference' | 'hackathon' | 'meetup' | 'workshop' | 'summit' | 'webinar' | 'training' | 'festival' | 'other';
export type EventCost = 'free' | 'paid' | 'donation' | 'unknown';
export type EventStatus = 'active' | 'expired' | 'flagged' | 'hidden' | 'merged';
export type EventSourceType = 'brave_search' | 'newsapi' | 'eventseye';
export type AIConfidence = 'complete' | 'partial' | 'low';

/**
 * Discovered event database row
 */
export interface DiscoveredEvent {
  id: string;
  name: string;
  description: string | null;
  event_type: EventType;
  tags: string[] | null;
  
  start_date: string | null;  // ISO date: YYYY-MM-DD
  end_date: string | null;    // ISO date: YYYY-MM-DD
  start_time: string | null;  // ISO time: HH:MM
  end_time: string | null;    // ISO time: HH:MM
  timezone: string | null;
  
  location_name: string | null;
  location_city: string | null;
  location_country: string | null;
  latitude: number | null;
  longitude: number | null;
  is_online: boolean;
  is_hybrid: boolean;
  
  event_url: string | null;
  registration_url: string | null;
  source_url: string;
  source_type: EventSourceType;
  source_urls: string[] | null;
  
  organizer: string | null;
  cost: EventCost;
  cost_details: string | null;
  
  relevance_score: number | null;  // 0-100
  relevance_reason: string | null;
  ai_confidence: AIConfidence | null;
  
  status: EventStatus;
  merged_into: string | null;
  
  discovered_at: string;
  updated_at: string;
  name_normalized: string | null;
}

/**
 * Discovered event for map display (lightweight)
 */
export interface DiscoveredEventForMap {
  id: string;
  name: string;
  event_type: EventType;
  start_date: string | null;
  end_date: string | null;
  location_city: string | null;
  latitude: number | null;
  longitude: number | null;
  is_online: boolean;
  is_hybrid: boolean;
  relevance_score: number | null;
}

/**
 * Event type display info
 */
export interface EventTypeInfo {
  name: EventType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Combined event (user-submitted or discovered) for display
 */
export interface CombinedEvent {
  id: string;
  name: string;
  description: string | null;
  creator_id: string | null;
  organizer: string | null;
  start_datetime: string;
  end_datetime: string | null;
  location_name: string | null;
  location_city: string | null;
  location_country: string | null;
  latitude: number | null;
  longitude: number | null;
  is_online: boolean;
  is_hybrid: boolean;
  event_type: string | null;
  tags: string[] | null;
  cost: string | null;
  event_url: string | null;
  registration_url: string | null;
  relevance_score: number | null;
  source: 'user_submitted' | 'discovered';
  created_at: string;
  discovered_at: string | null;
}

/**
 * Brave Search API result
 */
export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  page_age?: string;
  meta_url?: {
    hostname?: string;
    favicon?: string;
  };
}

/**
 * Brave Search API response
 */
export interface BraveSearchResponse {
  web: {
    results: BraveSearchResult[];
    total?: number;
  };
}

/**
 * AI-extracted event data
 */
export interface AIEventExtraction {
  is_event: boolean;
  reason?: string;
  event?: {
    name: string;
    start_date: string | null;  // YYYY-MM-DD
    end_date: string | null;    // YYYY-MM-DD
    start_time: string | null;  // HH:MM
    end_time: string | null;    // HH:MM
    timezone: string | null;
    location_name: string | null;
    location_city: string | null;
    location_country: string | null;
    geocode_query: string | null;
    is_online: boolean;
    is_hybrid: boolean;
    registration_url: string | null;
    event_url: string | null;
    organizer: string | null;
    description: string | null;
    cost: EventCost;
    cost_details: string | null;
    event_type: EventType;
    tags: string[];
    relevance_score: number;
    relevance_reason: string;
  };
}

/**
 * Query group configuration for rotating searches
 */
export interface QueryGroupConfig {
  name: string;
  queries: string[];
  runDays: number[];  // 0 = Sunday, 1 = Monday, etc.
}

/**
 * Event filters for API queries
 */
export interface EventFilters {
  upcoming?: boolean;
  type?: EventType[];
  tags?: string[];
  city?: string;
  country?: string;
  online?: boolean;
  min_relevance?: number;
  source?: ('user_submitted' | 'discovered')[];
}

/**
 * Bounding box for map queries
 */
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Event discovery stats
 */
export interface DiscoveredEventsStats {
  active_count: number;
  this_week: number;
  this_month: number;
  new_24h: number;
  brave_search_count: number;
  newsapi_count: number;
  eventseye_count: number;
}

// Event type display configuration
export const EVENT_TYPE_CONFIG: EventTypeInfo[] = [
  {
    name: 'conference',
    label: 'Conference',
    icon: 'Users',
    color: '#3b82f6', // blue-500
    description: 'Large-scale gatherings with talks, panels, and networking',
  },
  {
    name: 'hackathon',
    label: 'Hackathon',
    icon: 'Code',
    color: '#22c55e', // green-500
    description: 'Collaborative coding events to build civic tech solutions',
  },
  {
    name: 'meetup',
    label: 'Meetup',
    icon: 'Coffee',
    color: '#f97316', // orange-500
    description: 'Informal local gatherings of civic tech enthusiasts',
  },
  {
    name: 'workshop',
    label: 'Workshop',
    icon: 'Wrench',
    color: '#a855f7', // purple-500
    description: 'Hands-on learning sessions and skill-building events',
  },
  {
    name: 'summit',
    label: 'Summit',
    icon: 'Mountain',
    color: '#14b8a6', // teal-500
    description: 'High-level strategic gatherings and leadership meetings',
  },
  {
    name: 'webinar',
    label: 'Webinar',
    icon: 'Video',
    color: '#6366f1', // indigo-500
    description: 'Online presentations and virtual learning sessions',
  },
  {
    name: 'training',
    label: 'Training',
    icon: 'GraduationCap',
    color: '#eab308', // yellow-500
    description: 'Educational programs and capacity building sessions',
  },
  {
    name: 'festival',
    label: 'Festival',
    icon: 'PartyPopper',
    color: '#ec4899', // pink-500
    description: 'Large celebratory events with multiple activities',
  },
  {
    name: 'other',
    label: 'Other',
    icon: 'Calendar',
    color: '#6b7280', // gray-500
    description: 'Other civic tech related events',
  },
];

// Query groups for rotating daily searches
export const BRAVE_QUERY_GROUPS: QueryGroupConfig[] = [
  {
    name: 'civic_tech_daily',
    queries: [
      '"civic tech" conference 2026 register',
      '"civic technology" summit upcoming',
      'govtech conference 2026',
      '"civic tech" hackathon 2026',
    ],
    runDays: [0, 1, 2, 3, 4, 5, 6], // Daily
  },
  {
    name: 'democracy_governance',
    queries: [
      '"open government" conference 2026 register',
      '"democratic innovation" summit upcoming',
      '"citizen assembly" workshop 2026',
      '"deliberative democracy" event upcoming',
      '"participatory budgeting" workshop 2026',
    ],
    runDays: [1, 3, 5], // Mon, Wed, Fri
  },
  {
    name: 'social_impact_open_data',
    queries: [
      '"social impact" hackathon 2026 register',
      '"open data day" 2026 event',
      '"code for" brigade meetup upcoming',
      '"tech for good" conference 2026',
      '"data for good" summit upcoming',
    ],
    runDays: [2, 4, 6], // Tue, Thu, Sat
  },
  {
    name: 'europe_regional',
    queries: [
      '"civic tech" event Europe 2026',
      'govtech summit EU 2026',
      '"civic tech" Poland event',
      '"open government" conference Europe upcoming',
    ],
    runDays: [1, 4], // Mon, Thu
  },
  {
    name: 'global_regional',
    queries: [
      '"civic tech" conference USA 2026',
      '"civic tech" Africa event 2026',
      '"civic tech" Asia summit upcoming',
      '"open government" Latin America conference',
    ],
    runDays: [2, 5], // Tue, Fri
  },
  {
    name: 'platform_specific',
    queries: [
      'site:eventbrite.com "civic tech" 2026',
      'site:lu.ma "civic tech"',
      'site:meetup.com "civic technology"',
      'site:eventbrite.com "open government" 2026',
      'site:lu.ma "govtech"',
    ],
    runDays: [3, 6], // Wed, Sat
  },
];

// NewsAPI.ai event keywords
export const NEWSAPI_EVENT_KEYWORDS = [
  'civic tech conference',
  'civic technology summit',
  'govtech event',
  'open government conference',
  'democracy summit',
  'civic hackathon',
  'hack for good',
  'social impact hackathon',
  'code for hackathon',
  'open data conference',
  'open data day',
  'data for good event',
];

// Get event type info
export function getEventTypeInfo(type: EventType): EventTypeInfo {
  return EVENT_TYPE_CONFIG.find(t => t.name === type) || EVENT_TYPE_CONFIG[EVENT_TYPE_CONFIG.length - 1];
}

// Get cost label
export function getCostLabel(cost: EventCost): string {
  const labels: Record<EventCost, string> = {
    free: 'Free',
    paid: 'Paid',
    donation: 'Donation',
    unknown: 'Cost unknown',
  };
  return labels[cost];
}

// Format event dates for display
export function formatEventDates(
  startDate: string | null,
  endDate: string | null,
  startTime: string | null,
  endTime: string | null
): string {
  if (!startDate) return 'Date TBD';
  
  const start = new Date(startDate);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  
  // Add time if available
  if (startTime) {
    const [hours, minutes] = startTime.split(':');
    start.setHours(parseInt(hours), parseInt(minutes));
    options.hour = 'numeric';
    options.minute = '2-digit';
  }
  
  let formatted = start.toLocaleDateString('en-US', options);
  
  if (endDate && endDate !== startDate) {
    const end = new Date(endDate);
    if (endTime) {
      const [hours, minutes] = endTime.split(':');
      end.setHours(parseInt(hours), parseInt(minutes));
    }
    formatted += ` - ${end.toLocaleDateString('en-US', options)}`;
  } else if (endTime && startTime) {
    const end = new Date(startDate);
    const [hours, minutes] = endTime.split(':');
    end.setHours(parseInt(hours), parseInt(minutes));
    formatted += ` - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  return formatted;
}

// Check if event is upcoming
export function isEventUpcoming(startDate: string | null): boolean {
  if (!startDate) return false;
  return new Date(startDate) >= new Date();
}

// Get relevance label
export function getRelevanceLabel(score: number): string {
  if (score >= 90) return 'Core civic tech';
  if (score >= 70) return 'Strongly related';
  if (score >= 50) return 'Related';
  return 'Low relevance';
}
