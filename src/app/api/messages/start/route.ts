import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

// Use server-side Supabase client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currentUserId = searchParams.get('currentUserId');
    const targetUserId = searchParams.get('targetUserId');

    if (!currentUserId || !targetUserId) {
      return NextResponse.json(
        { error: 'Missing required parameters: currentUserId, targetUserId' },
        { status: 400 }
      );
    }

    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot start conversation with yourself' },
        { status: 400 }
      );
    }

    // Check if both users exist
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .in('user_id', [currentUserId, targetUserId]);

    if (usersError) {
      console.error('Error checking users:', usersError);
      return NextResponse.json(
        { error: 'Error validating users' },
        { status: 500 }
      );
    }

    if (!users || users.length !== 2) {
      return NextResponse.json(
        { error: 'One or both users not found' },
        { status: 404 }
      );
    }

    // Check if conversation already exists between these users
    const participantIds = [currentUserId, targetUserId];
    
    const { data: existingConversations, error: searchError } = await supabaseAdmin
      .from('conversations')
      .select('id, data')
      .contains('data', { participantIds });

    if (searchError) {
      console.error('Error searching conversations:', searchError);
      return NextResponse.json(
        { error: 'Error searching for existing conversation' },
        { status: 500 }
      );
    }

    let conversationId: string;

    // If conversation exists, use it
    if (existingConversations && existingConversations.length > 0) {
      conversationId = existingConversations[0].id;
    } else {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabaseAdmin
        .from('conversations')
        .insert({
          data: {
            participantIds: participantIds
          }
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return NextResponse.json(
          { error: 'Error creating conversation' },
          { status: 500 }
        );
      }

      conversationId = newConversation.id;

      // Optionally create a connection record if it doesn't exist
      const { error: connectionError } = await supabaseAdmin
        .from('connections')
        .upsert({
          requester_id: currentUserId,
          addressee_id: targetUserId,
          status: 'pending',
          data: { source: 'weekly_match_email' }
        }, {
          onConflict: 'requester_id,addressee_id'
        });

      if (connectionError) {
        console.warn('Could not create connection record:', connectionError);
        // Don't fail the whole request for this
      }
    }

    // Redirect to the conversation page
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://civicmatch.app'}/messages/${conversationId}`;
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Unexpected error in start conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
