"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Lightbulb, Wrench, Link as LinkIcon, Heart, Sparkles, Star, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useParams } from "next/navigation";

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
};

function ProfilePageInner() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated" ? true : status === "unauthenticated" ? false : null;
  const [profile, setProfile] = useState<ViewProfile | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const [animateIn, setAnimateIn] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const params = useParams();
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
      const o = v as { city?: unknown; country?: unknown };
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

  // Load the specific profile
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
        setProfile({ name, location, tags, bio, links, skills, fame, aim, game, portfolio, avatarUrl, workStyle, helpNeeded });
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
  }, [isAuthenticated, userId, locationLabel]);

  if (isAuthenticated === false || isAuthenticated === null) {
    return null;
  }

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8 pb-52 lg:pb-0">
      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_420px] items-start">
        {/* Left: profile sections */}
        <section className="space-y-4">
          {/* Profile Pill + Basic info */}
          <div className="grid gap-4">
            {/* Profile Pill */}
            <div className={`card p-4 transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '0ms' }}>
              <div className="flex items-center gap-3">
                <span className="relative inline-flex">
                  {profile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt={profile.name} className="h-12 w-12 rounded-full object-cover aspect-square flex-shrink-0" />
                  ) : (
                    <span className="h-12 w-12 rounded-full bg-[color:var(--muted)]/40 inline-flex items-center justify-center aspect-square flex-shrink-0">
                      <UserRound className="size-5 opacity-70" />
                    </span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-semibold truncate">{profile?.name ?? ""}</h1>
                  {profile?.location && (
                    <div className="text-sm opacity-80">{profile.location}</div>
                  )}
                </div>
                {targetUserId && (
                  <button
                    className={`h-9 w-9 rounded-full border flex items-center justify-center transition-colors ${isFavorite ? 'bg-[color:var(--accent)] text-[color:var(--background)] border-transparent' : 'bg-[color:var(--background)]/80 border-divider'}`}
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
                    <Star className="size-4" />
                  </button>
                )}
              </div>
              
              {/* Tags */}
              {(profile?.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs mt-3">
                  {profile?.tags.map((t) => (
                    <span key={t} className="px-3 py-1 rounded-full border border-divider">{t}</span>
                  ))}
                </div>
              )}
              
              {/* Bio and Links */}
              <div className="grid sm:grid-cols-2 gap-4 items-start mt-4">
                <div className="text-sm leading-relaxed opacity-90">
                  {profile?.bio ? renderWithLinks(profile.bio) : (
                    <span className="italic opacity-60">No information from the founder</span>
                  )}
                </div>
                {(profile?.links ?? []).length > 0 && (
                  <ul className="space-y-2 text-sm">
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
                            className="hover:underline break-words truncate"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={l}
                          >
                            {l}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Profile sections - only show if they have data */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {(() => {
              const sections = [];
              let delayIndex = 0;

              // Skills & What I Do - only show if skills exist
              if ((profile?.skills ?? []).length > 0) {
                sections.push(
                  <section key="skills" className={`card space-y-3 h-full flex flex-col min-h-[200px] transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${delayIndex * 180}ms` }}>
                    <header className="flex items-center gap-2"><Wrench className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Skills & What I Do</h2></header>
                    <p className="text-sm">{profile?.skills.join(", ")}</p>
                  </section>
                );
                delayIndex++;
              }

              // What I'm Known For - only show if fame exists
              if (profile?.fame && profile.fame.trim()) {
                sections.push(
                  <section key="fame" className={`card space-y-3 h-full flex flex-col transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${delayIndex * 180}ms` }}>
                    <header className="flex items-center gap-2"><Heart className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">What I&apos;m Known For</h2></header>
                    <p className="text-sm">{renderWithLinks(profile.fame)}</p>
                  </section>
                );
                delayIndex++;
              }

              // What I'm Focused On - only show if aim exists
              if (profile?.aim && profile.aim[0]?.title && profile.aim[0].title.trim()) {
                sections.push(
                  <section key="aim" className={`card space-y-3 h-full flex flex-col transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${delayIndex * 180}ms` }}>
                    <header className="flex items-center gap-2"><Lightbulb className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">What I&apos;m Focused On</h2></header>
                    <p className="text-sm">{renderWithLinks(profile.aim[0].title)}</p>
                  </section>
                );
                delayIndex++;
              }

              // Long-term Strategy - only show if game exists
              if (profile?.game && profile.game.trim()) {
                sections.push(
                  <section key="game" className={`card space-y-3 h-full flex flex-col transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${delayIndex * 180}ms` }}>
                    <header className="flex items-center gap-2"><Sparkles className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Long‑term Strategy</h2></header>
                    <p className="text-sm">{renderWithLinks(profile.game)}</p>
                  </section>
                );
                delayIndex++;
              }

              // Work Style - only show if workStyle exists
              if (profile?.workStyle && profile.workStyle.trim()) {
                sections.push(
                  <section key="workStyle" className={`card space-y-3 h-full flex flex-col transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${delayIndex * 180}ms` }}>
                    <header className="flex items-center gap-2"><Wrench className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Work Style</h2></header>
                    <p className="text-sm">{renderWithLinks(profile.workStyle)}</p>
                  </section>
                );
                delayIndex++;
              }

              // What do I need help with - only show if helpNeeded exists
              if (profile?.helpNeeded && profile.helpNeeded.trim()) {
                sections.push(
                  <section key="helpNeeded" className={`card space-y-3 h-full flex flex-col transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${delayIndex * 180}ms` }}>
                    <header className="flex items-center gap-2"><Lightbulb className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">What do I need help with</h2></header>
                    <p className="text-sm">{renderWithLinks(profile.helpNeeded)}</p>
                  </section>
                );
                delayIndex++;
              }

              return sections;
            })()}
          </div>
        </section>

        {/* Right: empty space where composer would be - matches the grid layout */}
        <aside className="hidden lg:block sticky top-20 h-[calc((100dvh-5rem)/2)]">
          <div className="card space-y-3 rounded-2xl h-full flex flex-col">
            <div className="font-semibold">Profile View</div>
            <div className="text-sm opacity-60 flex-1 flex items-center justify-center">
              This profile was accessed directly from an email link.
            </div>
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