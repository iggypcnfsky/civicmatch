"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X, Star, UserRound, Eye, EyeOff, Lock } from "lucide-react";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

  type Profile = { id: string; name: string; role: string; bio: string; avatarUrl?: string; tags?: string[] };

const PAGE_SIZE = 24;

export default function ExplorePage() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated" ? true : status === "unauthenticated" ? false : null;
  const [mounted, setMounted] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const [items, setItems] = useState<Profile[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("civicmatch.favorites");
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set<string>();
    }
  });
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  async function failSafeLogout() {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        try { await supabase.auth.signOut(); } catch {}
        if (typeof window !== "undefined") window.location.href = "/";
      }
    } catch {}
  }

  // On sign-in, ensure profile exists once
  useEffect(() => {
    if (isAuthenticated) {
      (async () => {
        try { 
          const { isNewUser, userId } = await ensureProfileForCurrentUser();
          // Send welcome email if it's a new user (e.g., from Google OAuth)
          if (isNewUser && userId) {
            await sendWelcomeEmail(userId);
          }
        } catch {}
        try { window.dispatchEvent(new Event("civicmatch:auth-changed")); } catch {}
        
        // Handle returnUrl after successful authentication
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const returnUrl = urlParams.get('returnUrl');
          if (returnUrl) {
            window.location.href = decodeURIComponent(returnUrl);
          }
        }
      })();
    }
  }, [isAuthenticated]);
  // Load list of profiles the current user has already invited (pending connections)
  useEffect(() => {
    (async () => {
      try {
        if (!isAuthenticated) return;
        const { data: sess } = await supabase.auth.getSession();
        const me = sess?.session?.user?.id;
        if (!me) return;
        const { data, error } = await supabase
          .from("connections")
          .select("addressee_id")
          .eq("requester_id", me)
          .eq("status", "pending");
        if (error) { await failSafeLogout(); return; }
        const ids = new Set<string>((data || []).map((r: { addressee_id: string }) => r.addressee_id));
        setInvitedIds(ids);
      } catch { await failSafeLogout(); }
    })();
  }, [isAuthenticated]);


  type ProfileRow = { user_id: string; username: string | null; data: unknown; created_at: string };

  const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
  const asStringArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
    if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
  };

  function mapRowToProfile(row: ProfileRow): Profile {
    const d = (row.data ?? {}) as Record<string, unknown>;
    const name = asString(d["displayName"]) || row.username || "Member";
    const role = (asStringArray(d["skills"])?.[0]) || "Member";
    const tags = asStringArray(d["tags"])?.slice(0,3) || [];
    const bio = asString(d["bio"]) || "";
    const avatarUrl = asString(d["avatarUrl"]);
    return { id: row.user_id, name, role, bio, avatarUrl, tags };
  }

  async function fetchNextPage() {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const from = offset;
      const to = offset + PAGE_SIZE - 1;
      let query = supabase
        .from("profiles")
        .select("user_id, username, data, created_at")
        .order("created_at", { ascending: false });
      if (favoritesOnly && favoriteIds.size > 0) {
        // Client-side filter: fetch extra and filter locally to keep MVP simple
        query = query.range(from, to + 100); // overfetch a bit when filtering
      } else {
        query = query.range(from, to);
      }
      const { data, error } = (await query) as { data: ProfileRow[] | null; error: unknown };
      if (error) throw error as Error;
      let mapped = (data ?? []).map(mapRowToProfile);
      if (favoritesOnly) mapped = mapped.filter((p) => favoriteIds.has(p.id));
      setItems((prev) => {
        const existing = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const m of mapped) if (!existing.has(m.id)) merged.push(m);
        return merged;
      });
      setOffset((prev) => prev + (data?.length ?? 0));
      if (!data || data.length < PAGE_SIZE) setHasMore(false);
    } catch {
      await failSafeLogout();
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      // Initial load on auth
      setItems([]);
      setOffset(0);
      setHasMore(true);
      // Fire and forget
      fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchNextPage();
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, hasMore]);

  async function sendWelcomeEmail(userId: string) {
    try {
      const response = await fetch('/api/email/welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        console.warn('Failed to send welcome email:', await response.text());
      } else {
        console.log('Welcome email sent successfully');
      }
    } catch (emailError) {
      console.warn('Error sending welcome email:', emailError);
      // Don't fail the signup process if email fails
    }
  }

  async function ensureProfileForCurrentUser(): Promise<{ isNewUser: boolean; userId: string | null }> {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return { isNewUser: false, userId: null };
    const username = user.email ?? "";
    if (!username) return { isNewUser: false, userId: user.id };
    const md = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fullNameCandidates = [
      typeof md["name"] === "string" ? (md["name"] as string) : undefined,
      typeof md["full_name"] === "string" ? (md["full_name"] as string) : undefined,
      [md["given_name"], md["family_name"]]
        .map((v) => (typeof v === "string" ? v : ""))
        .filter(Boolean)
        .join(" ") || undefined,
    ].filter(Boolean) as string[];
    const displayName = fullNameCandidates[0] || username.split("@")[0];
    const avatarUrl = ((): string | undefined => {
      if (typeof md["picture"] === "string") return md["picture"] as string;
      if (typeof md["avatar_url"] === "string") return md["avatar_url"] as string;
      return undefined;
    })();
    // Insert only if missing to avoid overwriting existing profile data
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      const data: Record<string, unknown> = { email: username };
      if (displayName) data.displayName = displayName;
      if (avatarUrl) data.avatarUrl = avatarUrl;
      await supabase.from("profiles").insert({ user_id: user.id, username, data });
      return { isNewUser: true, userId: user.id };
    }
    return { isNewUser: false, userId: user.id };
  }

  async function handleLogin() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await ensureProfileForCurrentUser();
      try { window.dispatchEvent(new Event("civicmatch:auth-changed")); } catch {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Authentication failed";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignup() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      
      // Ensure profile is created and check if it's a new user
      const { isNewUser, userId } = await ensureProfileForCurrentUser();
      
      // Send welcome email if it's a new user
      if (isNewUser && userId) {
        await sendWelcomeEmail(userId);
      }
      
      try { window.dispatchEvent(new Event("civicmatch:auth-changed")); } catch {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign up failed";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleGoogle() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
      // Redirect begins; no further action here
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Google sign-in failed";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!email) {
      setAuthError("Please enter your email address");
      return;
    }

    setAuthError(null);
    setAuthLoading(true);
    try {
      // Step 1: Use Supabase's built-in password reset to generate the secure token
      // Note: You should customize the Supabase email template to be empty or minimal
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/reset` : "https://civicmatch.app/auth/reset",
      });
      
      if (supabaseError) {
        throw supabaseError;
      }

      // Note: Only using Supabase's built-in email now
      // Custom email sending disabled to avoid duplicate emails

      setResetSuccess(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Password reset failed";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-2">
        {/* Left: brand + about */}
        <section className="hidden lg:flex flex-col justify-center p-12 gap-8 bg-[color:var(--muted)]/10 border-r border-divider">
          <div className="flex items-center gap-4">
            <Logo className="size-12 text-[color:var(--accent)]" />
            <div className="text-3xl font-bold tracking-tight">Civic Match</div>
          </div>
          <div className="rounded-2xl border p-6 bg-[color:var(--background)]/60">
            <h2 className="text-xl font-semibold mb-2">About this platform</h2>
            <p className="text-sm opacity-85 leading-relaxed">
              Civic Match helps changemakers find the right co‑founders and collaborators for impact
              projects. Explore aligned profiles, connect with purpose, and build together.
            </p>
            <ul className="mt-4 text-sm opacity-85 list-disc pl-5 space-y-1">
              <li>Search by values, skills, and causes</li>
              <li>Invite and start messaging instantly</li>
              <li>Showcase your mission, skills, and projects</li>
            </ul>
          </div>
        </section>

        {/* Right: login/register */}
        <section className="p-6 lg:p-12 grid place-items-center">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-3 lg:hidden justify-center mb-6">
              <Logo className="size-9 text-[color:var(--accent)]" />
              <div className="text-2xl font-bold">Civic Match</div>
            </div>
            <div className="card space-y-4">
              {resetSuccess ? (
                <>
                  <h1 className="text-xl font-semibold text-center">Check your email</h1>
                  <p className="text-sm opacity-80 text-center">
                    We&apos;ve sent a password reset link to <strong>{email}</strong>. 
                    Check your email and follow the link to reset your password.
                  </p>
                  <button
                    className="h-10 w-full inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm"
                    onClick={() => {
                      setResetSuccess(false);
                      setResetMode(false);
                      setEmail("");
                      setAuthError(null);
                    }}
                  >
                    Back to sign in
                  </button>
                </>
              ) : resetMode ? (
                <>
                  <h1 className="text-xl font-semibold text-center">Reset Password</h1>
                  <p className="text-sm opacity-80 text-center">Enter your email address and we&apos;ll send you a link to reset your password.</p>
                  <div className="space-y-3">
                    <label className="text-xs opacity-70">Email</label>
                    <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm" />
                  </div>
                  {authError && <div className="text-xs text-red-500">{authError}</div>}
                  <div className="space-y-2 pt-2">
                    <button
                      className="h-10 w-full inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] text-sm disabled:opacity-60"
                      disabled={authLoading}
                      onClick={handlePasswordReset}
                    >
                      {authLoading ? "Sending..." : "Send reset link"}
                    </button>
                    <button
                      className="h-10 w-full inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm disabled:opacity-60"
                      disabled={authLoading}
                      onClick={() => {
                        setResetMode(false);
                        setAuthError(null);
                      }}
                    >
                      Back to sign in
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-semibold text-center">Welcome</h1>
                  <p className="text-sm opacity-80 text-center">Sign in or create an account to continue.</p>
                  <div className="space-y-3">
                    <label className="text-xs opacity-70">Email</label>
                    <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm" />
                    <label className="text-xs opacity-70">Password</label>
                    <div className="relative">
                      <input 
                        value={password} 
                        onChange={(e)=>setPassword(e.target.value)} 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="w-full rounded-lg border bg-transparent px-3 py-2 pr-10 text-sm" 
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {authError && <div className="text-xs text-red-500">{authError}</div>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <button
                      className="h-10 w-full inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] text-sm disabled:opacity-60"
                      disabled={authLoading}
                      onClick={handleLogin}
                    >
                      {authLoading ? "Loading..." : "Log in"}
                    </button>
                    <button
                      className="h-10 w-full inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm disabled:opacity-60"
                      disabled={authLoading}
                      onClick={handleSignup}
                    >
                      {authLoading ? "Loading..." : "Create account"}
                    </button>
                  </div>
                </>
              )}
              {!resetMode && !resetSuccess && (
                <>
                  <button
                    className="h-10 w-full inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--background)] hover:bg-[color:var(--muted)]/20 gap-2 text-sm mt-2 disabled:opacity-60"
                    onClick={handleGoogle}
                    disabled={authLoading}
                    aria-label="Continue with Google"
                  >
                {/* Google Icon SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>Continue with Google</span>
              </button>
              
              <div className="text-center mt-3">
                <button
                  className="inline-flex items-center gap-2 text-xs text-[color:var(--accent)] hover:underline"
                  onClick={() => {
                    setResetMode(true);
                    setAuthError(null);
                  }}
                >
                  <Lock className="h-3 w-3" />
                  Password Reset
                </button>
              </div>
              </>
              )}
              <div className="text-xs opacity-70 text-center">
                By continuing you agree to our{' '}
                <button
                  className="text-gray-400 hover:text-gray-300 hover:underline"
                  onClick={() => setShowGuidelines(true)}
                >
                  community guidelines
                </button>
                .
              </div>
            </div>
          </div>
        </section>

        {/* Community Guidelines Modal */}
        {showGuidelines && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-8">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowGuidelines(false)} />
            <div className="relative w-full h-full md:w-auto md:h-auto md:max-w-2xl md:max-h-[80vh] bg-[color:var(--background)] md:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-divider">
                <div className="flex items-center gap-3">
                  <Logo className="size-6 text-[color:var(--accent)]" />
                  <h2 className="text-xl font-semibold">Community Guidelines</h2>
                </div>
                <button
                  className="h-8 w-8 rounded-full border border-divider flex items-center justify-center hover:bg-[color:var(--muted)]/20"
                  onClick={() => setShowGuidelines(false)}
                  aria-label="Close guidelines"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Our Mission</h3>
                    <p className="text-sm opacity-80 leading-relaxed">
                      CivicMatch exists to connect changemakers, social entrepreneurs, and impact-driven individuals 
                      who are building a better world. We believe that meaningful collaboration starts with authentic 
                      connections and shared values.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Community Standards</h3>
                    <ul className="space-y-2 text-sm opacity-80">
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span><strong>Be Authentic:</strong> Use your real name and genuine information. Authentic profiles lead to meaningful connections.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span><strong>Stay Respectful:</strong> Treat all community members with respect. Harassment, discrimination, or hate speech will not be tolerated.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span><strong>Focus on Impact:</strong> Share projects, ideas, and collaborations that create positive social or environmental change.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span><strong>No Spam or Self-Promotion:</strong> Avoid excessive promotional content. Focus on building genuine relationships.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span><strong>Protect Privacy:</strong> Respect others&apos; privacy and don&apos;t share personal information without consent.</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Building Meaningful Connections</h3>
                    <ul className="space-y-2 text-sm opacity-80">
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span>Take time to read profiles thoroughly before reaching out</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span>Send personalized messages that reference shared interests or values</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span>Be clear about your collaboration goals and what you&apos;re looking for</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span>Follow up thoughtfully and respect response times</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Reporting & Safety</h3>
                    <p className="text-sm opacity-80 leading-relaxed">
                      If you encounter behavior that violates these guidelines, please report it to our team. 
                      We review all reports promptly and take appropriate action to maintain a safe, 
                      supportive environment for all members.
                    </p>
                  </div>

                  <div className="border-t border-divider pt-4">
                    <p className="text-xs opacity-70 leading-relaxed">
                      By using CivicMatch, you agree to these community guidelines. We reserve the right 
                      to remove content or suspend accounts that violate these standards. These guidelines 
                      may be updated periodically to reflect our growing community&apos;s needs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-divider">
                <button
                  className="h-10 w-full inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium"
                  onClick={() => setShowGuidelines(false)}
                >
                  I Understand
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  if (isAuthenticated === null) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="text-sm opacity-70">Checking session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-3 md:p-4 lg:p-6 pt-3 md:pt-4">

      <div className="grid gap-4 lg:grid-cols-[1fr_360px] items-start">
        {/* Profile Pill list */}
        <section className="min-w-0">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {items.map((p, idx) => (
              <Link
                key={p.id}
                href={`/profiles?user=${encodeURIComponent(p.id)}`}
                className={`inline-flex items-center gap-2 rounded-full border border-divider bg-[color:var(--background)] pr-3 pl-1.5 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/40 transition-all duration-300 ${invitedIds.has(p.id) ? "opacity-50" : "hover:-translate-y-0.5"} ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
                style={{ transitionDelay: `${idx * 20}ms` }}
              >
                <span className="relative inline-flex">
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt={p.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="h-10 w-10 rounded-full bg-[color:var(--muted)]/40 inline-flex items-center justify-center">
                      <UserRound className="size-4 opacity-70" />
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">{p.name}</span>
              </Link>
            ))}
          </div>
          {isLoading && <div className="py-4 text-center text-sm opacity-70">Loading…</div>}
          {!hasMore && items.length > 0 && (
            <div className="py-6 text-center text-sm opacity-70">You’re all caught up</div>
          )}
          <div ref={sentinelRef} className="h-10" />
        </section>

        {/* Sticky filter panel (desktop) */}
        <aside className="hidden lg:block sticky top-20 h-[calc(100dvh-5rem)] overflow-auto">
            <div className="card space-y-3 rounded-2xl">
            <div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-[color:var(--accent)]" /><h3 className="font-semibold">Filters</h3></div>
            <div className="text-xs opacity-80">Keep it simple: show only your favorites.</div>
            <button
              className={`${favoritesOnly ? 'h-10 w-full inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] gap-2 text-sm' : 'h-10 w-full inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 gap-2 text-sm'}`}
              onClick={() => {
                const next = !favoritesOnly;
                setFavoritesOnly(next);
                setItems([]); setOffset(0); setHasMore(true);
                fetchNextPage();
              }}
            >
              <Star className="size-4" /> {favoritesOnly ? 'Showing favorites' : 'Only favorites'}
            </button>
          </div>
        </aside>
      </div>

      {/* Sticky bottom filter control (mobile) */}
      <div className="lg:hidden fixed bottom-3 left-0 right-0 flex justify-center z-40">
        <button
          className="mx-auto h-12 px-6 rounded-full border border-divider bg-[color:var(--background)] shadow-lg flex items-center gap-2 text-sm font-medium"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="size-4" /> Filters
        </button>
      </div>

      {/* Mobile filters modal */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-divider bg-[color:var(--background)] p-4 space-y-3 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-[color:var(--accent)]" /><h3 className="font-semibold">Filters</h3></div>
              <button className="h-8 w-8 rounded-full border border-divider flex items-center justify-center" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <X className="size-4" />
              </button>
            </div>
            <div className="text-xs opacity-80">Show only your favorites.</div>
            <button
              className={`${favoritesOnly ? 'h-12 w-full inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] gap-2 text-sm' : 'h-12 w-full inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 gap-2 text-sm'}`}
              onClick={() => {
                const next = !favoritesOnly;
                setFavoritesOnly(next);
                setItems([]); setOffset(0); setHasMore(true);
                fetchNextPage();
              }}
            >
              <Star className="size-4" /> {favoritesOnly ? 'Showing favorites' : 'Only favorites'}
            </button>
            <button className="h-12 w-full inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--background)] hover:bg-[color:var(--muted)]/20 text-sm" onClick={() => setFiltersOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}


