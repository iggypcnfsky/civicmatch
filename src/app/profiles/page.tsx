"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, LogOut, UserRound, Briefcase, Lightbulb, Wrench, Link as LinkIcon, Heart, Sparkles, MapPin, Compass, Send, XCircle } from "lucide-react";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase/client";

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
};

export default function ProfilesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [message, setMessage] = useState("Hey, I’d like to connect!");
  const [profile, setProfile] = useState<ViewProfile | null>(null);

  useEffect(() => { setIsAuthenticated(localStorage.getItem("civicmatch.authenticated") === "1"); }, []);

  useEffect(() => {
    (async () => {
      if (!isAuthenticated) return;
      // Count rows first
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      if (!count || count <= 0) return;
      const randomOffset = Math.floor(Math.random() * count);
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, data")
        .range(randomOffset, randomOffset);
      if (error || !data || data.length === 0) return;
      const row = data[0] as any;
      const d = (row.data || {}) as any;

      const name = d.displayName || row.username || "Member";
      const location = typeof d.location === "string"
        ? d.location
        : d.location?.city && d.location?.country
          ? `${d.location.city}, ${d.location.country}`
          : "";
      const tags = Array.isArray(d.tags)
        ? d.tags
        : typeof d.tags === "string"
          ? d.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : [];
      const bio = d.bio || "";
      const links = Array.isArray(d.links)
        ? d.links
        : d.links && typeof d.links === "object"
          ? Object.values(d.links).filter((v: any) => typeof v === "string") as string[]
          : [];
      const skills = Array.isArray(d.skills)
        ? d.skills
        : typeof d.skills === "string"
          ? d.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
      const fame = d.fame || "";
      const aim: AimItem[] = Array.isArray(d.aim) ? d.aim : [];
      const game = d.game || "";
      const portfolio: string[] = Array.isArray(d.portfolio) ? d.portfolio : [];

      const avatarUrl = typeof d.avatarUrl === 'string' ? d.avatarUrl : undefined;
      setProfile({ name, location, tags, bio, links, skills, fame, aim, game, portfolio, avatarUrl });
    })();
  }, [isAuthenticated]);

  if (isAuthenticated === false || isAuthenticated === null) {
    return null;
  }

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8">
      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_420px] items-start">
        {/* Left: profile sections */}
        <section className="space-y-4">
          {/* NAME: image (full) + basic info */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Image full-bleed panel */}
            <div className="card p-0 overflow-hidden md:col-span-1 relative">
              <div className="relative aspect-[2/3] md:max-h-[360px] bg-[color:var(--muted)]/40">
                {profile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt={profile.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : null}
                <div className="absolute bottom-3 left-3 text-lg md:text-xl font-semibold px-2.5 py-1.5 rounded bg-[color:var(--background)]/85 border border-divider">{profile?.name ?? ""}</div>
              </div>
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
                {(profile?.links ?? []).slice(0,2).map((l, i) => (
                  <div key={i} className="flex items-center gap-2"><LinkIcon className="size-4 opacity-70" /> {l}</div>
                ))}
              </div>
            </div>
          </div>

          {/* SAME / FAME / AIM / GAME / Custom portfolio */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* SAME */}
            <section className="card space-y-3">
              <header className="flex items-center gap-2"><Wrench className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">SAME — Skills & What I Do</h2></header>
              <div className="flex flex-wrap gap-2 text-sm">
                {(profile?.skills ?? []).map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full border border-divider">{s}</span>
                ))}
              </div>
            </section>

            {/* FAME */}
            <section className="card space-y-3">
              <header className="flex items-center gap-2"><Heart className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">FAME — What I’m Known For</h2></header>
              <p className="text-sm">{profile?.fame || ""}</p>
            </section>

            {/* AIM */}
            <section className="card space-y-3">
              <header className="flex items-center gap-2"><Lightbulb className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">AIM — What I’m Focused On</h2></header>
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
            <section className="card space-y-3">
              <header className="flex items-center gap-2"><Sparkles className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">GAME — Long‑term Strategy</h2></header>
              <p className="text-sm">{profile?.game || ""}</p>
            </section>

            {/* Custom portfolio */}
            <section className="card space-y-3 sm:col-span-2 lg:col-span-3">
              <header className="flex items-center gap-2"><Briefcase className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Portfolio</h2></header>
              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: Math.max(3, (profile?.portfolio?.length ?? 0)) }).map((_, i) => (
                  <div key={i} className="rounded-lg border aspect-[4/3] bg-[color:var(--muted)]/40" />
                ))}
              </div>
            </section>
          </div>
        </section>

        {/* Right: sticky composer */}
        <aside className="hidden lg:block sticky top-20 h-[calc((100dvh-5rem)/2)]">
          <div className="card space-y-3 rounded-2xl h-full flex flex-col">
            <div className="font-semibold">Invite to connect</div>
            <textarea className="w-full flex-1 min-h-[160px] rounded-2xl border bg-transparent p-3 text-sm resize-none" value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="mt-auto flex items-center gap-2">
              <button className="btn btn-muted rounded-full h-12 px-6" onClick={() => alert('Profile skipped')}>
                <XCircle className="mr-2 size-4" /> Skip profile
              </button>
              <button className="btn btn-primary rounded-full h-12 px-6 ml-auto" onClick={() => alert('Invite sent')}>
                <Send className="mr-2 size-4" /> Invite to connect
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile composer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-[color:var(--background)]/95 backdrop-blur border-t">
        <textarea className="w-full rounded-lg border bg-transparent p-3 text-sm" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button className="btn btn-muted rounded-full h-12 px-6" onClick={() => alert('Profile skipped')}>
            <XCircle className="mr-2 size-4" /> Skip profile
          </button>
          <button className="btn btn-primary rounded-full h-12 px-6" onClick={() => alert('Invite sent')}>
            <Send className="mr-2 size-4" /> Invite
          </button>
        </div>
      </div>
    </div>
  );
}


