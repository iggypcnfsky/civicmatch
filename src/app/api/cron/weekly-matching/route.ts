import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/services/EmailService';
import { matchingService } from '@/lib/email/services/MatchingService';

// This endpoint is called by Vercel Cron for bi-weekly matching emails
// Runs every Monday, but only executes matching every 2 weeks
export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Starting bi-weekly matching job check...');

    // Verify this is coming from Vercel Cron (basic security)
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if we should run this week (bi-weekly schedule)
    const now = new Date();
    const weekNumber = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const shouldRun = weekNumber % 2 === 0; // Run on even weeks
    
    if (!shouldRun) {
      console.log('📅 Skipping this week - bi-weekly schedule (odd week)');
      return NextResponse.json({
        success: true,
        message: 'Skipped - bi-weekly schedule (odd week)',
        weekNumber,
        nextRun: 'Next Monday'
      });
    }

    console.log('📅 Running bi-weekly matching (even week)...');

    // Generate matches with Google Calendar meetings for this bi-weekly cycle
    const matches = await matchingService.generateMatchesWithMeetings({
      excludeRecentMatches: true,
      minDaysSinceLastMatch: 14, // 2 weeks since last match
      maxMatchesPerWeek: 50, // Process up to 50 matches per cycle
      createMeetings: true // Enable Google Calendar integration
    });
    
    console.log(`🎯 Generated ${matches.length} matches for bi-weekly emails`);

    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matches available for bi-weekly emails',
        sent: 0,
        weekNumber,
        cycle: 'bi-weekly'
      });
    }

    // Send bi-weekly match emails to BOTH users in each match with strict rate limiting for Resend free plan (2 requests/second)
    const results = [];
    const delayMs = 600; // 600ms delay = ~1.67 requests/second (safely under 2/sec limit)

    console.log(`📤 Sending ${matches.length * 2} bi-weekly match emails (both users per match) with 600ms delays for rate limiting...`);

    let emailCount = 0;
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const user1 = match.currentUser;
      const user2 = match.matchedUser;

      // Send email to BOTH users in the match
      const usersToEmail = [
        { currentUser: user1, matchedUser: user2 },
        { currentUser: user2, matchedUser: user1 }
      ];

      for (const userPair of usersToEmail) {
        emailCount++;
        const currentUser = userPair.currentUser;
        const matchedUser = userPair.matchedUser;
        
        // Get recipient email from auth.users table or profile data
        const recipientEmail = (currentUser.data as { email?: string }).email || currentUser.username;
        if (!recipientEmail) {
          console.error(`No email found for user ${currentUser.user_id}`);
          continue;
        }

        console.log(`📤 Sending ${emailCount}/${matches.length * 2} to ${recipientEmail} (about ${matchedUser.data.displayName || matchedUser.username})`);

        try {
        // Helper function to ensure array format for email template
        const ensureArray = (value: unknown): string[] => {
          if (!value) return [];
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') {
            // Split by comma and clean up
            return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
          }
          return [];
        };

        // Prepare email data with meeting integration
        const emailData = {
          currentUser: {
            userId: currentUser.user_id,
            displayName: currentUser.data.displayName || currentUser.username,
            avatarUrl: currentUser.data.avatarUrl
          },
          match: {
            userId: matchedUser.user_id,
            displayName: matchedUser.data.displayName || matchedUser.username,
            username: matchedUser.username,
            bio: matchedUser.data.bio || '',
            location: matchedUser.data.location,
            tags: ensureArray(matchedUser.data.tags),
            skills: ensureArray(matchedUser.data.skills),
            causes: ensureArray(matchedUser.data.causes),
            values: ensureArray(matchedUser.data.values),
            fame: matchedUser.data.fame,
            aim: matchedUser.data.aim,
            game: matchedUser.data.game,
            workStyle: matchedUser.data.workStyle,
            helpNeeded: matchedUser.data.helpNeeded,
            avatarUrl: matchedUser.data.avatarUrl,
            matchScore: match.matchScore,
            matchReasons: match.matchReasons,
            // URLs are now handled directly in the email template
          },
          meetingDetails: match.meetingDetails ? {
            eventId: match.meetingDetails.eventId,
            googleMeetUrl: match.meetingDetails.googleMeetUrl,
            scheduledTime: match.meetingDetails.scheduledTime,
            timezone: match.meetingDetails.timezone,
            calendarEventUrl: match.meetingDetails.calendarEventUrl,
            icsDownloadUrl: match.meetingDetails.icsDownloadUrl
          } : undefined,

          exploreMoreUrl: 'https://civicmatch.app/',
          preferencesUrl: 'https://civicmatch.app/profile#email-preferences'
        };

        // Send email
        const result = await emailService.sendWeeklyMatchEmail(
          recipientEmail,
          emailData,
          {
            userId: currentUser.user_id,
            emailType: 'weekly_match',
            templateVersion: '1.0'
          }
        );

          results.push({
            userId: currentUser.user_id,
            matchedUserId: matchedUser.user_id,
            email: recipientEmail,
            success: result.success,
            error: result.error || null
          });

        } catch (error) {
          console.error(`Failed to send weekly match email to ${recipientEmail}:`, error);
          results.push({
            userId: currentUser.user_id,
            matchedUserId: matchedUser.user_id,
            email: recipientEmail,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Add delay between emails (except for the very last one)
        if (emailCount < matches.length * 2) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // Update match history for both users (once per match pair, not per email)
      await matchingService.updateMatchHistory(user1.user_id, user2.user_id);
      await matchingService.updateMatchHistory(user2.user_id, user1.user_id);
    }

    // Calculate statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Bi-weekly matching job completed: ${successful} sent, ${failed} failed`);

    if (failed > 0) {
      console.warn('Some bi-weekly match emails failed:', results.filter(r => !r.success));
    }

    return NextResponse.json({
      success: true,
      message: `Bi-weekly matching completed: ${successful} emails sent, ${failed} failed`,
      sent: successful,
      failed: failed,
      totalMatches: matches.length,
      weekNumber,
      cycle: 'bi-weekly',
      results: results
    });

  } catch (error) {
    console.error('Bi-weekly matching job failed:', error);
    return NextResponse.json(
      { 
        error: 'Bi-weekly matching job failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
