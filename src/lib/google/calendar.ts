import { google, calendar_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { GoogleAuth } from './auth';

interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  googleMeetUrl: string;
  calendarEventUrl: string;
}

interface CreateEventParams {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  timeZone?: string;
}

/**
 * Google Calendar service for creating and managing meeting events
 * Integrates with Google Meet for automatic video conference links
 */
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar | null = null;
  private auth: JWT | null = null;

  private async initializeAuth(): Promise<void> {
    if (!this.auth) {
      this.auth = await GoogleAuth.getAuthClient();
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    }
  }

  /**
   * Create a calendar event with Google Meet integration
   */
  async createMeetingEvent(params: CreateEventParams): Promise<CalendarEvent> {
    await this.initializeAuth();
    
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }
    try {
      const {
        summary,
        description,
        startTime,
        endTime,
        attendees,
        timeZone = 'Europe/Berlin' // Default to CET
      } = params;

      // Create the calendar event
      const event = {
        summary,
        description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: timeZone,
        },
        attendees: attendees.map(email => ({ email })),
        organizer: {
          email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          displayName: 'CivicMatch'
        },
        conferenceData: {
          createRequest: {
            requestId: `civicmatch-${Date.now()}`, // Unique request ID
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 },      // 1 hour before
          ],
        },
        guestsCanModify: true,
        guestsCanInviteOthers: false,
        guestsCanSeeOtherGuests: true,
      };

      console.log('Creating calendar event:', {
        summary,
        startTime: startTime.toISOString(),
        attendeesCount: attendees.length,
        calendarId: process.env.GOOGLE_CALENDAR_ID
      });

      const response = await this.calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        conferenceDataVersion: 1, // Required for Google Meet integration
        sendUpdates: 'all', // Send invitations to all attendees
        requestBody: event,
      });

      const createdEvent = response.data;
      
      // Extract Google Meet URL
      const googleMeetUrl = createdEvent.conferenceData?.entryPoints?.find(
        (entry) => entry.entryPointType === 'video'
      )?.uri || '';

      // Generate calendar event URL
      const calendarEventUrl = `https://calendar.google.com/calendar/event?eid=${createdEvent.id}`;

      console.log('Calendar event created successfully:', {
        eventId: createdEvent.id,
        googleMeetUrl,
        calendarEventUrl
      });

      return {
        id: createdEvent.id!,
        summary: createdEvent.summary!,
        description: createdEvent.description || '',
        startTime,
        endTime,
        attendees,
        googleMeetUrl,
        calendarEventUrl,
      };

    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateMeetingEvent(eventId: string, updates: Partial<CreateEventParams>): Promise<void> {
    await this.initializeAuth();
    
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.summary) updateData.summary = updates.summary;
      if (updates.description) updateData.description = updates.description;
      if (updates.startTime) {
        updateData.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: 'Europe/Berlin',
        };
      }
      if (updates.endTime) {
        updateData.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: 'Europe/Berlin',
        };
      }
      if (updates.attendees) {
        updateData.attendees = updates.attendees.map(email => ({ email }));
      }

      await this.calendar.events.update({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: eventId,
        requestBody: updateData,
        sendUpdates: 'all',
      });

      console.log('Calendar event updated successfully:', eventId);

    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error(`Failed to update calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteMeetingEvent(eventId: string): Promise<void> {
    await this.initializeAuth();
    
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }
    try {
      await this.calendar.events.delete({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: eventId,
        sendUpdates: 'all',
      });

      console.log('Calendar event deleted successfully:', eventId);

    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error(`Failed to delete calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event details
   */
  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    await this.initializeAuth();
    
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }
    try {
      const response = await this.calendar.events.get({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: eventId,
      });

      const event = response.data;
      
      const googleMeetUrl = event.conferenceData?.entryPoints?.find(
        (entry) => entry.entryPointType === 'video'
      )?.uri || '';

      const calendarEventUrl = `https://calendar.google.com/calendar/event?eid=${event.id}`;

      return {
        id: event.id!,
        summary: event.summary!,
        description: event.description || '',
        startTime: new Date(event.start?.dateTime || event.start?.date || ''),
        endTime: new Date(event.end?.dateTime || event.end?.date || ''),
        attendees: event.attendees?.map((attendee) => attendee.email || '') || [],
        googleMeetUrl,
        calendarEventUrl,
      };

    } catch (error) {
      console.error('Error getting calendar event:', error);
      return null;
    }
  }

  /**
   * Create a weekly meeting event for CivicMatch users
   * Event title: "FirstName + FirstName / CivicMatch"
   */
  async createWeeklyMatchMeeting(
    user1Name: string,
    user2Name: string,
    user1Email: string,
    user2Email: string,
    meetingDate: Date = this.getNextFridayAt5PM()
  ): Promise<CalendarEvent> {
    // Extract first names for title
    const firstName1 = this.extractFirstName(user1Name);
    const firstName2 = this.extractFirstName(user2Name);
    
    const summary = `${firstName1} + ${firstName2} / CivicMatch`;
    
    const description = `
🎯 CivicMatch Weekly Connection

This is an automatically scheduled meeting for you to connect and explore potential collaboration opportunities.

**Participants:**
• ${user1Name} (${user1Email})
• ${user2Name} (${user2Email})

**Meeting Guidelines:**
• This is a 30-minute intro call
• Feel free to reschedule if this time doesn't work
• Come prepared to share your current projects and goals
• Look for collaboration opportunities and ways to support each other

**About CivicMatch:**
CivicMatch connects changemakers and impact-driven individuals for meaningful collaborations.

---
If you have any questions, visit https://civicmatch.app or contact support.
    `.trim();

    const startTime = meetingDate;
    const endTime = new Date(meetingDate.getTime() + 30 * 60 * 1000); // 30 minutes later

    return await this.createMeetingEvent({
      summary,
      description,
      startTime,
      endTime,
      attendees: [user1Email, user2Email],
      timeZone: 'Europe/Berlin'
    });
  }

  /**
   * Extract first name from full name
   */
  private extractFirstName(fullName: string): string {
    if (!fullName) return 'User';
    const parts = fullName.trim().split(' ');
    return parts[0] || 'User';
  }

  /**
   * Get next Friday at 5 PM CET
   */
  private getNextFridayAt5PM(): Date {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 5 = Friday
    const daysUntilFriday = (5 - currentDay + 7) % 7 || 7; // Next Friday
    
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + daysUntilFriday);
    nextFriday.setHours(17, 0, 0, 0); // 5 PM
    
    return nextFriday;
  }

  /**
   * Generate ICS file content for calendar download
   */
  generateICSFile(event: CalendarEvent): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CivicMatch//Weekly Match Meeting//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${event.id}@civicmatch.app`,
      `DTSTART:${formatDate(event.startTime)}`,
      `DTEND:${formatDate(event.endTime)}`,
      `SUMMARY:${event.summary}`,
      `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
      `LOCATION:${event.googleMeetUrl}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  }
}

// Singleton instance
export const googleCalendarService = new GoogleCalendarService();
