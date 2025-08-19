"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import Logo from "@/components/Logo";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Initialize auth state listener first to catch all events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'session exists' : 'no session');
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event detected - valid reset session');
        setError(null);
        setInitializing(false);
        return;
      }
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in during password reset flow');
        setError(null);
        setInitializing(false);
        return;
      }

      // Handle other events
      if (event === 'INITIAL_SESSION') {
        console.log('Initial session check');
        if (session) {
          setError(null);
          setInitializing(false);
        } else {
          // No session on initial load - check if we have URL fragments
          await checkUrlForAuthData();
        }
      }
    });

    // Function to check URL for auth data
    const checkUrlForAuthData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      
      const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
      const tokenType = urlParams.get('type') || hashParams.get('type');
      
      console.log('Checking URL params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, tokenType });
      
      if (accessToken && tokenType === 'recovery') {
        console.log('Found recovery tokens in URL - this is a valid reset link');
        // Don't set error, let the auth state change handler manage the session
        return;
      }
      
      // If no auth tokens, wait a bit then check session one more time
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No session found after timeout - invalid link');
          setError('Invalid or expired reset link. Please request a new password reset.');
        }
        setInitializing(false);
      }, 2000); // Give more time for processing
    };

    // Initial session check
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          await checkUrlForAuthData();
          return;
        }

        if (session) {
          console.log('Found existing session');
          setError(null);
          setInitializing(false);
        } else {
          console.log('No existing session, checking URL');
          await checkUrlForAuthData();
        }
      } catch (err) {
        console.error('Initial session check error:', err);
        setError('Invalid or expired reset link. Please request a new password reset.');
        setInitializing(false);
      }
    };

    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords don&apos;t match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirect to main app after successful password reset
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center gap-3 justify-center mb-6">
            <Logo className="size-9 text-[color:var(--accent)]" />
            <div className="text-2xl font-bold">Civic Match</div>
          </div>
          <div className="card space-y-4">
            <div className="text-sm opacity-70 text-center">Verifying reset link...</div>
            <div className="h-2 bg-[color:var(--muted)]/20 rounded-full overflow-hidden">
              <div className="h-full bg-[color:var(--accent)] rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center gap-3 justify-center mb-6">
            <Logo className="size-9 text-[color:var(--accent)]" />
            <div className="text-2xl font-bold">Civic Match</div>
          </div>
          <div className="card space-y-4">
            <h1 className="text-xl font-semibold text-center">Password Updated!</h1>
            <p className="text-sm opacity-80 text-center">
              Your password has been successfully updated. You&apos;ll be redirected to the main app shortly.
            </p>
            <div className="h-2 bg-[color:var(--muted)]/20 rounded-full overflow-hidden">
              <div className="h-full bg-[color:var(--accent)] rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-6">
          <Logo className="size-9 text-[color:var(--accent)]" />
          <div className="text-2xl font-bold">Civic Match</div>
        </div>
        <div className="card space-y-4">
          <h1 className="text-xl font-semibold text-center">Reset Your Password</h1>
          <p className="text-sm opacity-80 text-center">
            Enter your new password below.
          </p>
          
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-3">
              <label className="text-xs opacity-70">New Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full rounded-lg border bg-transparent px-3 py-2 pr-10 text-sm"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              <label className="text-xs opacity-70">Confirm New Password</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full rounded-lg border bg-transparent px-3 py-2 pr-10 text-sm"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            {error && <div className="text-xs text-red-500">{error}</div>}
            
            <button
              type="submit"
              className="h-10 w-full inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] text-sm disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
          
          <div className="text-center">
            <button
              className="text-xs text-[color:var(--accent)] hover:underline"
              onClick={() => router.push('/')}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
