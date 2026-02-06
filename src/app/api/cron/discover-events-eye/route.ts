// Cron job for discovering civic tech events from EventsEye
// Runs weekly on Sunday at 3 AM UTC (after the daily Source B pipeline at 2 AM)
//
// Trigger: GET /api/cron/discover-events-eye?secret=CRON_SECRET
// Or configure in Vercel Cron: 0 3 * * 0 (Sundays at 3 AM UTC)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EventDiscoveryService } from '@/lib/services/EventDiscoveryService';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes max (EventsEye pipeline takes longer)

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
    console.log('Starting EventsEye discovery pipeline...');
    logs.push(`[${new Date().toISOString()}] Starting EventsEye discovery pipeline`);

    // Run the EventsEye pipeline
    const result = await discoveryService.runEventsEyePipeline({
      onProgress: (message) => {
        console.log(message);
        logs.push(`[${new Date().toISOString()}] ${message}`);
      },
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('EventsEye discovery complete:', result);
    logs.push(`[${new Date().toISOString()}] EventsEye discovery complete in ${duration}s`);
    logs.push(`[${new Date().toISOString()}] Scraped: ${result.scraped} raw events`);
    logs.push(`[${new Date().toISOString()}] Filtered: ${result.filtered} relevant events`);
    logs.push(`[${new Date().toISOString()}] Stored: ${result.stored} new events`);
    logs.push(`[${new Date().toISOString()}] Errors: ${result.errors}`);

    // Log category stats
    for (const stat of result.stats) {
      logs.push(`[${new Date().toISOString()}] Category "${stat.category}": ${stat.eventsFound} events from ${stat.pagesScraped} pages`);
      if (stat.errors.length > 0) {
        for (const error of stat.errors) {
          logs.push(`[${new Date().toISOString()}] Warning: ${stat.category} - ${error}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      duration: `${duration}s`,
      result,
      summary: {
        scraped: result.scraped,
        filtered: result.filtered,
        stored: result.stored,
        errors: result.errors,
      },
      logs,
    });

  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('EventsEye discovery pipeline failed:', error);
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
