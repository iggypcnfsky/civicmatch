// API endpoint for map events (events within bounding box)
// GET /api/events/map?north=...&south=...&east=...&west=... - Get events for map viewport

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { EventDiscoveryService } from '@/lib/services/EventDiscoveryService';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse bounding box parameters
    const north = parseFloat(searchParams.get('north') || '0');
    const south = parseFloat(searchParams.get('south') || '0');
    const east = parseFloat(searchParams.get('east') || '0');
    const west = parseFloat(searchParams.get('west') || '0');

    // Validate bounding box
    if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
      return NextResponse.json(
        { error: 'Invalid bounding box parameters' },
        { status: 400 }
      );
    }

    // Parse optional filters
    const types = searchParams.get('type')?.split(',').filter(Boolean);
    const min_relevance = parseInt(searchParams.get('min_relevance') || '60', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

    // Initialize service
    const supabase = await createServiceClient();
    const eventService = new EventDiscoveryService(supabase);

    // Fetch events in bounds
    const events = await eventService.getEventsInBounds(
      { north, south, east, west },
      { types, min_relevance, limit }
    );

    return NextResponse.json({
      events,
      count: events.length,
      bounds: { north, south, east, west },
    });

  } catch (error) {
    console.error('Error fetching map events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch map events' },
      { status: 500 }
    );
  }
}
