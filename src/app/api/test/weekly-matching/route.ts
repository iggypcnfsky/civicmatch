import { NextRequest, NextResponse } from 'next/server';
import { matchingService, MatchProfile } from '@/lib/email/services/MatchingService';
import { emailService } from '@/lib/email/services/EmailService';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Development-only endpoint for testing weekly matching logic
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    console.log('🧪 Testing weekly matching logic...');

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const maxMatches = parseInt(searchParams.get('maxMatches') || '10');
    const minDays = parseInt(searchParams.get('minDays') || '0'); // No minimum for testing

    // Generate test matches
    const matches = await matchingService.generateMatches({
      excludeRecentMatches: false, // Allow recent matches for testing
      minDaysSinceLastMatch: minDays,
      maxMatchesPerWeek: maxMatches
    });

    console.log(`🎯 Generated ${matches.length} test matches`);

    // Get eligible users count
    const eligibleUsers = await matchingService.getEligibleUsers({
      excludeRecentMatches: false,
      minDaysSinceLastMatch: minDays
    });

    // Format response for easy testing
    const formattedMatches = matches.map(match => ({
      currentUser: {
        id: match.currentUser.user_id,
        displayName: match.currentUser.data.displayName,
        username: match.currentUser.username,
        skills: match.currentUser.data.skills?.slice(0, 3),
        values: match.currentUser.data.values?.slice(0, 3),
        causes: match.currentUser.data.causes?.slice(0, 3)
      },
      matchedUser: {
        id: match.matchedUser.user_id,
        displayName: match.matchedUser.data.displayName,
        username: match.matchedUser.username,
        skills: match.matchedUser.data.skills?.slice(0, 3),
        values: match.matchedUser.data.values?.slice(0, 3),
        causes: match.matchedUser.data.causes?.slice(0, 3)
      },
      matchScore: match.matchScore,
      matchReasons: match.matchReasons
    }));

    return NextResponse.json({
      success: true,
      message: `Generated ${matches.length} test matches from ${eligibleUsers.length} eligible users`,
      eligibleUsersCount: eligibleUsers.length,
      matchesGenerated: matches.length,
      matches: formattedMatches,
      testingNote: 'This is a development endpoint. Use /api/cron/weekly-matching for production.',
      sampleEmailData: matches.length > 0 ? {
        currentUser: {
          displayName: matches[0].currentUser.data.displayName,
          avatarUrl: matches[0].currentUser.data.avatarUrl
        },
        matchedUser: {
          displayName: matches[0].matchedUser.data.displayName,
          username: matches[0].matchedUser.username,
          bio: matches[0].matchedUser.data.bio,
          skills: matches[0].matchedUser.data.skills,
          matchScore: matches[0].matchScore,
          matchReasons: matches[0].matchReasons,
          profileUrl: `https://civicmatch.app/profiles/${matches[0].matchedUser.username}`,
          connectUrl: `https://civicmatch.app/messages?user=${matches[0].matchedUser.username}`
        }
      } : null
    });

  } catch (error) {
    console.error('Test weekly matching failed:', error);
    return NextResponse.json(
      { 
        error: 'Test weekly matching failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// POST endpoint to test sending actual weekly match emails
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { 
      currentUserId, 
      matchedUserId, 
      sendActualEmail = false,
      createCalendarEvent = false 
    } = await request.json();

    if (!currentUserId || !matchedUserId) {
      return NextResponse.json({ error: 'Both currentUserId and matchedUserId are required' }, { status: 400 });
    }

    console.log(`🧪 Testing weekly match email...`);
    console.log(`Current User ID: ${currentUserId}, Matched User ID: ${matchedUserId}`);

    // Initialize Supabase client with service role for auth admin access
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch specific users by ID and their email addresses
    const [currentUserResult, matchedUserResult, currentUserAuthResult, matchedUserAuthResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, username, data, created_at')
        .eq('user_id', currentUserId)
        .single(),
      supabase
        .from('profiles')
        .select('user_id, username, data, created_at')
        .eq('user_id', matchedUserId)
        .single(),
      supabase.auth.admin.getUserById(currentUserId),
      supabase.auth.admin.getUserById(matchedUserId)
    ]);

    if (currentUserResult.error || !currentUserResult.data) {
      return NextResponse.json({ error: `Current user not found: ${currentUserId}` }, { status: 404 });
    }
    if (matchedUserResult.error || !matchedUserResult.data) {
      return NextResponse.json({ error: `Matched user not found: ${matchedUserId}` }, { status: 404 });
    }
    if (currentUserAuthResult.error || !currentUserAuthResult.data.user) {
      return NextResponse.json({ error: `Current user auth not found: ${currentUserId}` }, { status: 404 });
    }
    if (matchedUserAuthResult.error || !matchedUserAuthResult.data.user) {
      return NextResponse.json({ error: `Matched user auth not found: ${matchedUserId}` }, { status: 404 });
    }

    const currentUser = currentUserResult.data;
    const matchedUser = matchedUserResult.data;
    const currentUserEmail = currentUserAuthResult.data.user.email!;
    const matchedUserEmail = matchedUserAuthResult.data.user.email!;

    console.log(`📧 Current user email: ${currentUserEmail}`);
    console.log(`📧 Matched user email: ${matchedUserEmail}`);

    // Cast users to MatchProfile type for compatibility
    const currentUserTyped = currentUser as MatchProfile;
    const matchedUserTyped = matchedUser as MatchProfile;

    // Create meeting if requested
    let meetingDetails = null;
    if (createCalendarEvent) {
      try {
        console.log('🗓️ Attempting to create calendar event...');
        meetingDetails = await matchingService.createMeetingForMatch(currentUserTyped, matchedUserTyped);
        console.log('✅ Created calendar event:', meetingDetails?.eventId);
      } catch (error) {
        console.error('❌ Failed to create calendar event:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        console.error('Full error:', error);
      }
    }

    // Generate match reasons
    const matchReasons = [
      'Both changemakers ready to connect and collaborate',
      'Perfect opportunity to expand your impact network',
      'Great potential for mutual learning and growth'
    ];

    // Extract data with proper type casting
    const currentUserData = (currentUser.data as Record<string, unknown>) || {};
    const matchedUserData = (matchedUser.data as Record<string, unknown>) || {};

    // Helper function to ensure array format
    const ensureArray = (value: unknown): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        // Split by comma and clean up
        return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
      }
      return [];
    };

    // Prepare email data
    const emailData = {
      currentUser: {
        displayName: String(currentUserData.displayName || currentUser.username),
        avatarUrl: String(currentUserData.avatarUrl || '')
      },
      match: {
        userId: matchedUser.user_id,
        displayName: String(matchedUserData.displayName || matchedUser.username),
        username: matchedUser.username,
        bio: String(matchedUserData.bio || 'Passionate about making a positive impact through meaningful collaboration.'),
        location: matchedUserData.location as string | { city: string; country: string } | undefined,
        tags: ensureArray(matchedUserData.tags),
        skills: ensureArray(matchedUserData.skills),
        causes: ensureArray(matchedUserData.causes),
        values: ensureArray(matchedUserData.values),
        fame: String(matchedUserData.fame || ''),
        aim: matchedUserData.aim as { title: string; summary?: string }[] | undefined,
        game: String(matchedUserData.game || ''),
        workStyle: String(matchedUserData.workStyle || ''),
        helpNeeded: String(matchedUserData.helpNeeded || ''),
        avatarUrl: String(matchedUserData.avatarUrl || ''),
        matchScore: Math.floor(Math.random() * 30) + 70, // Random score 70-100
        matchReasons: matchReasons,
        profileUrl: `https://civicmatch.app/profiles/${matchedUser.username}`,
        connectUrl: `https://civicmatch.app/messages?user=${matchedUser.username}`
      },
      meetingDetails: meetingDetails ? {
        eventId: meetingDetails.eventId,
        googleMeetUrl: meetingDetails.googleMeetUrl,
        scheduledTime: meetingDetails.scheduledTime,
        timezone: meetingDetails.timezone,
        calendarEventUrl: meetingDetails.calendarEventUrl,
        icsDownloadUrl: meetingDetails.icsDownloadUrl
      } : undefined,
      meetingActions: meetingDetails ? {
        acceptUrl: `https://civicmatch.app/api/meeting/accept?eventId=${meetingDetails.eventId}&token=test`,
        declineUrl: `https://civicmatch.app/api/meeting/decline?eventId=${meetingDetails.eventId}&token=test`,
        proposeTimeUrl: `https://civicmatch.app/api/meeting/propose?eventId=${meetingDetails.eventId}&token=test`,
        addToCalendarUrl: meetingDetails.icsDownloadUrl
      } : undefined,
      exploreMoreUrl: 'https://civicmatch.app/',
      preferencesUrl: 'https://civicmatch.app/profile#email-preferences'
    };

    if (sendActualEmail) {
      // Send emails to BOTH users (matching production behavior)
      console.log(`📧 Sending emails to both users...`);

      const usersToEmail = [
        { currentUser, matchedUser, currentUserEmail, matchedUserEmail },
        { currentUser: matchedUser, matchedUser: currentUser, currentUserEmail: matchedUserEmail, matchedUserEmail: currentUserEmail }
      ];

      const emailResults = [];

      for (let i = 0; i < usersToEmail.length; i++) {
        const userPair = usersToEmail[i];
        const emailRecipient = userPair.currentUserEmail;
        const currentUserData = (userPair.currentUser.data as Record<string, unknown>) || {};
        const matchedUserData = (userPair.matchedUser.data as Record<string, unknown>) || {};

        // Prepare email data for this specific user
        const userSpecificEmailData = {
          currentUser: {
            displayName: String(currentUserData.displayName || userPair.currentUser.username),
            avatarUrl: String(currentUserData.avatarUrl || '')
          },
          match: {
            userId: userPair.matchedUser.user_id,
            displayName: String(matchedUserData.displayName || userPair.matchedUser.username),
            username: userPair.matchedUser.username,
            bio: String(matchedUserData.bio || 'Passionate about making a positive impact through meaningful collaboration.'),
            location: matchedUserData.location as string | { city: string; country: string } | undefined,
            tags: ensureArray(matchedUserData.tags),
            skills: ensureArray(matchedUserData.skills),
            causes: ensureArray(matchedUserData.causes),
            values: ensureArray(matchedUserData.values),
            fame: String(matchedUserData.fame || ''),
            aim: matchedUserData.aim as { title: string; summary?: string }[] | undefined,
            game: String(matchedUserData.game || ''),
            workStyle: String(matchedUserData.workStyle || ''),
            helpNeeded: String(matchedUserData.helpNeeded || ''),
            avatarUrl: String(matchedUserData.avatarUrl || ''),
            matchScore: Math.floor(Math.random() * 30) + 70,
            matchReasons: matchReasons,
            // URLs are now handled directly in the email template
          },
          meetingDetails: meetingDetails ? {
            eventId: meetingDetails.eventId,
            googleMeetUrl: meetingDetails.googleMeetUrl,
            scheduledTime: meetingDetails.scheduledTime,
            timezone: meetingDetails.timezone,
            calendarEventUrl: meetingDetails.calendarEventUrl,
            icsDownloadUrl: meetingDetails.icsDownloadUrl
          } : undefined,

          exploreMoreUrl: 'https://civicmatch.app/',
          preferencesUrl: 'https://civicmatch.app/profile#email-preferences'
        };

        console.log(`📧 Sending email ${i + 1}/2 to ${emailRecipient} (about ${userPair.matchedUser.username})`);

        const emailResult = await emailService.sendWeeklyMatchEmail(
          emailRecipient,
          userSpecificEmailData,
          {
            userId: userPair.currentUser.user_id,
            emailType: 'weekly_match',
            templateVersion: '1.0'
          }
        );

        emailResults.push({
          recipient: emailRecipient,
          success: emailResult.success,
          error: emailResult.error
        });

        // Add delay between emails
        if (i < usersToEmail.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return NextResponse.json({
        success: true,
        message: `Test emails sent to both users`,
        emailResults,
        calendarEvent: meetingDetails ? {
          eventId: meetingDetails.eventId,
          googleMeetUrl: meetingDetails.googleMeetUrl
        } : null,
        userDetails: {
          currentUser: {
            id: currentUser.user_id,
            email: currentUserEmail,
            displayName: currentUserData.displayName || currentUser.username,
            username: currentUser.username
          },
          matchedUser: {
            id: matchedUser.user_id,
            email: matchedUserEmail,
            displayName: matchedUserData.displayName || matchedUser.username,
            username: matchedUser.username
          }
        }
      });
    } else {
      // Just return the data without sending
      return NextResponse.json({
        success: true,
        message: `Test email data prepared for ${currentUserEmail}`,
        recipientEmail: currentUserEmail,
        emailData: emailData,
        calendarEvent: meetingDetails ? {
          eventId: meetingDetails.eventId,
          googleMeetUrl: meetingDetails.googleMeetUrl
        } : null,
        userDetails: {
          currentUser: {
            id: currentUser.user_id,
            email: currentUserEmail,
            displayName: currentUserData.displayName || currentUser.username,
            username: currentUser.username
          },
          matchedUser: {
            id: matchedUser.user_id,
            email: matchedUserEmail,
            displayName: matchedUserData.displayName || matchedUser.username,
            username: matchedUser.username
          }
        },
        note: 'Set sendActualEmail: true to send real email. Set createCalendarEvent: true to create Google Calendar event. Production sends emails to BOTH users in the match.'
      });
    }

  } catch (error) {
    console.error('Test weekly match email failed:', error);
    return NextResponse.json(
      { 
        error: 'Test weekly match email failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
