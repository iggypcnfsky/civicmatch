#!/usr/bin/env tsx
/**
 * Manual script to run challenge ingestion
 * Usage: npm run ingest
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { ChallengeService } from '../src/lib/services/ChallengeService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

if (!process.env.NEWSAPI_AI_KEY || !process.env.OPENROUTER_API_KEY) {
  console.error('Missing NEWSAPI_AI_KEY or OPENROUTER_API_KEY');
  process.exit(1);
}

async function main() {
  console.log('🚀 Starting challenge ingestion...\n');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const challengeService = new ChallengeService(supabase);
  const startTime = Date.now();

  try {
    const result = await challengeService.runIngestionPipeline({
      onProgress: (message) => {
        console.log(`  → ${message}`);
      },
      maxArticlesPerCategory: 15, // Process 15 articles per category (faster for manual runs)
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n✅ Ingestion complete!');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Accepted: ${result.accepted}`);
    console.log(`   Rejected: ${result.rejected}`);
    console.log(`   Errors: ${result.errors}`);
    console.log('\n   By category:');
    Object.entries(result.byCategory).forEach(([cat, stats]) => {
      console.log(`     - ${cat}: ${stats.processed} processed, ${stats.accepted} accepted`);
    });
    
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    process.exit(1);
  }
}

main();
