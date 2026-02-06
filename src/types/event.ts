/**
 * Event Types
 * 
 * Defines interfaces for the Events feature in CivicMatch.
 * Events are global entities that any authenticated user can create and RSVP to.
 */

/**
 * Event location data structure
 */
export interface EventLocation {
  displayName: string;
  coordinates: { lat: number; lng: number };
  placeId?: string;
}

/**
 * Event data structure (stored in JSONB `data` column)
 */
export interface EventData {
  title: string;
  description: string;
  location: EventLocation;
  isOnline: boolean;
  meetingUrl?: string;
  startDateTime: string; // ISO string
  endDateTime?: string; // ISO string
  imageUrl?: string;
}

/**
 * Event database row
 */
export interface EventRow {
  id: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  data: EventData;
}

/**
 * Event with resolved data for display
 */
export interface Event {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  location: EventLocation;
  isOnline: boolean;
  meetingUrl?: string;
  startDateTime: string;
  endDateTime?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Extended fields
  creator?: EventCreatorInfo;
  rsvpCount?: number;
  rsvps?: EventRSVP[];
  userHasRsvpd?: boolean;
}

/**
 * Event creator info for display
 */
export interface EventCreatorInfo {
  id: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Event RSVP database row
 */
export interface EventRSVPRow {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  data: Record<string, unknown>;
}

/**
 * Event RSVP with user info for display
 */
export interface EventRSVP {
  id: string;
  eventId: string;
  userId: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

/**
 * Event for map display (lightweight version with coordinates)
 */
export interface EventForMap {
  id: string;
  title: string;
  location: {
    coordinates: { lat: number; lng: number };
    displayName?: string;
  };
  startDateTime: string;
  endDateTime?: string;
  isOnline: boolean;
  rsvpCount: number;
  creatorId: string;
}

/**
 * Helper to map database row to Event
 */
export function mapEventRowToEvent(row: EventRow): Event {
  const data = row.data;
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: data.title,
    description: data.description,
    location: data.location,
    isOnline: data.isOnline,
    meetingUrl: data.meetingUrl,
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime,
    imageUrl: data.imageUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Helper to map database row to EventRSVP
 */
export function mapEventRSVPRowToEventRSVP(row: EventRSVPRow): EventRSVP {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

/**
 * Helper to format event date for display
 */
export function formatEventDate(startDateTime: string, endDateTime?: string): string {
  const start = new Date(startDateTime);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  
  let formatted = start.toLocaleDateString('en-US', options);
  
  if (endDateTime) {
    const end = new Date(endDateTime);
    const sameDay = start.toDateString() === end.toDateString();
    
    if (sameDay) {
      formatted += ` - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      formatted += ` - ${end.toLocaleDateString('en-US', options)}`;
    }
  }
  
  return formatted;
}

/**
 * Check if an event is in the past
 */
export function isEventPast(startDateTime: string): boolean {
  return new Date(startDateTime) < new Date();
}

/**
 * Check if an event is happening today
 */
export function isEventToday(startDateTime: string): boolean {
  const eventDate = new Date(startDateTime);
  const today = new Date();
  return eventDate.toDateString() === today.toDateString();
}
