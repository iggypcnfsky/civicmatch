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

// Check if request wants all challenges (no bounds)
function shouldFetchAll(searchParams: URLSearchParams): boolean {
  return searchParams.get('all') === 'true';
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

    // Parse optional filters
    const categories = parseCategories(searchParams);
    const severity = parseSeverity(searchParams);
    const fetchAll = shouldFetchAll(searchParams);

    // Initialize service
    const supabase = await createServiceClient();
    const challengeService = new ChallengeService(supabase);

    let challenges;
    let bounds: BoundingBox | null = null;

    if (fetchAll) {
      // Fetch all challenges without bounds
      const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 1000);
      challenges = await challengeService.getAllChallenges({
        categories,
        severity,
        limit,
      });
    } else {
      // Parse bounding box (required for bounded fetch)
      bounds = parseBoundingBox(searchParams);
      if (!bounds) {
        return NextResponse.json(
          { error: 'Missing or invalid bounding box parameters (north, south, east, west). Use ?all=true to fetch all challenges.' },
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

      const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

      // Fetch challenges within bounds
      challenges = await challengeService.getChallengesInBounds(bounds, {
        categories,
        severity,
        limit,
      });
    }

    return NextResponse.json({
      challenges,
      total: challenges.length,
      bounds,
      filters: { categories, severity },
      all: fetchAll,
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
