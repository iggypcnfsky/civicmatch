"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X, Star, Mail } from "lucide-react";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase/client";

type Profile = { id: string; name: string; role: string; bio: string; avatarUrl?: string };

const PAGE_SIZE = 24;

export default function ExplorePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [items, setItems] = useState<Profile[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
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

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem("civicmatch.authenticated") === "1");
  }, []);
  // Load list of profiles the current user has already invited (pending connections)
  useEffect(() => {
    (async () => {
      if (!isAuthenticated) return;
      const { data: u } = await supabase.auth.getUser();
      const me = u?.user?.id;
      if (!me) return;
      const { data } = await supabase
        .from("connections")
        .select("addressee_id")
        .eq("requester_id", me)
        .eq("status", "pending");
      const ids = new Set<string>((data || []).map((r: { addressee_id: string }) => r.addressee_id));
      setInvitedIds(ids);
    })();
  }, [isAuthenticated]);


  type ProfileRow = { user_id: string; username: string | null; data: unknown; created_at: string };

  const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  function mapRowToProfile(row: ProfileRow): Profile {
    const d = (row.data ?? {}) as Record<string, unknown>;
    const name = asString(d["displayName"]) || row.username || "Member";
    const role = (asStringArray(d["skills"])?.[0]) || "Member";
    const bio = asString(d["bio"]) || "";
    const avatarUrl = asString(d["avatarUrl"]);
    return { id: row.user_id, name, role, bio, avatarUrl };
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
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
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

  async function ensureProfileForCurrentUser() {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return;
    const username = user.email ?? "";
    if (!username) return;
    // Insert only if missing to avoid overwriting existing profile data
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      await supabase
        .from("profiles")
        .insert({ user_id: user.id, username, data: { email: username } });
    }
  }

  async function handleLogin() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await ensureProfileForCurrentUser();
      localStorage.setItem("civicmatch.authenticated", "1");
      try { window.dispatchEvent(new Event("civicmatch:auth-changed")); } catch {}
      setIsAuthenticated(true);
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
      await ensureProfileForCurrentUser();
      localStorage.setItem("civicmatch.authenticated", "1");
      try { window.dispatchEvent(new Event("civicmatch:auth-changed")); } catch {}
      setIsAuthenticated(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign up failed";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  }

  if (isAuthenticated === false || isAuthenticated === null) {
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
              <h1 className="text-xl font-semibold text-center">Welcome</h1>
              <p className="text-sm opacity-80 text-center">Sign in or create an account to continue.</p>
              <div className="space-y-3">
                <label className="text-xs opacity-70">Email</label>
                <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm" />
                <label className="text-xs opacity-70">Password</label>
                <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" placeholder="••••••••" className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm" />
              </div>
              {authError && <div className="text-xs text-red-500">{authError}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <button
                  className="btn btn-primary w-full disabled:opacity-60"
                  disabled={authLoading}
                  onClick={handleLogin}
                >
                  {authLoading ? "Loading..." : "Log in"}
                </button>
                <button
                  className="btn btn-muted w-full disabled:opacity-60"
                  disabled={authLoading}
                  onClick={handleSignup}
                >
                  {authLoading ? "Loading..." : "Create account"}
                </button>
              </div>
              <div className="text-xs opacity-70 text-center">
                By continuing you agree to our community guidelines.
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8">

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        {/* Masonry-like grid using CSS columns */}
        <section className="min-w-0">
          <div className="columns-1 sm:columns-2 xl:columns-3 gap-6">
            {items.map((p) => (
              <article
                key={p.id}
                className={`mb-6 break-inside-avoid rounded-2xl border border-divider overflow-hidden shadow-sm ${invitedIds.has(p.id) ? "opacity-50" : ""}`}
              >
                <Link href={`/profiles?user=${encodeURIComponent(p.id)}`} className="block focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/40 rounded-2xl">
                  <div className="relative aspect-[4/3] bg-[color:var(--muted)]/40">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatarUrl} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : null}
                    <span className="absolute top-3 left-3 rounded-full bg-[color:var(--background)]/90 border border-divider px-2 py-1 text-xs">
                      {p.role}
                    </span>
                    {invitedIds.has(p.id) && (
                      <span className="absolute top-3 left-3 translate-y-8 rounded-full bg-[color:var(--background)]/90 border border-divider px-2 py-1 text-[10px] inline-flex items-center gap-1">
                        <Mail className="size-3" />
                        Invited
                      </span>
                    )}
                    <button
                      className={`absolute top-3 right-3 h-8 w-8 rounded-full border flex items-center justify-center ${favoriteIds.has(p.id) ? "bg-[color:var(--accent)] text-[color:var(--background)] border-transparent" : "bg-[color:var(--background)]/80 border-divider"}`}
                      aria-label="Favorite"
                      onClick={(e)=>{
                        e.preventDefault();
                        setFavoriteIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                          localStorage.setItem("civicmatch.favorites", JSON.stringify(Array.from(next)));
                          return next;
                        });
                      }}
                    >
                      <Star className="size-4" />
                    </button>
                  </div>
                  <div className="bg-[color:var(--background)] text-sm p-3 space-y-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="opacity-80 line-clamp-2">{p.bio}</div>
                  </div>
                </Link>
              </article>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-[color:var(--accent)]" /><h3 className="font-semibold">Filters</h3></div>
              <button className="text-xs underline opacity-80" onClick={() => alert('Reset filters')}>Reset</button>
            </div>
            <div className="text-xs opacity-80">Tune who you want to meet. These settings affect Explore.</div>
            <button className="btn btn-muted w-full">Role: Any</button>
            <button className="btn btn-muted w-full">Distance: Anywhere</button>
            <button className="btn btn-muted w-full">Skills: Any</button>
            <button
              className={`btn w-full ${favoritesOnly ? 'btn-primary' : 'btn-muted'}`}
              onClick={() => {
                const next = !favoritesOnly;
                setFavoritesOnly(next);
                // Reset and refetch with new filter
                setItems([]); setOffset(0); setHasMore(true);
                fetchNextPage();
              }}
            >
              {favoritesOnly ? 'Showing favorites' : 'Only favorites'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-muted w-full">Experience: Any</button>
              <button className="btn btn-muted w-full">Availability: Any</button>
            </div>
            <button className="btn btn-muted w-full">Collaboration: Any</button>
            <div className="pt-1 text-xs opacity-70">Changes auto‑save. Use Save to persist across devices.</div>
            <button className="btn btn-primary w-full">Save Filters</button>
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
            <div className="text-xs opacity-80">Tune who you want to meet.</div>
            <button className="btn btn-muted w-full">Role: Any</button>
            <button className="btn btn-muted w-full">Distance: Anywhere</button>
            <button className="btn btn-muted w-full">Skills: Any</button>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-muted w-full">Experience: Any</button>
              <button className="btn btn-muted w-full">Availability: Any</button>
            </div>
            <button className="btn btn-muted w-full">Collaboration: Any</button>
            <button className="btn btn-primary w-full" onClick={() => setFiltersOpen(false)}>Save Filters</button>
          </div>
        </div>
      )}
    </div>
  );
}


