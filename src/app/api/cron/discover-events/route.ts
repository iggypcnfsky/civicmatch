// Cron job for discovering civic tech events
// Runs daily at 2 AM UTC to search for new events
//
// Trigger: GET /api/cron/discover-events?secret=CRON_SECRET
// Or configure in Vercel Cron: 0 2 * * * (daily at 2 AM UTC)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EventDiscoveryService } from '@/lib/services/EventDiscoveryService';

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

  const discoveryService = new EventDiscoveryService(supabase);
  const logs: string[] = [];
  const startTime = Date.now();

  try {
    console.log('Starting event discovery pipeline...');
    logs.push(`[${new Date().toISOString()}] Starting event discovery pipeline`);

    // Run the discovery pipeline
    const result = await discoveryService.runDiscoveryPipeline({
      onProgress: (message) => {
        console.log(message);
        logs.push(`[${new Date().toISOString()}] ${message}`);
      },
      skipBrave: !process.env.BRAVE_SEARCH_API_KEY,
      skipNewsAPI: !process.env.NEWSAPI_AI_KEY,
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    const totalAccepted = result.brave.accepted + result.newsapi.accepted;
    const totalProcessed = result.brave.processed + result.newsapi.processed;
    const totalErrors = result.brave.errors + result.newsapi.errors;
    
    console.log('Discovery complete:', result);
    logs.push(`[${new Date().toISOString()}] Discovery complete in ${duration}s`);
    logs.push(`[${new Date().toISOString()}] Brave Search: ${result.brave.accepted} accepted from ${result.brave.processed} processed`);
    logs.push(`[${new Date().toISOString()}] NewsAPI.ai: ${result.newsapi.accepted} accepted from ${result.newsapi.processed} processed`);
    logs.push(`[${new Date().toISOString()}] Total: ${totalAccepted} new events discovered`);

    return NextResponse.json({
      success: true,
      duration: `${duration}s`,
      result,
      summary: {
        totalProcessed,
        totalAccepted,
        totalErrors,
      },
      logs,
    });

  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Event discovery pipeline failed:', error);
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
