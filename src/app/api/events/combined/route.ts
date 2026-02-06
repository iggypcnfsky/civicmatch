// API endpoint for combined events (user-submitted + discovered)
// GET /api/events/combined - List all events merged together

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { EventDiscoveryService } from '@/lib/services/EventDiscoveryService';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const upcoming = searchParams.get('upcoming') !== 'false';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Initialize service
    const supabase = await createServiceClient();
    const eventService = new EventDiscoveryService(supabase);

    // Fetch combined events
    const { events, total } = await eventService.getCombinedEvents({
      upcoming,
      limit,
      offset,
    });

    return NextResponse.json({
      events,
      total,
      pagination: {
        offset,
        limit,
        hasMore: offset + events.length < total,
      },
    });

  } catch (error) {
    console.error('Error fetching combined events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch combined events' },
      { status: 500 }
    );
  }
}
