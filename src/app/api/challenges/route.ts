// API endpoint for fetching civic challenges within a bounding box
// Used by the map to display challenges

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ChallengeService } from '@/lib/services/ChallengeService';
import type { ChallengeCategory, ChallengeSeverity, BoundingBox } from '@/types/challenge';

// Using Node.js runtime for better database query stability
// Edge runtime can timeout on complex spatial queries
// export const runtime = 'edge';

// Parse and validate bounding box parameters
function parseBoundingBox(searchParams: URLSearchParams): BoundingBox | null {
  const north = parseFloat(searchParams.get('north') || '');
  const south = parseFloat(searchParams.get('south') || '');
  const east = parseFloat(searchParams.get('east') || '');
  const west = parseFloat(searchParams.get('west') || '');

  if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
    return null;
  }

  return { north, south, east, west };
}

// Parse category filter
function parseCategories(searchParams: URLSearchParams): ChallengeCategory[] | undefined {
  const categoriesParam = searchParams.get('categories');
  if (!categoriesParam) return undefined;

  const validCategories: ChallengeCategory[] = [
    'environment', 'housing', 'transport', 'public_safety',
    'governance', 'education', 'health', 'climate'
  ];

  return categoriesParam
    .split(',')
    .map(c => c.trim())
    .filter((c): c is ChallengeCategory => validCategories.includes(c as ChallengeCategory));
}

// Parse severity filter
function parseSeverity(searchParams: URLSearchParams): ChallengeSeverity | undefined {
  const severity = searchParams.get('severity') as ChallengeSeverity | null;
  const validSeverities: ChallengeSeverity[] = ['low', 'medium', 'high', 'critical'];
  
  return severity && validSeverities.includes(severity) ? severity : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse bounding box (required)
    const bounds = parseBoundingBox(searchParams);
    if (!bounds) {
      return NextResponse.json(
        { error: 'Missing or invalid bounding box parameters (north, south, east, west)' },
        { status: 400 }
      );
    }

    // Validate bounds
    if (bounds.north < bounds.south || bounds.east < bounds.west) {
      return NextResponse.json(
        { error: 'Invalid bounding box: north must be > south, east must be > west' },
        { status: 400 }
      );
    }

    // Parse optional filters
    const categories = parseCategories(searchParams);
    const severity = parseSeverity(searchParams);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    // Initialize service
    const supabase = await createServiceClient();
    const challengeService = new ChallengeService(supabase);

    // Fetch challenges
    const challenges = await challengeService.getChallengesInBounds(bounds, {
      categories,
      severity,
      limit,
    });

    return NextResponse.json({
      challenges,
      total: challenges.length,
      bounds,
      filters: { categories, severity },
    });

  } catch (error) {
    console.error('Error fetching challenges:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch challenges', message },
      { status: 500 }
    );
  }
}
