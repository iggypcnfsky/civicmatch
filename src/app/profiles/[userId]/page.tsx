"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { 
  Lightbulb, 
  Wrench, 
  Link as LinkIcon, 
  Heart, 
  Sparkles, 
  Star, 
  UserRound,
  MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useParams, useRouter } from "next/navigation";
import { ProfileQualityService } from "@/lib/services/ProfileQualityService";
import { ActivityTimeline, UpcomingEvents } from "@/components/profile";

type AimItem = { title: string; summary: string };

type ViewProfile = {
  name: string;
  location: string;
  tags: string[];
  bio: string;
  links: string[];
  skills: string[];
  fame: string;
  aim: AimItem[];
  game: string;
  portfolio: string[];
  avatarUrl?: string;
  workStyle?: string;
  helpNeeded?: string;
  xp?: number;
};

function ProfilePageInner() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated" ? true : status === "unauthenticated" ? false : null;
  const [profile, setProfile] = useState<ViewProfile | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const [animateIn, setAnimateIn] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  // Safe parsers for JSONB payloads
  const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
  const toStringArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
    if (typeof v === "string")
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return [];
  };
  const toLinksArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
    if (v && typeof v === "object") return Object.values(v).filter((x): x is string => typeof x === "string");
    return [];
  };
  const locationLabel = useCallback((v: unknown): string => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object") {
      const o = v as { city?: unknown; country?: unknown; displayName?: unknown };
      if (asString(o.displayName)) return asString(o.displayName)!;
      const city = asString(o.city);
      const country = asString(o.country);
      if (city && country) return `${city}, ${country}`;
    }
    return "";
  }, []);

  const normalizeUrl = (url: string): string => {
    if (!url) return "";
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const renderWithLinks = (text: string | undefined) => {
    if (!text) return null;
    const parts = text.split(/(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi);
    return (
      <>
        {parts.map((part, i) => {
          if (/^(https?:\/\/|www\.)/i.test(part)) {
            const href = normalizeUrl(part);
            return (
              <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-[color:var(--accent)] hover:underline break-words">
                {part}
              </a>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  // Load the specific profile - only allow quality profiles
  useEffect(() => {
    (async () => {
      if (!isAuthenticated || !userId) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, data")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && data) {
        const row = data as { user_id: string; username: string; data: Record<string, unknown> };
        
        // Check if this profile meets quality standards
        const isQualityProfile = ProfileQualityService.isQualityProfile(row.data);
        
        if (!isQualityProfile) {
          // If the profile is incomplete, redirect to profile browser
          console.log('Individual profile page accessed for incomplete profile, redirecting');
          router.replace('/profiles');
          return;
        }
        
        setTargetUserId(row.user_id);
        const d = (row.data || {}) as Record<string, unknown>;
        const name = asString(d.displayName) || row.username || "Member";
        const location = locationLabel(d.location);
        const tags = toStringArray(d.tags);
        const bio = asString(d.bio) || "";
        const links = toLinksArray(d.links);
        const skills = toStringArray(d.skills);
        const fame = asString(d.fame) || "";
        const aim: AimItem[] = Array.isArray(d.aim) ? (d.aim as AimItem[]) : [];
        const game = asString(d.game) || "";
        const portfolio: string[] = Array.isArray(d.portfolio)
          ? (d.portfolio as unknown[]).filter((x): x is string => typeof x === "string")
          : [];
        const avatarUrl = asString(d.avatarUrl);
        const workStyle = asString((d as Record<string, unknown>).workStyle) || asString((d as Record<string, unknown>).work_style);
        const helpNeeded = asString((d as Record<string, unknown>).helpNeeded) || asString((d as Record<string, unknown>).help_needed);
        const xp = typeof d.xp === 'number' ? d.xp : 0;
        setProfile({ name, location, tags, bio, links, skills, fame, aim, game, portfolio, avatarUrl, workStyle, helpNeeded, xp });
        try {
          const raw = localStorage.getItem("civicmatch.favorites");
          const arr: string[] = raw ? JSON.parse(raw) : [];
          setIsFavorite(arr.includes(row.user_id));
        } catch { setIsFavorite(false); }
        // Animate entire panel together as soon as profile is ready
        setAnimateIn(false);
        requestAnimationFrame(() => setAnimateIn(true));
      }
    })();
  }, [isAuthenticated, userId, locationLabel, router]);

  if (isAuthenticated === false || isAuthenticated === null) {
    return null;
  }

  return (
    <div className="min-h-dvh page-container pb-28 lg:pb-8">
      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
        
        {/* LEFT COLUMN - Profile Content */}
        <section className="space-y-6">
          {/* Profile Header Card */}
          <div className={`card transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {profile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={profile.avatarUrl} 
                    alt={profile.name} 
                    className="h-20 w-20 rounded-full object-cover ring-4 ring-[color:var(--background)] shadow-lg" 
                  />
                ) : (
                  <span className="h-20 w-20 rounded-full bg-gradient-to-br from-[color:var(--muted)] to-[color:var(--muted)]/60 inline-flex items-center justify-center ring-4 ring-[color:var(--background)] shadow-lg">
                    <UserRound className="size-8 opacity-70" />
                  </span>
                )}
              </div>

              {/* Name & Location */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-bold truncate">{profile?.name ?? ""}</h1>
                    {profile?.location && (
                      <div className="flex items-center gap-1 text-sm text-[color:var(--muted-foreground)] mt-0.5">
                        <MapPin className="size-3.5" />
                        {profile.location}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {targetUserId && (
                      <button
                        className={`
                          h-9 w-9 rounded-full border flex items-center justify-center transition-all
                          ${isFavorite 
                            ? 'bg-[color:var(--accent)] text-[color:var(--background)] border-transparent scale-105' 
                            : 'bg-[color:var(--background)]/80 border-divider hover:border-[color:var(--accent)]/50'
                          }
                        `}
                        onClick={(e) => {
                          e.preventDefault();
                          if (!targetUserId) return;
                          try {
                            const raw = localStorage.getItem('civicmatch.favorites');
                            const arr: string[] = raw ? JSON.parse(raw) : [];
                            const set = new Set(arr);
                            if (set.has(targetUserId)) { set.delete(targetUserId); setIsFavorite(false); }
                            else { set.add(targetUserId); setIsFavorite(true); }
                            localStorage.setItem('civicmatch.favorites', JSON.stringify(Array.from(set)));
                          } catch {}
                        }}
                        aria-label={isFavorite ? 'Remove favorite' : 'Add to favorites'}
                      >
                        <Star className={`size-4 ${isFavorite ? 'fill-current' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {(profile?.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {profile?.tags.map((t) => (
                      <span 
                        key={t} 
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-[color:var(--muted)]/20 border border-divider"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Bio and Links */}
            <div className="grid sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-divider">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)] mb-2">About</h3>
                <div className="text-sm leading-relaxed">
                  {profile?.bio ? renderWithLinks(profile.bio) : (
                    <span className="italic text-[color:var(--muted-foreground)]">No bio provided</span>
                  )}
                </div>
              </div>
              
              {(profile?.links ?? []).length > 0 && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)] mb-2">Links</h3>
                  <ul className="space-y-2">
                    {profile?.links.map((l, i) => {
                      const href = normalizeUrl(l);
                      let fav: string | null = null;
                      try { const u = new URL(href); fav = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`; } catch {}
                      return (
                        <li key={i} className="flex items-center gap-2 min-w-0">
                          {fav ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={fav} alt="" className="size-4 rounded" />
                          ) : (
                            <LinkIcon className="size-4 opacity-70" />
                          )}
                          <a
                            className="text-sm hover:text-[color:var(--accent)] truncate transition-colors"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={l}
                          >
                            {l.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Profile sections - only show if they have data */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(() => {
              const sections = [];
              let delayIndex = 0;

              // Skills & What I Do - only show if skills exist
              if ((profile?.skills ?? []).length > 0) {
                sections.push(
                  <section 
                    key="skills" 
                    className={`card h-full flex flex-col transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} 
                    style={{ transitionDelay: `${delayIndex * 100}ms` }}
                  >
                    <header className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Wrench className="size-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h2 className="font-semibold text-sm">Skills & What I Do</h2>
                    </header>
                    <p className="text-sm text-[color:var(--muted-foreground)] flex-1">{profile?.skills.join(", ")}</p>
                  </section>
                );
                delayIndex++;
              }

              // What I'm Known For - only show if fame exists
              if (profile?.fame && profile.fame.trim()) {
                sections.push(
                  <section 
                    key="fame" 
                    className={`card h-full flex flex-col transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} 
                    style={{ transitionDelay: `${delayIndex * 100}ms` }}
                  >
                    <header className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                        <Heart className="size-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <h2 className="font-semibold text-sm">What I&apos;m Known For</h2>
                    </header>
                    <p className="text-sm text-[color:var(--muted-foreground)] flex-1">{renderWithLinks(profile.fame)}</p>
                  </section>
                );
                delayIndex++;
              }

              // What I'm Focused On - only show if aim exists
              if (profile?.aim && profile.aim[0]?.title && profile.aim[0].title.trim()) {
                sections.push(
                  <section 
                    key="aim" 
                    className={`card h-full flex flex-col transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} 
                    style={{ transitionDelay: `${delayIndex * 100}ms` }}
                  >
                    <header className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Lightbulb className="size-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h2 className="font-semibold text-sm">What I&apos;m Focused On</h2>
                    </header>
                    <p className="text-sm text-[color:var(--muted-foreground)] flex-1">{renderWithLinks(profile.aim[0].title)}</p>
                  </section>
                );
                delayIndex++;
              }

              // Long-term Strategy - only show if game exists
              if (profile?.game && profile.game.trim()) {
                sections.push(
                  <section 
                    key="game" 
                    className={`card h-full flex flex-col transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} 
                    style={{ transitionDelay: `${delayIndex * 100}ms` }}
                  >
                    <header className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Sparkles className="size-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h2 className="font-semibold text-sm">Long‑term Strategy</h2>
                    </header>
                    <p className="text-sm text-[color:var(--muted-foreground)] flex-1">{renderWithLinks(profile.game)}</p>
                  </section>
                );
                delayIndex++;
              }

              // Work Style - only show if workStyle exists
              if (profile?.workStyle && profile.workStyle.trim()) {
                sections.push(
                  <section 
                    key="workStyle" 
                    className={`card h-full flex flex-col transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} 
                    style={{ transitionDelay: `${delayIndex * 100}ms` }}
                  >
                    <header className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Wrench className="size-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h2 className="font-semibold text-sm">Work Style</h2>
                    </header>
                    <p className="text-sm text-[color:var(--muted-foreground)] flex-1">{renderWithLinks(profile.workStyle)}</p>
                  </section>
                );
                delayIndex++;
              }

              // What do I need help with - only show if helpNeeded exists
              if (profile?.helpNeeded && profile.helpNeeded.trim()) {
                sections.push(
                  <section 
                    key="helpNeeded" 
                    className={`card h-full flex flex-col transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} 
                    style={{ transitionDelay: `${delayIndex * 100}ms` }}
                  >
                    <header className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <Lightbulb className="size-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h2 className="font-semibold text-sm">What do I need help with</h2>
                    </header>
                    <p className="text-sm text-[color:var(--muted-foreground)] flex-1">{renderWithLinks(profile.helpNeeded)}</p>
                  </section>
                );
                delayIndex++;
              }

              return sections;
            })()}
          </div>
        </section>

        {/* RIGHT COLUMN - Sidebar */}
        <aside className={`lg:sticky lg:top-20 space-y-4 transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '200ms' }}>
          {/* Upcoming Events */}
          {targetUserId && (
            <div className="card">
              <div className="flex items-center justify-between border-b border-divider pb-3 mb-4">
                <h3 className="font-semibold">Upcoming Events</h3>
              </div>
              <UpcomingEvents userId={targetUserId} limit={3} />
            </div>
          )}
          
          {/* Contributions CV */}
          <div className="card">
            <div className="flex items-center justify-between border-b border-divider pb-3 mb-4">
              <h3 className="font-semibold">Contributions</h3>
              {profile?.xp !== undefined && profile.xp > 0 && (
                <span className="text-sm text-[color:var(--muted-foreground)]">
                  {profile.xp.toLocaleString()} XP
                </span>
              )}
            </div>
            
            {/* Activity Timeline (CV) */}
            {targetUserId && (
              <ActivityTimeline 
                userId={targetUserId} 
                limit={20}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageInner />
    </Suspense>
  );
}
