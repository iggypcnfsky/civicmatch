"use client";

import { Suspense, useEffect, useState } from "react";
import { Lightbulb, Wrench, Link as LinkIcon, Heart, Sparkles, Send, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";

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

function ProfilesPageInner() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated" ? true : status === "unauthenticated" ? false : null;
  const [message, setMessage] = useState("Hey, I’d like to connect!");
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [profile, setProfile] = useState<ViewProfile | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const params = useSearchParams();
  const router = useRouter();

  // auth is provided by context

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
  const locationLabel = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object") {
      const o = v as { city?: unknown; country?: unknown };
      const city = asString(o.city);
      const country = asString(o.country);
      if (city && country) return `${city}, ${country}`;
    }
    return "";
  };

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

  // Load invited (pending) connections for current user to avoid showing already-invited profiles
  useEffect(() => {
    (async () => {
      if (!isAuthenticated) return;
      const { data: u } = await supabase.auth.getUser();
      const me = u?.user?.id;
      setCurrentUserId(me || null);
      if (!me) return;
      const { data } = await supabase
        .from("connections")
        .select("addressee_id")
        .eq("requester_id", me)
        .eq("status", "pending");
      setInvitedIds(new Set<string>((data || []).map((r: { addressee_id: string }) => r.addressee_id)));
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    (async () => {
      if (!isAuthenticated) return;
      const id = params.get("user");
      // If a specific profile is requested, always show it (even if already invited)
      if (id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, username, data")
          .eq("user_id", id)
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
          return;
        }
      }
      // Fallback random (exclude invited and self)
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      if (!count || count <= 0) return;
      let attempt = 0;
      let chosen: { user_id: string; username: string; data: Record<string, unknown> } | null = null;
      while (attempt < 10 && !chosen) {
        const randomOffset = Math.floor(Math.random() * count);
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, username, data")
          .range(randomOffset, randomOffset);
        if (!error && data && data.length > 0) {
          const row = data[0] as { user_id: string; username: string; data: Record<string, unknown> };
          const isInvited = invitedIds.has(row.user_id);
          const isSelf = currentUserId && row.user_id === currentUserId;
          if (!isInvited && !isSelf) chosen = row;
        }
        attempt += 1;
      }
      if (!chosen) return;
      setTargetUserId(chosen.user_id);
      const d = (chosen.data || {}) as Record<string, unknown>;
      const name = asString(d.displayName) || chosen.username || "Member";
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
    })();
  }, [isAuthenticated, params, invitedIds, currentUserId]);

  if (isAuthenticated === false || isAuthenticated === null) {
    return null;
  }

  async function sendInvite() {
    if (!message.trim()) return;
    try {
      setIsSending(true);
      const { data: u } = await supabase.auth.getUser();
      const me = u?.user?.id ?? null;
      if (!me || !targetUserId) {
        alert("Please sign in to send invites.");
        return;
      }

      // Try to find an existing conversation between the two users
      const { data: existingConvo } = await supabase
        .from("conversations")
        .select("id")
        .contains("data", { participantIds: [me, targetUserId] })
        .maybeSingle();

      let conversationId: string | null = existingConvo?.id ?? null;

      // Create a conversation if none exists
      if (!conversationId) {
        const { data: created, error: createErr } = await supabase
          .from("conversations")
          .insert({ data: { participantIds: [me, targetUserId] } })
          .select("id")
          .single();
        if (createErr || !created?.id) {
          alert("Could not start a conversation.");
          return;
        }
        conversationId = created.id;
      }

      // Insert the invite message
      const { error: insertErr } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: me,
        data: { text: message, kind: "invite" },
      });
      if (insertErr) {
        alert("Failed to send invite.");
        return;
      }

      // Record a pending connection (idempotent by requester/addressee)
      await supabase
        .from("connections")
        .upsert(
          {
            requester_id: me,
            addressee_id: targetUserId,
            status: "pending",
            data: { source: "profiles", initialMessage: message },
          },
          { onConflict: "requester_id,addressee_id" }
        );
      // Update local invited set and load another profile (remove query param if present)
      setInvitedIds((prev) => {
        const next = new Set(prev);
        if (targetUserId) next.add(targetUserId);
        return next;
      });
      setMessage("Hey, I’d like to connect!");
      setProfile(null);
      setTargetUserId(null);
      // If viewing a specific user via ?user=, navigate to /profiles to trigger fallback selection
      router.replace("/profiles");
    } finally {
      setIsSending(false);
    }
  }

  function skipProfile() {
    setProfile(null);
    setTargetUserId(null);
    // Force a params change to retrigger the loader effect
    router.replace(`/profiles?refresh=${Date.now()}`);
  }

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8 pb-52 lg:pb-0">
      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_420px] items-start">
        {/* Left: profile sections */}
        <section className="space-y-4">
          {/* NAME: image (full) + basic info */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Image full-bleed panel */}
            <div className="card p-0 overflow-hidden md:col-span-1 relative h-[400px]">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt={profile.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-[color:var(--muted)]/40" />
              )}
              <div className="absolute bottom-3 left-3 text-lg md:text-xl font-semibold px-2.5 py-1.5 rounded bg-[color:var(--background)]/85 border border-divider">{profile?.name ?? ""}</div>
            </div>
            {/* Basic info */}
            <div className="card p-4 md:col-span-2 space-y-3">
              <div className="text-sm opacity-80">{profile?.location || ""}</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {(profile?.tags ?? []).map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full border border-divider">{t}</span>
                ))}
              </div>
              <p className="text-sm leading-relaxed opacity-90">
                {profile?.bio || ""}
              </p>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                {(profile?.links ?? []).slice(0, 2).map((l, i) => (
                  <a
                    key={i}
                    className="flex items-center gap-2 hover:underline break-words"
                    href={normalizeUrl(l)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LinkIcon className="size-4 opacity-70" /> {l}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* SAME / FAME / AIM / GAME / Custom portfolio */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {/* SAME */}
            <section className="card space-y-3 h-full flex flex-col min-h-[200px]">
              <header className="flex items-center gap-2"><Wrench className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Skills & What I Do</h2></header>
              <div className="flex flex-wrap gap-2 text-sm">
                {(profile?.skills ?? []).map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full border border-divider">{s}</span>
                ))}
              </div>
            </section>

            {/* FAME */}
            <section className="card space-y-3 h-full flex flex-col">
              <header className="flex items-center gap-2"><Heart className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">What I’m Known For</h2></header>
              <p className="text-sm">{renderWithLinks(profile?.fame) }</p>
            </section>

            {/* AIM */}
            <section className="card space-y-3 h-full flex flex-col">
              <header className="flex items-center gap-2"><Lightbulb className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">What I’m Focused On</h2></header>
              <div className="grid gap-3 sm:grid-cols-2">
                {(profile?.aim ?? []).slice(0,2).map((a, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="font-medium text-sm">{a.title}</div>
                    <div className="text-xs opacity-80">{a.summary}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* GAME */}
            <section className="card space-y-3 h-full flex flex-col">
              <header className="flex items-center gap-2"><Sparkles className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Long‑term Strategy</h2></header>
              <p className="text-sm">{renderWithLinks(profile?.game)}</p>
            </section>

            {/* Work Style */}
            <section className="card space-y-3 h-full flex flex-col">
              <header className="flex items-center gap-2"><Wrench className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Work Style</h2></header>
              <p className="text-sm">{renderWithLinks(profile?.workStyle)}</p>
            </section>

            {/* What do I need help with */}
            <section className="card space-y-3 h-full flex flex-col">
              <header className="flex items-center gap-2"><Lightbulb className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">What do I need help with</h2></header>
              <p className="text-sm">{renderWithLinks(profile?.helpNeeded)}</p>
            </section>
          </div>
        </section>

        {/* Right: sticky composer */}
        <aside className="hidden lg:block sticky top-20 h-[calc((100dvh-5rem)/2)]">
          <div className="card space-y-3 rounded-2xl h-full flex flex-col">
            <div className="font-semibold">Invite to connect</div>
            <textarea className="w-full flex-1 min-h-[160px] rounded-2xl border bg-transparent p-3 text-sm resize-none" value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="mt-auto flex items-center gap-2">
              <button
                className="h-10 md:px-4 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 gap-2 text-sm"
                onClick={skipProfile}
              >
                <XCircle className="size-4" />
                <span className="hidden md:inline">Skip profile</span>
              </button>
              <button
                className="h-10 md:px-4 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] gap-2 text-sm ml-auto"
                onClick={sendInvite}
                disabled={isSending}
              >
                <Send className="size-4" />
                <span className="hidden md:inline">Invite to connect</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile composer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-[color:var(--background)]/95 backdrop-blur border-t">
        <textarea className="w-full rounded-lg border bg-transparent p-3 text-sm" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            className="h-10 px-4 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 gap-2 text-sm"
            onClick={skipProfile}
          >
            <XCircle className="size-4" /> Skip profile
          </button>
          <button
            className="h-10 px-4 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] gap-2 text-sm"
            onClick={sendInvite}
            disabled={isSending}
          >
            <Send className="size-4" /> Invite
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilesPage() {
  return (
    <Suspense fallback={null}>
      <ProfilesPageInner />
    </Suspense>
  );
}


