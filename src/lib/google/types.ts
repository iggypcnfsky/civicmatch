/**
 * Google Calendar API types and interfaces
 */

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  googleMeetUrl: string;
  calendarEventUrl: string;
  timeZone: string;
}

export interface CreateEventRequest {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  timeZone?: string;
}

export interface MeetingDetails {
  eventId: string;
  googleMeetUrl: string;
  scheduledTime: Date;
  timezone: string;
  calendarEventUrl: string;
  icsDownloadUrl: string;
}

export interface MeetingActions {
  acceptUrl: string;
  declineUrl: string;
  proposeTimeUrl: string;
  addToCalendarUrl: string;
}

export interface GoogleCalendarConfig {
  serviceAccountEmail: string;
  privateKey: string;
  calendarId: string;
  projectId: string;
}

export interface CalendarEventResponse {
  success: boolean;
  event?: GoogleCalendarEvent;
  error?: string;
}

export interface AttendeeResponse {
  email: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  optional?: boolean;
}
