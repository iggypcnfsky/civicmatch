// API endpoint for fetching challenge category stats
// Used by the filter UI

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ChallengeService } from '@/lib/services/ChallengeService';
import { CHALLENGE_CATEGORIES } from '@/types/challenge';

export const runtime = 'edge';

export async function GET() {
  try {
    // Initialize service
    const supabase = await createServiceClient();
    const challengeService = new ChallengeService(supabase);

    // Fetch category stats
    const stats = await challengeService.getCategoryStats();

    // Merge with category metadata
    const categories = CHALLENGE_CATEGORIES.map(cat => {
      const stat = stats.find(s => s.category === cat.name);
      return {
        ...cat,
        count: stat?.count || 0,
        critical_count: stat?.critical_count || 0,
        high_count: stat?.high_count || 0,
        new_24h: stat?.new_24h || 0,
      };
    });

    return NextResponse.json({ categories });

  } catch (error) {
    console.error('Error fetching category stats:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch category stats', message },
      { status: 500 }
    );
  }
}
