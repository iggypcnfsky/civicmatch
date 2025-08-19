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

    // Send reminders with strict rate limiting for Resend free plan (2 requests/second)
    const results = [];
    const delayMs = 600; // 600ms delay = ~1.67 requests/second (safely under 2/sec limit)

    console.log(`📤 Sending ${profilesNeedingReminders.length} emails with 600ms delays for rate limiting...`);

    for (let i = 0; i < profilesNeedingReminders.length; i++) {
      const profile = profilesNeedingReminders[i];
      
      console.log(`📤 Sending ${i + 1}/${profilesNeedingReminders.length} to ${profile.email}`);

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

        results.push({
          userId: profile.userId,
          email: profile.email,
          success: result.success,
          error: result.error || null
        });

        // Add delay between emails (except for the last one)
        if (i < profilesNeedingReminders.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

      } catch (error) {
        console.error(`Failed to send reminder to ${profile.email}:`, error);
        results.push({
          userId: profile.userId,
          email: profile.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Still delay even on error to maintain rate limiting
        if (i < profilesNeedingReminders.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
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
