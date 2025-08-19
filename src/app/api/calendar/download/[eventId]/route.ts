import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarService } from '@/lib/google/calendar';

// Download ICS file for calendar events
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ eventId: string }> }
) {
  try {
    const params = await props.params;
    const eventId = params.eventId.replace('.ics', ''); // Remove .ics extension if present
    
    console.log('Generating ICS file for event:', eventId);

    // Get event details from Google Calendar
    const event = await googleCalendarService.getEvent(eventId);
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Generate ICS file content
    const icsContent = googleCalendarService.generateICSFile(event);

    // Return ICS file with proper headers
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${eventId}.ics"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error generating ICS file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate calendar file', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
