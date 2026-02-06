"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { X, Eye, EyeOff, Lock, Plus, Users, Calendar, Briefcase, UserRound, MapPin, Video, Search, ArrowLeft, Link as LinkIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/Logo";
import TopBar from "@/components/TopBar";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import ExploreMap from "@/components/ExploreMap";
import CreateEventModal from "@/components/CreateEventModal";
import { ProfileQualityService } from "@/lib/services/ProfileQualityService";
import type { ProfileWithLocation, ProfileRow } from "@/types/profile";
import type { ProjectForMap } from "@/types/project";
import type { EventForMap, EventData } from "@/types/event";
import type { ChallengeForMap, BoundingBox } from "@/types/challenge";
import { formatEventDate } from "@/types/event";
import { useChallenges } from "@/lib/hooks/useChallenges";
import type { CombinedEvent } from "@/types/discoveredEvent";


const PAGE_SIZE = 24;

type TabType = "people" | "projects" | "events" | "challenges";

export default function ExplorePage() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated" ? true : status === "unauthenticated" ? false : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const [items, setItems] = useState<ProfileWithLocation[]>([]);
  const [projects, setProjects] = useState<ProjectForMap[]>([]);
  const [events, setEvents] = useState<CombinedEvent[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("people");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithLocation | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectForMap | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CombinedEvent | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeForMap | null>(null);
  const [viewingOwnProfile, setViewingOwnProfile] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileWithLocation | null>(null);
  const [showPeople, setShowPeople] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showChallenges, setShowChallenges] = useState(true);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  const [mapBounds, setMapBounds] = useState<BoundingBox | null>(null);
  
  // Fetch challenges based on map bounds
  const { challenges, loading: challengesLoading, error: challengesError, refetch: refetchChallenges } = useChallenges(mapBounds, {
    enabled: showChallenges,
    limit: 100,
  });

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



  const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
  const asStringArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
    if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
  };

  function mapRowToProfile(row: ProfileRow): ProfileWithLocation {
    const d = (row.data ?? {}) as Record<string, unknown>;
    const name = asString(d["displayName"]) || row.username || "Member";
    const role = (asStringArray(d["skills"])?.[0]) || "Member";
    const tags = asStringArray(d["tags"]) || [];
    const bio = asString(d["bio"]) || "";
    const avatarUrl = asString(d["avatarUrl"]);
    
    // Handle location data
    let location: ProfileWithLocation['location'];
    const locationData = d["location"];
    
    if (locationData && typeof locationData === 'object' && 'coordinates' in locationData) {
      // New format with coordinates
      const locData = locationData as Record<string, unknown>;
      location = {
        coordinates: locData.coordinates as { lat: number; lng: number; accuracy: string },
        displayName: locData.displayName as string,
        placeId: locData.placeId as string,
        source: locData.source as 'places_autocomplete' | 'geocoded' | 'manual',
        geocodedAt: locData.geocodedAt as string,
        raw: locationData,
        needsUpdate: false
      };
    } else if (locationData && typeof locationData === 'string' && locationData.trim()) {
      // Legacy string format
      location = {
        raw: locationData,
        displayName: locationData,
        needsUpdate: true
      };
    } else {
      // No location data
      location = {
        raw: "",
        needsUpdate: false
      };
    }
    
    // Calculate quality information
    const qualityInfo = ProfileQualityService.calculateQualityInfo(row.user_id, d);
    
    // Extract extended profile fields
    const email = asString(d["email"]);
    const links = asStringArray(d["links"]);
    const skills = asStringArray(d["skills"]);
    const fame = asString(d["fame"]);
    const game = asString(d["game"]);
    const workStyle = asString(d["workStyle"]);
    const helpNeeded = asString(d["helpNeeded"]);
    const xp = typeof d["xp"] === "number" ? d["xp"] : 0;
    
    // Handle aim (could be array or single string)
    let aim: ProfileWithLocation["aim"] = [];
    const aimData = d["aim"];
    if (Array.isArray(aimData)) {
      aim = aimData as ProfileWithLocation["aim"];
    } else if (typeof aimData === "string" && aimData) {
      aim = [{ title: aimData, summary: "" }];
    }
    
    // Handle portfolio (array of strings)
    let portfolio: string[] = [];
    const portfolioData = d["portfolio"];
    if (Array.isArray(portfolioData)) {
      portfolio = portfolioData.filter((item): item is string => typeof item === "string");
    }
    
    // Handle custom sections
    let customSections: ProfileWithLocation["customSections"] = [];
    const customData = d["customSections"];
    if (Array.isArray(customData)) {
      customSections = customData as ProfileWithLocation["customSections"];
    }
    
    return { 
      id: row.user_id, 
      name, 
      role, 
      bio, 
      avatarUrl, 
      tags, 
      location, 
      qualityInfo,
      email,
      links,
      skills,
      fame,
      aim,
      game,
      portfolio,
      customSections,
      workStyle,
      helpNeeded,
      xp,
    };
  }

  async function fetchNextPage() {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const from = offset;
      const to = offset + PAGE_SIZE - 1;
      const query = supabase
        .from("profiles")
        .select("user_id, username, data, created_at")
        .order("created_at", { ascending: false })
        .range(from, to);
      const { data, error } = (await query) as { data: ProfileRow[] | null; error: unknown };
      if (error) throw error as Error;
      const mapped = (data ?? []).map(mapRowToProfile);
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

  async function fetchAllProfiles() {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const query = supabase
        .from("profiles")
        .select("user_id, username, data, created_at")
        .order("created_at", { ascending: false })
        .limit(500); // Reasonable limit for map display
        
      const { data, error } = (await query) as { data: ProfileRow[] | null; error: unknown };
      if (error) throw error as Error;
      const mapped = (data ?? []).map(mapRowToProfile);
      
      setItems(mapped);
      setHasMore(false); // No pagination needed for map view
    } catch {
      await failSafeLogout();
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchProjects() {
    try {
      // Fetch projects with location coordinates
      const { data, error } = await supabase
        .from("projects")
        .select("id, slug, data")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Map to ProjectForMap format, filtering only those with coordinates
      const projectsForMap: ProjectForMap[] = (data ?? [])
        .filter((row: { data: { location?: { coordinates?: { lat: number; lng: number } } } }) => 
          row.data?.location?.coordinates?.lat && row.data?.location?.coordinates?.lng
        )
        .map((row: { id: string; slug: string; data: { title?: string; logoUrl?: string; stats?: { memberCount?: number }; location?: { city?: string; country?: string; coordinates?: { lat: number; lng: number } } } }) => ({
          id: row.id,
          slug: row.slug,
          name: row.data.title || "Untitled Project",
          logoUrl: row.data.logoUrl,
          location: {
            coordinates: row.data.location!.coordinates!,
            displayName: [row.data.location?.city, row.data.location?.country].filter(Boolean).join(", "),
          },
          memberCount: row.data.stats?.memberCount || 0,
          members: [], // Will be populated on hover if needed
        }));
      
      setProjects(projectsForMap);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  }

  async function fetchEvents() {
    try {
      // Fetch combined events (user-submitted + discovered) from API
      const response = await fetch('/api/events/combined?upcoming=true&limit=100');
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      // Initial load on auth
      setItems([]);
      setOffset(0);
      setHasMore(true);
      // Load all profiles, projects, and events for map view
      fetchAllProfiles();
      fetchProjects();
      fetchEvents();
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

  // Memoize arrays passed to the map so marker effects only re-run on real data changes
  // (Must be above early returns to satisfy Rules of Hooks)
  const profilesForMap = useMemo(
    () => showPeople ? items.filter(p => p.location?.coordinates?.lat && p.location?.coordinates?.lng) : [],
    [showPeople, items]
  );
  const projectsForMap = useMemo(() => showProjects ? projects : [], [showProjects, projects]);
  const eventsForMap = useMemo((): EventForMap[] => {
    if (!showEvents) return [];
    // Filter events with coordinates and map to format expected by ExploreMap
    return events
      .filter(e => e.latitude !== null && e.longitude !== null)
      .map(e => ({
        id: e.id,
        title: e.name,
        location: {
          coordinates: { lat: e.latitude!, lng: e.longitude! },
          displayName: e.location_city || e.location_name || 'Unknown location',
        },
        startDateTime: e.start_datetime || '',
        endDateTime: e.end_datetime || undefined,
        isOnline: e.is_online,
        rsvpCount: 0, // Combined events don't have RSVP counts yet
        creatorId: e.creator_id || '',
      }));
  }, [showEvents, events]);
  const challengesForMap = useMemo(() => showChallenges ? challenges : [], [showChallenges, challenges]);

  // Calculate center location for map based on selected item
  const centerOn = useMemo(() => {
    if (selectedProfile?.location?.coordinates) {
      return {
        lat: selectedProfile.location.coordinates.lat,
        lng: selectedProfile.location.coordinates.lng,
      };
    }
    if (selectedProject?.location?.coordinates) {
      return {
        lat: selectedProject.location.coordinates.lat,
        lng: selectedProject.location.coordinates.lng,
      };
    }
    if (selectedEvent?.latitude && selectedEvent?.longitude) {
      return {
        lat: selectedEvent.latitude,
        lng: selectedEvent.longitude,
      };
    }
    if (selectedChallenge) {
      return {
        lat: selectedChallenge.latitude,
        lng: selectedChallenge.longitude,
      };
    }
    return null;
  }, [selectedProfile, selectedProject, selectedEvent, selectedChallenge]);

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
    <>
      {/* TopBar with Filter Buttons */}
      <TopBar 
        mapFilters={{ showPeople, showProjects, showEvents, showChallenges }}
        onTogglePeople={() => setShowPeople(!showPeople)}
        onToggleProjects={() => setShowProjects(!showProjects)}
        onToggleEvents={() => setShowEvents(!showEvents)}
        onToggleChallenges={() => setShowChallenges(!showChallenges)}
        onShowAll={() => {
          setShowPeople(true);
          setShowProjects(true);
          setShowEvents(true);
          setShowChallenges(true);
        }}
        onHideAll={() => {
          setShowPeople(false);
          setShowProjects(false);
          setShowEvents(false);
          setShowChallenges(false);
        }}
        onProfileClick={() => {
          setViewingOwnProfile(true);
          setActiveTab("people");
          // Find own profile in items or fetch it
          const fetchOwnProfile = async () => {
            const { data: sess } = await supabase.auth.getSession();
            const uid = sess?.session?.user?.id;
            if (uid) {
              const own = items.find(p => p.id === uid);
              if (own) {
                setCurrentUserProfile(own);
              } else {
                // Fetch from API if not in items
                const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).single();
                if (data) {
                  setCurrentUserProfile(mapRowToProfile(data as ProfileRow));
                }
              }
            }
          };
          fetchOwnProfile();
        }}
      />

      <div className="fixed inset-0 top-12 flex">
        {/* Left side - Tabs Panel (30%) */}
        <div className="w-[30%] h-full bg-[color:var(--background)] border-r border-divider flex flex-col">
        {/* Tabs Header */}
        <div className="flex items-center border-b border-divider px-2">
          <button
            onClick={() => {
              setActiveTab("people");
              setSelectedProfile(null);
              setSelectedProject(null);
              setSelectedEvent(null);
              setSelectedChallenge(null);
              setViewingOwnProfile(false);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-medium transition-colors ${
              activeTab === "people"
                ? "text-[color:var(--accent)] border-b-2 border-[color:var(--accent)]"
                : "text-[color:var(--foreground)] opacity-60 hover:opacity-100"
            }`}
          >
            <Users className="size-4" />
            <span className="hidden sm:inline">People</span>
            <span className="text-xs opacity-60">({items.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("projects");
              setSelectedProfile(null);
              setSelectedProject(null);
              setSelectedEvent(null);
              setSelectedChallenge(null);
              setViewingOwnProfile(false);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-medium transition-colors ${
              activeTab === "projects"
                ? "text-[color:var(--accent)] border-b-2 border-[color:var(--accent)]"
                : "text-[color:var(--foreground)] opacity-60 hover:opacity-100"
            }`}
          >
            <Briefcase className="size-4" />
            <span className="hidden sm:inline">Projects</span>
            <span className="text-xs opacity-60">({projects.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("events");
              setSelectedProfile(null);
              setSelectedProject(null);
              setSelectedEvent(null);
              setSelectedChallenge(null);
              setViewingOwnProfile(false);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-medium transition-colors ${
              activeTab === "events"
                ? "text-[color:var(--accent)] border-b-2 border-[color:var(--accent)]"
                : "text-[color:var(--foreground)] opacity-60 hover:opacity-100"
            }`}
          >
            <Calendar className="size-4" />
            <span className="hidden sm:inline">Events</span>
            <span className="text-xs opacity-60">({events.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("challenges");
              setSelectedProfile(null);
              setSelectedProject(null);
              setSelectedEvent(null);
              setSelectedChallenge(null);
              setViewingOwnProfile(false);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-medium transition-colors ${
              activeTab === "challenges"
                ? "text-[color:var(--accent)] border-b-2 border-[color:var(--accent)]"
                : "text-[color:var(--foreground)] opacity-60 hover:opacity-100"
            }`}
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 22 20 2 20 12 2" />
              <line x1="12" y1="8" x2="12" y2="14" />
              <circle cx="12" cy="17" r="1" />
            </svg>
            <span className="hidden sm:inline">Challenges</span>
            <span className="text-xs opacity-60">({challenges.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 border-b border-divider">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-40" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-divider bg-[color:var(--muted)]/10 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-transparent">
          {viewingOwnProfile && currentUserProfile ? (
            <EditableProfileDetail 
              profile={currentUserProfile}
              onBack={() => setViewingOwnProfile(false)}
            />
          ) : selectedProfile ? (
            <ProfileDetail 
              profile={selectedProfile} 
              onBack={() => setSelectedProfile(null)} 
            />
          ) : selectedProject ? (
            <ProjectDetail 
              project={selectedProject} 
              onBack={() => setSelectedProject(null)} 
            />
          ) : selectedEvent ? (
            <EventDetail 
              event={selectedEvent} 
              onBack={() => setSelectedEvent(null)} 
            />
          ) : selectedChallenge ? (
            <ChallengeDetail 
              challenge={selectedChallenge} 
              onBack={() => setSelectedChallenge(null)} 
            />
          ) : (
            <>
              {activeTab === "people" && (
                <PeopleList 
                  items={items} 
                  invitedIds={invitedIds} 
                  searchQuery={searchQuery} 
                  onSelectProfile={setSelectedProfile}
                />
              )}
              {activeTab === "projects" && (
                <ProjectsList 
                  projects={projects} 
                  searchQuery={searchQuery} 
                  onSelectProject={setSelectedProject}
                />
              )}
              {activeTab === "events" && (
                <EventsList 
                  events={events} 
                  searchQuery={searchQuery} 
                  onSelectEvent={setSelectedEvent}
                />
              )}
              {activeTab === "challenges" && (
                <ChallengesList 
                  challenges={challenges} 
                  searchQuery={searchQuery}
                  isLoading={challengesLoading}
                  error={challengesError}
                  onSelectChallenge={setSelectedChallenge}
                  onRetry={refetchChallenges}
                />
              )}
            </>
          )}
        </div>

        {/* Contextual Add Button - only visible in certain tabs */}
        {activeTab === "events" && (
          <div className="px-3 py-3 border-t border-divider bg-[color:var(--background)]">
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:brightness-110 transition-all"
            >
              <Plus className="size-4" />
              <span>Create Event</span>
            </button>
          </div>
        )}
      </div>

      {/* Right side - Map (70%) */}
      <div className="w-[70%] h-full relative">
        <ExploreMap
          profiles={profilesForMap}
          projects={projectsForMap}
          events={eventsForMap}
          challenges={challengesForMap}
          invitedIds={invitedIds}
          onBoundsChange={setMapBounds}
          centerOn={centerOn}
          onProfileClick={setSelectedProfile}
          onProjectClick={setSelectedProject}
          onEventClick={(mapEvent) => {
            // Find the original CombinedEvent by ID
            const originalEvent = events.find(e => e.id === mapEvent.id);
            if (originalEvent) {
              setSelectedEvent(originalEvent);
            }
          }}
          onChallengeClick={setSelectedChallenge}
          className="w-full h-full"
        />
      </div>

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <CreateEventModal
          onClose={() => setShowCreateEventModal(false)}
          onEventCreated={() => {
            setShowCreateEventModal(false);
            fetchEvents(); // Refresh events
          }}
        />
      )}
    </div>
    </>
  );
}

// People List Component
function PeopleList({ 
  items, 
  invitedIds, 
  searchQuery, 
  onSelectProfile 
}: { 
  items: ProfileWithLocation[]; 
  invitedIds: Set<string>; 
  searchQuery: string;
  onSelectProfile: (profile: ProfileWithLocation) => void;
}) {
  const filteredItems = searchQuery.trim()
    ? items.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : items;

  if (filteredItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center opacity-60">
          <Users className="size-12 mx-auto mb-4 opacity-40" />
          <p className="text-sm">{searchQuery ? "No people match your search." : "No people found yet."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {filteredItems.map((profile) => (
        <button
          key={profile.id}
          onClick={() => onSelectProfile(profile)}
          className="w-full flex items-start gap-3 p-3 rounded-xl border border-divider hover:border-[color:var(--accent)]/50 hover:bg-[color:var(--muted)]/10 transition-all group text-left"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[color:var(--muted)]/40 flex items-center justify-center">
                <UserRound className="size-5 opacity-60" />
              </div>
            )}
            {invitedIds.has(profile.id) && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">!</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm truncate">{profile.name}</h3>
              {profile.qualityInfo?.isQualityProfile && (
                <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="Quality Profile" />
              )}
            </div>
            <p className="text-xs opacity-60 truncate">{profile.role}</p>
            {profile.bio && (
              <p className="text-xs opacity-50 mt-1 line-clamp-2">{profile.bio}</p>
            )}
            {profile.tags && profile.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {profile.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--muted)]/20 opacity-70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Location indicator */}
          {profile.location?.displayName && (
            <div className="flex items-center gap-1 text-xs opacity-40 flex-shrink-0">
              <MapPin className="size-3" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// Profile Detail Component
function ProfileDetail({ profile, onBack }: { profile: ProfileWithLocation; onBack: () => void }) {
  return (
    <div className="h-full flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-3 p-4 border-b border-divider">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Avatar and Name */}
        <div className="flex flex-col items-center text-center mb-6">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={profile.name}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[color:var(--muted)]/40 flex items-center justify-center mb-4">
              <UserRound className="size-10 opacity-60" />
            </div>
          )}
          <h2 className="text-xl font-semibold">{profile.name}</h2>
          {profile.role && profile.role !== "Member" && (
            <p className="text-sm opacity-60 mt-1">{profile.role}</p>
          )}
        </div>

        {/* Bio -->
        {profile.bio && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">About</h3>
            <p className="text-sm opacity-60 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Contact & Links */}
        {(profile.email || (profile.links && profile.links.length > 0)) && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">Contact</h3>
            <div className="space-y-2">
              {/* Email */}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="flex items-center gap-2 text-sm text-[color:var(--accent)] hover:underline"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <span className="truncate">{profile.email}</span>
                </a>
              )}
              {/* Links */}
              {profile.links && profile.links.map((link, i) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[color:var(--accent)] hover:underline"
                >
                  <LinkIcon className="size-3.5" />
                  <span className="truncate">{link}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, i) => (
                <span
                  key={i}
                  className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--muted)]/20 opacity-80"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags / Interests */}
        {profile.tags && profile.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {profile.location?.displayName && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">Location</h3>
            <div className="flex items-center gap-2 text-sm opacity-60">
              <MapPin className="size-4" />
              {profile.location.displayName}
            </div>
          </div>
        )}

        {/* Work Style */}
        {profile.workStyle && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">Work Style</h3>
            <p className="text-sm opacity-60 leading-relaxed">{profile.workStyle}</p>
          </div>
        )}

        {/* Help Needed */}
        {profile.helpNeeded && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">Looking For Help With</h3>
            <p className="text-sm opacity-60 leading-relaxed">{profile.helpNeeded}</p>
          </div>
        )}

        {/* Aim / Goals */}
        {profile.aim && profile.aim.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">Goals & Aims</h3>
            <div className="space-y-3">
              {profile.aim.map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-[color:var(--muted)]/10">
                  <h4 className="text-sm font-medium">{item.title}</h4>
                  {item.summary && (
                    <p className="text-xs opacity-60 mt-1">{item.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fame / Recognition */}
        {profile.fame && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">Recognition</h3>
            <p className="text-sm opacity-60 leading-relaxed">{profile.fame}</p>
          </div>
        )}

        {/* Game */}
        {profile.game && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">Game</h3>
            <p className="text-sm opacity-60 leading-relaxed">{profile.game}</p>
          </div>
        )}

        {/* Portfolio */}
        {profile.portfolio && profile.portfolio.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">Portfolio</h3>
            <div className="space-y-2">
              {profile.portfolio.map((item, i) => (
                <a
                  key={i}
                  href={item}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[color:var(--accent)] hover:underline"
                >
                  <LinkIcon className="size-3.5" />
                  <span className="truncate">{item}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Custom Sections */}
        {profile.customSections && profile.customSections.length > 0 && (
          <div className="space-y-6">
            {profile.customSections.map((section) => (
              <div key={section.id} className="mb-6">
                <h3 className="text-sm font-medium mb-2 opacity-80">{section.title}</h3>
                <p className="text-sm opacity-60 leading-relaxed whitespace-pre-wrap">{section.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Projects List Component
function ProjectsList({ 
  projects, 
  searchQuery,
  onSelectProject
}: { 
  projects: ProjectForMap[]; 
  searchQuery: string;
  onSelectProject: (project: ProjectForMap) => void;
}) {
  const filteredProjects = searchQuery.trim()
    ? projects.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location?.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects;

  if (filteredProjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center opacity-60">
          <Briefcase className="size-12 mx-auto mb-4 opacity-40" />
          <p className="text-sm">{searchQuery ? "No projects match your search." : "No projects found yet."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {filteredProjects.map((project) => (
        <button
          key={project.id}
          onClick={() => onSelectProject(project)}
          className="w-full flex items-start gap-3 p-3 rounded-xl border border-divider hover:border-[color:var(--accent)]/50 hover:bg-[color:var(--muted)]/10 transition-all group text-left"
        >
          {/* Logo */}
          <div className="relative flex-shrink-0">
            {project.logoUrl ? (
              <Image
                src={project.logoUrl}
                alt={project.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[color:var(--accent)]/10 flex items-center justify-center">
                <Briefcase className="size-5 text-[color:var(--accent)]" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{project.name}</h3>
            <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
              <Users className="size-3" />
              <span>{project.memberCount || 0} members</span>
            </div>
            {project.location?.displayName && (
              <div className="flex items-center gap-1 text-xs opacity-50 mt-1">
                <MapPin className="size-3" />
                <span className="truncate">{project.location.displayName}</span>
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// Events List Component with Month Grouping
function EventsList({ 
  events, 
  searchQuery,
  onSelectEvent
}: { 
  events: CombinedEvent[]; 
  searchQuery: string;
  onSelectEvent: (event: CombinedEvent) => void;
}) {
  // Sort events by date (upcoming first)
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start_datetime || 0).getTime() - 
    new Date(b.start_datetime || 0).getTime()
  );

  const filteredEvents = searchQuery.trim()
    ? sortedEvents.filter(e => 
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location_country?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sortedEvents;

  if (filteredEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center opacity-60">
          <Calendar className="size-12 mx-auto mb-4 opacity-40" />
          <p className="text-sm">{searchQuery ? "No events match your search." : "No events found yet."}</p>
        </div>
      </div>
    );
  }

  // Group events by month
  const eventsByMonth: Record<string, CombinedEvent[]> = {};
  filteredEvents.forEach(event => {
    const date = new Date(event.start_datetime || 0);
    const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!eventsByMonth[monthKey]) {
      eventsByMonth[monthKey] = [];
    }
    eventsByMonth[monthKey].push(event);
  });

  // Format date helper for CombinedEvent
  const formatCombinedEventDate = (event: CombinedEvent): string => {
    const start = new Date(event.start_datetime || 0);
    const end = event.end_datetime ? new Date(event.end_datetime) : null;
    
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    
    let formatted = start.toLocaleDateString('en-US', options);
    
    if (end && event.end_datetime !== event.start_datetime) {
      formatted += ` - ${end.toLocaleDateString('en-US', options)}`;
    }
    
    return formatted;
  };

  return (
    <div className="py-2">
      {Object.entries(eventsByMonth).map(([month, monthEvents]) => (
        <div key={month} className="mb-4">
          {/* Month Header - Sticky */}
          <div className="sticky top-0 z-10 px-4 py-2 bg-[color:var(--background)] border-y border-divider">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              {month}
            </h3>
          </div>
          
          {/* Events for this month */}
          <div className="px-4 py-2 space-y-2">
            {monthEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className="w-full flex items-start gap-3 p-3 rounded-xl border border-divider hover:border-[color:var(--accent)]/50 hover:bg-[color:var(--muted)]/10 transition-all group text-left"
              >
                {/* Date Badge */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[color:var(--accent)]/10 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-medium text-[color:var(--accent)] uppercase">
                    {new Date(event.start_datetime || 0).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-lg font-bold text-[color:var(--accent)]">
                    {new Date(event.start_datetime || 0).getDate()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm truncate">{event.name}</h3>
                    {event.source === 'discovered' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 flex-shrink-0">
                        AI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
                    <Calendar className="size-3" />
                    <span>{formatCombinedEventDate(event)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {event.is_online ? (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                        <Video className="size-3" />
                        Online
                      </span>
                    ) : event.location_city ? (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--muted)]/20 opacity-70">
                        <MapPin className="size-3" />
                        <span className="truncate max-w-[150px]">
                          {[event.location_city, event.location_country].filter(Boolean).join(", ")}
                        </span>
                      </span>
                    ) : null}
                    {event.event_type && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--accent)]/10 text-[color:var(--accent)] capitalize">
                        {event.event_type}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


// Challenges List Component
function ChallengesList({ 
  challenges, 
  searchQuery,
  isLoading,
  error,
  onSelectChallenge,
  onRetry
}: { 
  challenges: ChallengeForMap[]; 
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  onSelectChallenge: (challenge: ChallengeForMap) => void;
  onRetry?: () => void;
}) {
  const filteredChallenges = searchQuery.trim()
    ? challenges.filter(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : challenges;

  // Show error state (but still show cached challenges if available)
  if (error && filteredChallenges.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <svg className="size-12 mx-auto mb-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 22 20 2 20 12 2" />
            <line x1="12" y1="8" x2="12" y2="14" />
            <circle cx="12" cy="17" r="1" />
          </svg>
          <p className="text-sm opacity-80 mb-2">Failed to load challenges</p>
          <p className="text-xs opacity-50 mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 text-xs font-medium rounded-full bg-[color:var(--accent)] text-[color:var(--background)] hover:brightness-110 transition-all"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading && filteredChallenges.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center opacity-60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto mb-4" />
          <p className="text-sm">Loading challenges...</p>
        </div>
      </div>
    );
  }

  if (filteredChallenges.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center opacity-60">
          <svg className="size-12 mx-auto mb-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 22 20 2 20 12 2" />
            <line x1="12" y1="8" x2="12" y2="14" />
            <circle cx="12" cy="17" r="1" />
          </svg>
          <p className="text-sm">{searchQuery ? "No challenges match your search." : "Move the map to see challenges in your area."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {filteredChallenges.map((challenge) => (
        <ChallengeCard 
          key={challenge.id} 
          challenge={challenge} 
          onSelect={onSelectChallenge}
        />
      ))}
    </div>
  );
}

// Challenge Card Component
function ChallengeCard({ 
  challenge,
  onSelect
}: { 
  challenge: ChallengeForMap;
  onSelect: (challenge: ChallengeForMap) => void;
}) {
  const category = getCategoryInfo(challenge.category);
  const severityColor = getSeverityColor(challenge.severity);
  const severityLabel = getSeverityLabel(challenge.severity);
  
  return (
    <button
      onClick={() => onSelect(challenge)}
      className="w-full flex flex-col p-3 rounded-xl border border-divider hover:border-[color:var(--accent)]/50 hover:bg-[color:var(--muted)]/10 transition-all group text-left"
    >
      {/* Header: Category & Severity */}
      <div className="flex items-center justify-between mb-2">
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: `${category.color}20`, color: category.color }}
        >
          {category.label}
        </span>
        <span 
          className="text-[10px] font-medium"
          style={{ color: severityColor }}
        >
          {severityLabel}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-medium text-sm leading-tight mb-1 group-hover:text-[color:var(--accent)] transition-colors">
        {challenge.title}
      </h3>

      {/* Summary */}
      <p className="text-xs opacity-60 line-clamp-2 mb-2">
        {challenge.summary}
      </p>

      {/* Location */}
      <div className="flex items-center gap-1 text-xs opacity-50 mb-2">
        <MapPin className="size-3" />
        <span className="truncate">{challenge.location_name}</span>
      </div>

      {/* Skills */}
      {challenge.skills_needed && challenge.skills_needed.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {challenge.skills_needed.slice(0, 3).map((skill, idx) => (
            <span 
              key={idx}
              className="px-1.5 py-0.5 bg-[var(--muted)]/30 rounded text-[10px] opacity-70"
            >
              {skill}
            </span>
          ))}
          {challenge.skills_needed.length > 3 && (
            <span className="px-1.5 py-0.5 text-[10px] opacity-50">
              +{challenge.skills_needed.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Source & Date */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-divider text-[10px] opacity-40">
        <span className="truncate max-w-[120px]">{challenge.source_title || 'News'}</span>
        <span>{new Date(challenge.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </button>
  );
}

// Project Detail Component
function ProjectDetail({ project, onBack }: { project: ProjectForMap; onBack: () => void }) {
  return (
    <div className="h-full flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-3 p-4 border-b border-divider">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </div>

      {/* Project Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Logo and Name */}
        <div className="flex flex-col items-center text-center mb-6">
          {project.logoUrl ? (
            <Image
              src={project.logoUrl}
              alt={project.name}
              width={80}
              height={80}
              className="w-20 h-20 rounded-xl object-cover mb-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-[color:var(--accent)]/10 flex items-center justify-center mb-4">
              <Briefcase className="size-8 text-[color:var(--accent)]" />
            </div>
          )}
          <h2 className="text-xl font-semibold">{project.name}</h2>
          <div className="flex items-center gap-2 text-sm opacity-60 mt-1">
            <Users className="size-4" />
            <span>{project.memberCount || 0} members</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-3 mb-6">
          <Link
            href={`/projects/${encodeURIComponent(project.slug)}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:brightness-110 transition-all"
          >
            <ExternalLink className="size-4" />
            View Project
          </Link>
        </div>

        {/* Location */}
        {project.location?.displayName && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 opacity-80">Location</h3>
            <div className="flex items-center gap-2 text-sm opacity-60">
              <MapPin className="size-4" />
              {project.location.displayName}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Event Detail Component - Full event information inline in sidebar
function EventDetail({ event, onBack }: { event: CombinedEvent; onBack: () => void }) {
  const startDate = event.start_datetime;
  const endDate = event.end_datetime;
  
  // Format date for display
  const formatDetailDate = (): string => {
    if (!startDate) return 'Date TBD';
    const start = new Date(startDate);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    };
    
    let formatted = start.toLocaleDateString('en-US', options);
    
    if (endDate && endDate !== startDate) {
      const end = new Date(endDate);
      formatted += ` - ${end.toLocaleDateString('en-US', options)}`;
    }
    
    return formatted;
  };
  
  // Format time
  const formatTime = (): string => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (!endDate) return timeStr;
    const end = new Date(endDate);
    const endTimeStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return endDate !== startDate ? timeStr : `${timeStr} - ${endTimeStr}`;
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-3 p-4 border-b border-divider">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft className="size-4" />
          Back to events
        </button>
      </div>

      {/* Event Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero Section with Date Badge */}
        <div className="p-6 border-b border-divider bg-[color:var(--muted)]/5">
          <div className="flex items-start gap-4">
            {/* Date Badge */}
            <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-[color:var(--accent)]/10 flex flex-col items-center justify-center">
              <span className="text-[10px] font-medium text-[color:var(--accent)] uppercase">
                {startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short' }) : 'TBD'}
              </span>
              <span className="text-xl font-bold text-[color:var(--accent)]">
                {startDate ? new Date(startDate).getDate() : '?'}
              </span>
            </div>
            
            {/* Title & Meta */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold leading-tight">{event.name}</h2>
              <div className="text-sm opacity-60 mt-1">
                {formatDetailDate()}
              </div>
              {formatTime() && (
                <div className="text-xs opacity-50 mt-0.5">{formatTime()}</div>
              )}
            </div>
          </div>
          
          {/* Source Badge */}
          <div className="mt-4 flex flex-wrap gap-2">
            {event.source === 'discovered' ? (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-purple-500/10 text-purple-600">
                <Sparkles className="size-3" />
                Discovered by AI
                {event.relevance_score && (
                  <span className="opacity-70">({event.relevance_score}% match)</span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-green-500/10 text-green-600">
                <Users className="size-3" />
                Community Event
              </span>
            )}
            {event.event_type && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-[color:var(--accent)]/10 text-[color:var(--accent)] capitalize">
                {event.event_type}
              </span>
            )}
            {event.is_hybrid && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-600">
                Hybrid
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-2">
          {event.registration_url ? (
            <a
              href={event.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:brightness-110 transition-all"
            >
              <ExternalLink className="size-4" />
              Register for Event
            </a>
          ) : event.event_url ? (
            <a
              href={event.event_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:brightness-110 transition-all"
            >
              <ExternalLink className="size-4" />
              Visit Event Website
            </a>
          ) : null}
        </div>

        {/* Details Sections */}
        <div className="px-4 pb-6 space-y-6">
          {/* Location Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Location
            </h3>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="size-4 mt-0.5 opacity-60" />
              <div>
                {event.is_online ? (
                  <>
                    <span className="font-medium">Online Event</span>
                    {event.is_hybrid && <span className="opacity-60 block">Hybrid - Also in person</span>}
                  </>
                ) : (
                  <>
                    {event.location_name && (
                      <span className="font-medium block">{event.location_name}</span>
                    )}
                    <span className="opacity-60">
                      {[event.location_city, event.location_country].filter(Boolean).join(", ") || "Location TBD"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Organizer Section */}
          {event.organizer && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Organizer
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <Users className="size-4 opacity-60" />
                <span>{event.organizer}</span>
              </div>
            </div>
          )}
          
          {/* Cost Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Cost
            </h3>
            <div className="text-sm">
              {event.cost === 'free' ? (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <span className="font-medium">Free</span>
                </span>
              ) : event.cost === 'paid' ? (
                <span className="font-medium capitalize">Paid</span>
              ) : event.cost === 'donation' ? (
                <span className="font-medium capitalize">Donation based</span>
              ) : (
                <span className="opacity-60">Cost information not available</span>
              )}
            </div>
          </div>

          {/* Tags Section */}
          {event.tags && event.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {event.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-1 rounded-full bg-[color:var(--muted)]/20 opacity-80"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Description Section */}
          {event.description && (
            <div className="space-y-2 pt-4 border-t border-divider">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                About
              </h3>
              <p className="text-sm opacity-70 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Meta Info - Discovered/Added date */}
          <div className="pt-4 border-t border-divider">
            <div className="text-[10px] opacity-50">
              {event.source === 'discovered' && event.discovered_at ? (
                <span>Discovered {new Date(event.discovered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              ) : event.created_at ? (
                <span>Added {new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Challenge Detail Component
function ChallengeDetail({ challenge, onBack }: { challenge: ChallengeForMap; onBack: () => void }) {
  const category = getCategoryInfo(challenge.category);
  const severityColor = getSeverityColor(challenge.severity);
  const severityLabel = getSeverityLabel(challenge.severity);

  return (
    <div className="h-full flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-3 p-4 border-b border-divider">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </div>

      {/* Challenge Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Category & Severity */}
        <div className="flex items-center gap-2 mb-4">
          <span 
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${category.color}20`, color: category.color }}
          >
            {category.label}
          </span>
          <span 
            className="text-xs font-medium"
            style={{ color: severityColor }}
          >
            {severityLabel}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-4">{challenge.title}</h2>

        {/* Summary */}
        <p className="text-sm opacity-70 leading-relaxed mb-6">
          {challenge.summary}
        </p>

        {/* Action Button */}
        <div className="flex gap-3 mb-6">
          <a
            href={challenge.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:brightness-110 transition-all"
          >
            <ExternalLink className="size-4" />
            Read Article
          </a>
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Location */}
          <div>
            <h3 className="text-sm font-medium mb-2 opacity-80">Location</h3>
            <div className="flex items-center gap-2 text-sm opacity-60">
              <MapPin className="size-4" />
              {challenge.location_name}
            </div>
          </div>

          {/* Skills Needed */}
          {challenge.skills_needed && challenge.skills_needed.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 opacity-80">Skills Needed</h3>
              <div className="flex flex-wrap gap-2">
                {challenge.skills_needed.map((skill, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1.5 rounded-full text-xs bg-[color:var(--muted)]/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source & Date */}
          <div className="pt-4 border-t border-divider">
            <div className="flex items-center justify-between text-xs opacity-50">
              <span>{challenge.source_title || 'News Source'}</span>
              <span>{new Date(challenge.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Editable Profile Detail Component
function EditableProfileDetail({ profile, onBack }: { profile: ProfileWithLocation; onBack: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Form state
  const [first, setFirst] = useState(profile.name.split(' ')[0] || '');
  const [last, setLast] = useState(profile.name.split(' ').slice(1).join(' ') || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [skills, setSkills] = useState(profile.skills?.join(', ') || '');
  const [tags, setTags] = useState(profile.tags?.join(', ') || '');
  const [email, setEmail] = useState(profile.email || '');
  const [links, setLinks] = useState<string[]>(profile.links || []);
  const [fame, setFame] = useState(profile.fame || '');
  const [workStyle, setWorkStyle] = useState(profile.workStyle || '');
  const [helpNeeded, setHelpNeeded] = useState(profile.helpNeeded || '');
  const [aim, setAim] = useState(profile.aim?.[0]?.title || '');
  const [newLink, setNewLink] = useState('');
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;
      if (!user) return;
      
      const payload = {
        displayName: `${first} ${last}`.trim(),
        bio,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        tags: tags.split(',').map(s => s.trim()).filter(Boolean),
        email,
        links,
        fame,
        workStyle,
        helpNeeded,
        aim: aim ? [{ title: aim, summary: '' }] : [],
      };
      
      const { error } = await supabase
        .from("profiles")
        .update({ data: payload })
        .eq("user_id", user.id);
        
      if (error) throw error;
      
      // Update local storage
      localStorage.setItem("civicmatch.displayName", payload.displayName);
      localStorage.setItem("civicmatch.name", payload.displayName);
      window.dispatchEvent(new Event("civicmatch:profile-updated"));
      
      setIsEditing(false);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/";
  };
  
  const handleDeleteAccount = async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;
      if (!user) return;
      
      await supabase.from("profiles").delete().eq("user_id", user.id);
      
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sess.session?.access_token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete account');
      
      localStorage.clear();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete account");
    }
  };
  
  const addLink = () => {
    if (newLink && !links.includes(newLink)) {
      setLinks([...links, newLink]);
      setNewLink('');
    }
  };
  
  const removeLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with back button and edit toggle */}
      <div className="flex items-center justify-between p-4 border-b border-divider">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[color:var(--accent)] text-[color:var(--background)] text-xs font-medium"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
                Edit
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-divider text-xs"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg border border-divider text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[color:var(--accent)] text-[color:var(--background)] text-xs font-medium disabled:opacity-50"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Avatar and Name */}
        <div className="flex flex-col items-center text-center mb-6">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={profile.name}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[color:var(--muted)]/40 flex items-center justify-center mb-4">
              <UserRound className="size-10 opacity-60" />
            </div>
          )}
          
          {isEditing ? (
            <div className="w-full space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  placeholder="First name"
                  className="flex-1 px-3 py-2 rounded-lg border border-divider bg-transparent text-sm"
                />
                <input
                  type="text"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  placeholder="Last name"
                  className="flex-1 px-3 py-2 rounded-lg border border-divider bg-transparent text-sm"
                />
              </div>
            </div>
          ) : (
            <h2 className="text-xl font-semibold">{profile.name}</h2>
          )}
        </div>

        {/* Bio */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 opacity-80">About</h3>
          {isEditing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-divider bg-transparent text-sm resize-none"
              placeholder="Tell us about yourself..."
            />
          ) : (
            <p className="text-sm opacity-60 leading-relaxed">{profile.bio || "No bio added yet."}</p>
          )}
        </div>

        {/* Contact Info */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 opacity-80">Contact</h3>
          {isEditing ? (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full px-3 py-2 rounded-lg border border-divider bg-transparent text-sm"
            />
          ) : (
            profile.email && (
              <a href={`mailto:${profile.email}`} className="text-sm text-[color:var(--accent)] hover:underline">
                {profile.email}
              </a>
            )
          )}
        </div>

        {/* Links */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 opacity-80">Links</h3>
          {isEditing ? (
            <div className="space-y-2">
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex-1 text-sm truncate">{link}</span>
                  <button onClick={() => removeLink(idx)} className="text-red-500">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="Add a link..."
                  className="flex-1 px-3 py-2 rounded-lg border border-divider bg-transparent text-sm"
                />
                <button onClick={addLink} className="px-3 py-2 rounded-lg bg-[color:var(--accent)] text-[color:var(--background)] text-sm">
                  Add
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {profile.links && profile.links.length > 0 ? (
                profile.links.map((link, i) => (
                  <a key={i} href={link} target="_blank" rel="noopener" className="block text-sm text-[color:var(--accent)] hover:underline truncate">
                    {link}
                  </a>
                ))
              ) : (
                <p className="text-sm opacity-50">No links added</p>
              )}
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 opacity-80">Skills</h3>
          {isEditing ? (
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Comma-separated skills"
              className="w-full px-3 py-2 rounded-lg border border-divider bg-transparent text-sm"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.skills && profile.skills.length > 0 ? (
                profile.skills.map((skill, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--muted)]/20">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm opacity-50">No skills added</p>
              )}
            </div>
          )}
        </div>

        {/* Interests */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 opacity-80">Interests</h3>
          {isEditing ? (
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated interests"
              className="w-full px-3 py-2 rounded-lg border border-divider bg-transparent text-sm"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.tags && profile.tags.length > 0 ? (
                profile.tags.map((tag, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--accent)]/10 text-[color:var(--accent)]">
                    {tag}
                  </span>
                ))
              ) : (
                <p className="text-sm opacity-50">No interests added</p>
              )}
            </div>
          )}
        </div>

        {/* Work Style */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 opacity-80">Work Style</h3>
          {isEditing ? (
            <textarea
              value={workStyle}
              onChange={(e) => setWorkStyle(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-divider bg-transparent text-sm resize-none"
              placeholder="How do you prefer to work?"
            />
          ) : (
            <p className="text-sm opacity-60">{profile.workStyle || "Not specified"}</p>
          )}
        </div>

        {/* Help Needed */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 opacity-80">Looking For Help With</h3>
          {isEditing ? (
            <textarea
              value={helpNeeded}
              onChange={(e) => setHelpNeeded(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-divider bg-transparent text-sm resize-none"
              placeholder="What kind of help are you looking for?"
            />
          ) : (
            <p className="text-sm opacity-60">{profile.helpNeeded || "Not specified"}</p>
          )}
        </div>

        {/* Goals/Aim */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 opacity-80">Goals</h3>
          {isEditing ? (
            <input
              type="text"
              value={aim}
              onChange={(e) => setAim(e.target.value)}
              placeholder="Your main goal or aim"
              className="w-full px-3 py-2 rounded-lg border border-divider bg-transparent text-sm"
            />
          ) : (
            <p className="text-sm opacity-60">{profile.aim?.[0]?.title || "Not specified"}</p>
          )}
        </div>

        {/* Recognition */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 opacity-80">Recognition</h3>
          {isEditing ? (
            <textarea
              value={fame}
              onChange={(e) => setFame(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-divider bg-transparent text-sm resize-none"
              placeholder="Any recognition or achievements?"
            />
          ) : (
            <p className="text-sm opacity-60">{profile.fame || "Not specified"}</p>
          )}
        </div>

        {/* Account Settings */}
        <div className="mt-8 pt-6 border-t border-divider">
          <h3 className="text-sm font-medium mb-4 opacity-80">Account</h3>
          <div className="space-y-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-divider text-sm hover:bg-[color:var(--muted)]/10 transition-colors"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Change Password
            </button>
            
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/30 text-red-500 text-sm hover:bg-red-500/10 transition-colors"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[color:var(--background)] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Delete Account?</h3>
            <p className="text-sm opacity-70 mb-4">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-divider text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

// Change Password Modal Component
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      alert('Password updated successfully');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[color:var(--background)] rounded-2xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-semibold mb-4">Change Password</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full px-3 py-2 rounded-lg border border-divider bg-transparent text-sm"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full px-3 py-2 rounded-lg border border-divider bg-transparent text-sm"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-divider text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-[color:var(--accent)] text-[color:var(--background)] text-sm disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Import helper functions
import { getCategoryInfo, getSeverityColor, getSeverityLabel } from "@/types/challenge";
import { ExternalLink } from "lucide-react";