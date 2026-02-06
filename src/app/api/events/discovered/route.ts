// API endpoint for discovered events
// GET /api/events/discovered - List discovered events with filters

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { EventDiscoveryService } from '@/lib/services/EventDiscoveryService';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const upcoming = searchParams.get('upcoming') !== 'false';
    const type = searchParams.get('type')?.split(',').filter(Boolean);
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const city = searchParams.get('city') || undefined;
    const country = searchParams.get('country') || undefined;
    const online = searchParams.has('online') ? searchParams.get('online') === 'true' : undefined;
    const min_relevance = parseInt(searchParams.get('min_relevance') || '60', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Initialize service
    const supabase = await createServiceClient();
    const eventService = new EventDiscoveryService(supabase);

    // Fetch events
    const { events, total } = await eventService.getDiscoveredEvents({
      upcoming,
      type,
      tags,
      city,
      country,
      online,
      min_relevance,
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
    console.error('Error fetching discovered events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discovered events' },
      { status: 500 }
    );
  }
}
