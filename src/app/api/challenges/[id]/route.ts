// API endpoint for fetching a single challenge by ID
// Includes nearby people and projects (optional)

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ChallengeService } from '@/lib/services/ChallengeService';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Parse optional parameters
    const includeNearby = searchParams.get('include_nearby') === 'true';
    const nearbyRadius = parseFloat(searchParams.get('radius') || '10'); // km

    // Initialize service
    const supabase = await createServiceClient();
    const challengeService = new ChallengeService(supabase);

    // Fetch challenge
    const challenge = await challengeService.getChallengeById(id);

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Build response
    const response: { challenge: typeof challenge; nearby?: unknown } = { challenge };

    // Optionally fetch nearby people and projects
    if (includeNearby) {
      try {
        // Fetch nearby people using the RPC function
        const { data: nearbyPeople } = await supabase.rpc('nearby_people', {
          lat: challenge.latitude,
          lng: challenge.longitude,
          radius_km: nearbyRadius,
          max_results: 10,
        });

        // Fetch nearby projects
        const { data: nearbyProjects } = await supabase.rpc('nearby_projects', {
          lat: challenge.latitude,
          lng: challenge.longitude,
          radius_km: nearbyRadius,
          max_results: 10,
        });

        response.nearby = {
          people: nearbyPeople || [],
          projects: nearbyProjects || [],
          radius_km: nearbyRadius,
        };
      } catch (error) {
        console.warn('Error fetching nearby entities:', error);
        // Don't fail the request if nearby fetch fails
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching challenge:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch challenge', message },
      { status: 500 }
    );
  }
}
