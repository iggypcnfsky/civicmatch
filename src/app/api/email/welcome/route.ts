import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/lib/email/services/EmailService';
import type { Database } from '@/types/supabase';

// Server-side Supabase client (for email sending)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase client for this request
    const supabase = createClient<Database>(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user data from auth.users (we need to validate the user exists)
    // Note: This endpoint should only be called immediately after signup
    // In production, you might want to add additional security measures

    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, data')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Extract user data
    const profileData = (profile.data as Record<string, unknown>) || {};
    const displayName = String(profileData.displayName || profile.username || 'there');
    const email = String(profileData.email || profile.username || '');

    if (!email || email.trim() === '') {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Generate URLs for the email - use production domain
    const baseUrl = 'https://civicmatch.app';
    const profileCompletionUrl = `${baseUrl}/profile`;
    const exploreUrl = `${baseUrl}/`;
    const preferencesUrl = `${baseUrl}/profile#email-preferences`;

    // Send welcome email
    const result = await emailService.sendWelcomeEmail(
      email,
      {
        displayName,
        username: profile.username,
        profileCompletionUrl,
        exploreUrl,
        preferencesUrl,
      },
      {
        userId,
        emailType: 'welcome',
        templateVersion: '1.0',
      }
    );

    if (!result.success) {
      console.error('Failed to send welcome email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send welcome email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent successfully',
      emailId: result.data?.id,
    });

  } catch (error) {
    console.error('Welcome email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
