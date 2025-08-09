"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, LogOut, UserRound, Briefcase, Lightbulb, Wrench, Link as LinkIcon, Heart, Sparkles, MapPin, Compass, Send, XCircle } from "lucide-react";
import Logo from "@/components/Logo";

export default function ProfilesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [message, setMessage] = useState("Hey, I’d like to connect!");
  useEffect(() => { setIsAuthenticated(localStorage.getItem("civicmatch.authenticated") === "1"); }, []);

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
                <div className="absolute bottom-3 left-3 text-lg md:text-xl font-semibold px-2.5 py-1.5 rounded bg-[color:var(--background)]/85 border border-divider">Nadia A.</div>
              </div>
            </div>
            {/* Basic info */}
            <div className="card p-4 md:col-span-2 space-y-3">
              <div className="text-sm opacity-80">Bucharest, Romania • EET (UTC+2)</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {["Designer", "Civic Tech", "Open Data"].map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full border border-divider">{t}</span>
                ))}
              </div>
              <p className="text-sm leading-relaxed opacity-90">
                I’m a civic‑minded product designer focused on making public information legible
                and useful. Over the last few years I’ve worked with NGOs and city teams to
                redesign budgeting tools, benefits finders, and internal dashboards. I like
                rapid prototyping, evidence‑based design, and collaborating closely with policy,
                engineering, and community stakeholders. I’m most energized by projects that
                increase transparency and build long‑term trust between institutions and people.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2"><LinkIcon className="size-4 opacity-70" /> nadia.design</div>
                <div className="flex items-center gap-2"><LinkIcon className="size-4 opacity-70" /> linkedin.com/in/nadia</div>
              </div>
            </div>
          </div>

          {/* SAME / FAME / AIM / GAME / Custom portfolio */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* SAME */}
            <section className="card space-y-3">
              <header className="flex items-center gap-2"><Wrench className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">SAME — Skills & What I Do</h2></header>
              <p className="text-sm">Senior product designer focusing on data‑heavy workflows and service design for public institutions.</p>
              <div className="flex flex-wrap gap-2 text-sm">
                {["UX", "UI", "Design Systems", "Prototyping", "Accessibility"].map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full border border-divider">{s}</span>
                ))}
              </div>
            </section>

            {/* FAME */}
            <section className="card space-y-3">
              <header className="flex items-center gap-2"><Heart className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">FAME — What I’m Known For</h2></header>
              <p className="text-sm">Led the redesign of Bucharest’s open budget portal used by 200k citizens; featured by OpenGov Europe.</p>
            </section>

            {/* AIM */}
            <section className="card space-y-3">
              <header className="flex items-center gap-2"><Lightbulb className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">AIM — What I’m Focused On</h2></header>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="font-medium text-sm">Open Budget Explorer</div>
                  <div className="text-xs opacity-80">City widgets to compare spending, invite feedback.</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="font-medium text-sm">Service Finder</div>
                  <div className="text-xs opacity-80">Eligibility matching for social benefits and services.</div>
                </div>
              </div>
            </section>

            {/* GAME */}
            <section className="card space-y-3">
              <header className="flex items-center gap-2"><Sparkles className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">GAME — Long‑term Strategy</h2></header>
              <p className="text-sm">Build a lightweight civic design toolkit adopted by municipalities across Eastern Europe; mentor civic product teams.</p>
            </section>

            {/* Custom portfolio */}
            <section className="card space-y-3 sm:col-span-2 lg:col-span-3">
              <header className="flex items-center gap-2"><Briefcase className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Portfolio</h2></header>
              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
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


