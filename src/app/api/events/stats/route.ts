// API endpoint for discovered events stats
// GET /api/events/stats - Get statistics about discovered events

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { EventDiscoveryService } from '@/lib/services/EventDiscoveryService';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Initialize service
    const supabase = await createServiceClient();
    const eventService = new EventDiscoveryService(supabase);

    // Fetch stats
    const stats = await eventService.getStats();

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error fetching event stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event stats' },
      { status: 500 }
    );
  }
}
