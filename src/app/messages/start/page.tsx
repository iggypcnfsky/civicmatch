'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

function StartConversationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error' | 'redirecting'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function startConversation() {
      try {
        const currentUserId = searchParams.get('currentUserId');
        const targetUserId = searchParams.get('targetUserId');

        if (!currentUserId || !targetUserId) {
          setError('Missing required parameters: currentUserId, targetUserId');
          setStatus('error');
          return;
        }

        if (currentUserId === targetUserId) {
          setError('Cannot start conversation with yourself');
          setStatus('error');
          return;
        }

        // Check if user is authenticated
        const { data: session } = await supabase.auth.getSession();
        const authenticatedUserId = session?.session?.user?.id;
        
        if (!authenticatedUserId) {
          // User is not logged in, redirect to main page with return URL
          const returnUrl = encodeURIComponent(`/messages/start?currentUserId=${currentUserId}&targetUserId=${targetUserId}`);
          window.location.href = `/?returnUrl=${returnUrl}`;
          return;
        }

        // Use the authenticated user's ID instead of the email parameter
        // This is more secure and handles cases where currentUserId might be outdated

        // Call our API endpoint to handle conversation creation
        const response = await fetch(`/api/messages/start?currentUserId=${authenticatedUserId}&targetUserId=${targetUserId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          setError(errorData.error || 'Failed to start conversation');
          setStatus('error');
          return;
        }

        // Get the response data
        const result = await response.json();
        
        if (result.success && result.redirectUrl) {
          setStatus('redirecting');
          
          // Add a small delay to ensure conversation is ready
          setTimeout(() => {
            router.push(result.redirectUrl);
          }, 1000);
        } else {
          setError(result.error || 'Unexpected response from server');
          setStatus('error');
        }

      } catch (error) {
        console.error('Unexpected error in start conversation:', error);
        setError('Network error - please check your connection');
        setStatus('error');
      }
    }

    startConversation();
  }, [searchParams, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Starting conversation...</p>
        </div>
      </div>
    );
  }

  if (status === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Redirecting to conversation...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-text mb-4">Oops! Something went wrong</h1>
          <p className="text-text-muted mb-6">{error}</p>
          <button
            onClick={() => router.push('/messages')}
            className="bg-primary text-background px-6 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Messages
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function StartConversationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    }>
      <StartConversationContent />
    </Suspense>
  );
}
