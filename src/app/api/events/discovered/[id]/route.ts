// API endpoint for individual discovered event
// GET /api/events/discovered/[id] - Get a specific discovered event

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { EventDiscoveryService } from '@/lib/services/EventDiscoveryService';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Initialize service
    const supabase = await createServiceClient();
    const eventService = new EventDiscoveryService(supabase);

    // Fetch event
    const event = await eventService.getEventById(id);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });

  } catch (error) {
    console.error('Error fetching discovered event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discovered event' },
      { status: 500 }
    );
  }
}
