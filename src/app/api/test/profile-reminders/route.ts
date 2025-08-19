import { NextRequest, NextResponse } from 'next/server';
import { profileCompletionService } from '@/lib/email/services/ProfileCompletionService';
import { emailService } from '@/lib/email/services/EmailService';

// This is a test endpoint to manually trigger profile reminder emails
// Only works in development mode
export async function GET() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    console.log('🧪 Testing profile reminder functionality...');

    // Get profiles that need reminders
    const profilesNeedingReminders = await profileCompletionService.getProfilesNeedingReminders();
    
    console.log(`📊 Found ${profilesNeedingReminders.length} profiles needing reminders`);

    if (profilesNeedingReminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No profiles need reminders at this time',
        profiles: 0
      });
    }

    // Show all profiles for testing (don't actually send emails)
    const previewProfiles = profilesNeedingReminders.map(profile => ({
      userId: profile.userId,
      email: profile.email,
      displayName: profile.displayName,
      completionPercentage: profile.completionPercentage,
      missingFields: profile.missingFields.map(f => f.field)
    }));

    return NextResponse.json({
      success: true,
      message: 'Profile reminder test completed',
      totalProfiles: profilesNeedingReminders.length,
      previewProfiles,
      note: 'This is a test endpoint - no emails were sent',
      howToSendTestEmail: {
        method: 'POST',
        endpoint: '/api/test/profile-reminders',
        body: { userId: 'copy-user-id-from-previewProfiles' },
        example: `curl -X POST http://localhost:3000/api/test/profile-reminders -H "Content-Type: application/json" -d '{"userId":"${previewProfiles[0]?.userId || 'USER_ID_HERE'}"}'`
      }
    });

  } catch (error) {
    console.error('Profile reminder test error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Test sending a single profile reminder email
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log(`🧪 Testing profile reminder email for user: ${userId}`);

    // Get profiles that need reminders
    const profilesNeedingReminders = await profileCompletionService.getProfilesNeedingReminders();
    const profile = profilesNeedingReminders.find(p => p.userId === userId);

    if (!profile) {
      return NextResponse.json({ 
        error: 'User not found or does not need reminder',
        available: profilesNeedingReminders.map(p => ({ userId: p.userId, email: p.email }))
      }, { status: 404 });
    }

    // Send the reminder email
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

    if (!result.success) {
      return NextResponse.json({
        error: 'Failed to send email',
        details: result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile reminder email sent successfully',
      emailId: result.data?.id,
      profile: {
        userId: profile.userId,
        email: profile.email,
        completionPercentage: profile.completionPercentage,
        missingFieldsCount: profile.missingFields.length
      }
    });

  } catch (error) {
    console.error('Profile reminder send test error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
