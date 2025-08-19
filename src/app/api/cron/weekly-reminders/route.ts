import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/services/EmailService';
import { profileCompletionService } from '@/lib/email/services/ProfileCompletionService';

// This endpoint is called by Vercel Cron
export async function GET(request: NextRequest) {
  try {
    console.log('🕒 Starting weekly profile reminder job...');

    // Verify this is coming from Vercel Cron (basic security)
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profiles that need reminders
    const profilesNeedingReminders = await profileCompletionService.getProfilesNeedingReminders();
    
    console.log(`📊 Found ${profilesNeedingReminders.length} profiles needing reminders`);

    if (profilesNeedingReminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No profiles need reminders at this time',
        sent: 0
      });
    }

    // Send reminders with rate limiting
    const results = [];
    const batchSize = 10; // Process 10 emails at a time
    const delayMs = 1000; // 1 second delay between batches

    for (let i = 0; i < profilesNeedingReminders.length; i += batchSize) {
      const batch = profilesNeedingReminders.slice(i, i + batchSize);
      
      console.log(`📤 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(profilesNeedingReminders.length / batchSize)}`);

      // Process batch in parallel
      const batchPromises = batch.map(async (profile) => {
        try {
          const result = await emailService.sendProfileReminderEmail(
            profile.email,
            {
              displayName: profile.displayName,
              completionPercentage: profile.completionPercentage,
              missingFields: profile.missingFields,
              profileUrl: 'https://civicmatch.app/profile',
              preferencesUrl: 'https://civicmatch.app/profile#email-preferences'
            },
            {
              userId: profile.userId,
              emailType: 'profile_reminder',
              templateVersion: '1.0'
            }
          );

          return {
            userId: profile.userId,
            email: profile.email,
            success: result.success,
            error: result.error || null
          };
        } catch (error) {
          console.error(`Failed to send reminder to ${profile.email}:`, error);
          return {
            userId: profile.userId,
            email: profile.email,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
      if (i + batchSize < profilesNeedingReminders.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Calculate statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Profile reminder job completed: ${successful} sent, ${failed} failed`);

    if (failed > 0) {
      console.log('❌ Failed emails:', results.filter(r => !r.success));
    }

    return NextResponse.json({
      success: true,
      message: `Weekly profile reminders sent successfully`,
      sent: successful,
      failed: failed,
      total: results.length,
      details: {
        successful: results.filter(r => r.success).map(r => ({ userId: r.userId, email: r.email })),
        failed: results.filter(r => !r.success).map(r => ({ userId: r.userId, email: r.email, error: r.error }))
      }
    });

  } catch (error) {
    console.error('Weekly reminders cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Cron job failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
