// Cron job for ingesting civic challenges from news sources
// Runs every 4-6 hours to fetch and process news articles
// 
// Trigger: GET /api/cron/ingest-challenges?secret=CRON_SECRET
// Or configure in Vercel Cron: 0 */6 * * * (every 6 hours)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ChallengeService } from '@/lib/services/ChallengeService';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  // Verify cron secret
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check for required environment variables
  if (!process.env.NEWSAPI_AI_KEY) {
    return NextResponse.json(
      { error: 'NEWSAPI_AI_KEY not configured' },
      { status: 500 }
    );
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY not configured' },
      { status: 500 }
    );
  }

  // Initialize Supabase with service role for cron jobs
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const challengeService = new ChallengeService(supabase);
  const logs: string[] = [];
  const startTime = Date.now();

  try {
    console.log('Starting challenge ingestion pipeline...');
    logs.push(`[${new Date().toISOString()}] Starting ingestion pipeline`);

    // Run the ingestion pipeline
    const result = await challengeService.runIngestionPipeline({
      onProgress: (message) => {
        console.log(message);
        logs.push(`[${new Date().toISOString()}] ${message}`);
      },
      maxArticlesPerCategory: 25, // Process up to 25 articles per category
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('Ingestion complete:', result);
    logs.push(`[${new Date().toISOString()}] Ingestion complete in ${duration}s`);
    logs.push(`[${new Date().toISOString()}] Summary: ${result.accepted} accepted, ${result.rejected} rejected, ${result.errors} errors`);

    return NextResponse.json({
      success: true,
      duration: `${duration}s`,
      result,
      logs,
    });

  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Ingestion pipeline failed:', error);
    logs.push(`[${new Date().toISOString()}] ERROR: ${errorMessage}`);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: `${duration}s`,
        logs,
      },
      { status: 500 }
    );
  }
}
