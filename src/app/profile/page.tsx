"use client";

import { useEffect, useState } from "react";
import { UserRound, Camera, MapPin, Save, Plus, Trash2, Link as LinkIcon, Wrench, Heart, Lightbulb, Sparkles, LogOut } from "lucide-react";

type AimItem = { title: string; summary: string };
type CustomSection = { id: string; title: string; content: string };

export default function ProfilePage() {
  const [first, setFirst] = useState("Nadia");
  const [last, setLast] = useState("A.");
  const [email, setEmail] = useState("nadia@civic.design");
  const [location, setLocation] = useState("Bucharest, Romania");
  const [tags, setTags] = useState("Designer, Civic Tech, Open Data");
  const [bio, setBio] = useState(
    "I’m a civic‑minded product designer focused on making public information legible and useful."
  );
  const [links, setLinks] = useState<string[]>(["nadia.design", "linkedin.com/in/nadia"]);
  const [skills, setSkills] = useState("UX, UI, Design Systems, Prototyping, Accessibility");
  const [fame, setFame] = useState(
    "Led redesign of Bucharest’s open budget portal used by 200k citizens; featured by OpenGov Europe."
  );
  const [aim, setAim] = useState<AimItem[]>([
    { title: "Open Budget Explorer", summary: "City widgets to compare spending, invite feedback." },
    { title: "Service Finder", summary: "Eligibility matching for social benefits and services." },
  ]);
  const [game, setGame] = useState(
    "Build a lightweight civic design toolkit adopted by municipalities; mentor civic product teams."
  );
  const [portfolio, setPortfolio] = useState<string[]>(["https://example.com/work-1", "https://example.com/work-2"]);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("civicmatch.profileDraft");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setFirst(data.first ?? first);
        setLast(data.last ?? last);
        setEmail(data.email ?? email);
        setLocation(data.location ?? location);
        setTags(data.tags ?? tags);
        setBio(data.bio ?? bio);
        setLinks(data.links ?? links);
        setSkills(data.skills ?? skills);
        setFame(data.fame ?? fame);
        setAim(data.aim ?? aim);
        setGame(data.game ?? game);
        setPortfolio(data.portfolio ?? portfolio);
        setCustomSections(data.customSections ?? customSections);
      } catch {}
    }
  }, []);

  const saveAll = () => {
    const payload = {
      first,
      last,
      email,
      location,
      tags,
      bio,
      links,
      skills,
      fame,
      aim,
      game,
      portfolio,
      customSections,
    };
    localStorage.setItem("civicmatch.profileDraft", JSON.stringify(payload));
    const display = `${first} ${last}`.trim();
    localStorage.setItem("civicmatch.name", display);
    localStorage.setItem("civicmatch.displayName", display);
    alert("Profile saved");
  };

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8 space-y-6 pb-28 md:pb-6">
      <header className="flex items-center gap-2">
        <UserRound className="size-5 text-[color:var(--accent)]" />
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <button className="ml-auto btn btn-primary rounded-full hidden md:inline-flex" onClick={saveAll}>
          <Save className="mr-2 size-4" /> Save
        </button>
        <button
          className="btn btn-muted rounded-full hidden md:inline-flex"
          onClick={() => { localStorage.setItem("civicmatch.authenticated", "0"); window.location.href = "/"; }}
        >
          <LogOut className="mr-2 size-4" /> Logout
        </button>
      </header>

      <div className="space-y-4">
        {/* Main form */}
        <section className="space-y-4">
          {/* Basics / NAME */}
          <div id="basics" className="card space-y-4">
            <div className="border-b border-divider pb-3 flex items-center justify-between">
              <h2 className="font-semibold">Basics</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 items-start">
              <div className="sm:col-span-1 flex items-center gap-4">
                <div className="size-16 rounded-full bg-[color:var(--muted)]/60 flex items-center justify-center">
                  <Camera className="size-6" />
                </div>
                <button className="btn btn-muted rounded-full">Change Picture</button>
              </div>
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <div>
                  <label className="text-sm">First name</label>
                  <input className="w-full rounded-lg border bg-transparent px-3 py-2" value={first} onChange={(e) => setFirst(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm">Last name</label>
                  <input className="w-full rounded-lg border bg-transparent px-3 py-2" value={last} onChange={(e) => setLast(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm">Email</label>
                  <input className="w-full rounded-lg border bg-transparent px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm">Location</label>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 opacity-70" />
                    <input className="flex-1 rounded-lg border bg-transparent px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm">Tags (comma‑separated)</label>
                  <input className="w-full rounded-lg border bg-transparent px-3 py-2" value={tags} onChange={(e) => setTags(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm">Intro</label>
                  <textarea className="w-full rounded-lg border bg-transparent px-3 py-2" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm">Links</label>
                  <div className="space-y-2">
                    {links.map((l, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <LinkIcon className="size-4 opacity-70" />
                        <input className="flex-1 rounded-lg border bg-transparent px-3 py-2" value={l} onChange={(e) => setLinks(links.map((x, idx) => (idx === i ? e.target.value : x)))} />
                        <button className="btn btn-muted" onClick={() => setLinks(links.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></button>
                      </div>
                    ))}
                    <button className="btn btn-muted" onClick={() => setLinks([...links, ""]) }><Plus className="mr-2 size-4" /> Add link</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SAME */}
          <section id="same" className="card space-y-3">
            <header className="flex items-center gap-2"><Wrench className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">SAME — Skills & What I Do</h2></header>
            <input className="w-full rounded-lg border bg-transparent px-3 py-2" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </section>

          {/* FAME */}
          <section id="fame" className="card space-y-3">
            <header className="flex items-center gap-2"><Heart className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">FAME — What I’m Known For</h2></header>
            <textarea className="w-full rounded-lg border bg-transparent px-3 py-2" rows={3} value={fame} onChange={(e) => setFame(e.target.value)} />
          </section>

          {/* AIM */}
          <section id="aim" className="card space-y-3">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Lightbulb className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">AIM — What I’m Focused On</h2></div>
              <button className="btn btn-muted" onClick={() => setAim([...aim, { title: "", summary: "" }])}><Plus className="mr-2 size-4" /> Add item</button>
            </header>
            <div className="grid gap-3 sm:grid-cols-2">
              {aim.map((a, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <input className="w-full rounded-lg border bg-transparent px-3 py-2" placeholder="Title" value={a.title} onChange={(e) => setAim(aim.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
                  <input className="w-full rounded-lg border bg-transparent px-3 py-2" placeholder="Summary" value={a.summary} onChange={(e) => setAim(aim.map((x, idx) => idx === i ? { ...x, summary: e.target.value } : x))} />
                  <div className="flex justify-end">
                    <button className="btn btn-muted" onClick={() => setAim(aim.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* GAME */}
          <section id="game" className="card space-y-3">
            <header className="flex items-center gap-2"><Sparkles className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">GAME — Long‑term Strategy</h2></header>
            <textarea className="w-full rounded-lg border bg-transparent px-3 py-2" rows={3} value={game} onChange={(e) => setGame(e.target.value)} />
          </section>

          {/* Portfolio */}
          <section id="portfolio" className="card space-y-3">
            <header className="flex items-center gap-2"><UserRound className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Portfolio</h2></header>
            <div className="space-y-2">
              {portfolio.map((u, i) => (
                <div key={i} className="flex items-center gap-2">
                  <LinkIcon className="size-4 opacity-70" />
                  <input className="flex-1 rounded-lg border bg-transparent px-3 py-2" value={u} onChange={(e) => setPortfolio(portfolio.map((x, idx) => idx === i ? e.target.value : x))} />
                  <button className="btn btn-muted" onClick={() => setPortfolio(portfolio.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></button>
                </div>
              ))}
              <button className="btn btn-muted" onClick={() => setPortfolio([...portfolio, ""]) }><Plus className="mr-2 size-4" /> Add link</button>
            </div>
          </section>

          {/* Custom sections */}
          {customSections.map((s, idx) => (
            <section key={s.id} className="card space-y-3">
              <header className="flex items-center justify-between">
                <input className="w-full rounded-lg border bg-transparent px-3 py-2 font-semibold" value={s.title} onChange={(e) => setCustomSections(customSections.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))} />
                <button className="btn btn-muted" onClick={() => setCustomSections(customSections.filter((_, i) => i !== idx))}><Trash2 className="size-4" /></button>
              </header>
              <textarea className="w-full rounded-lg border bg-transparent px-3 py-2" rows={3} value={s.content} onChange={(e) => setCustomSections(customSections.map((x, i) => i === idx ? { ...x, content: e.target.value } : x))} />
            </section>
          ))}

          <div className="flex items-center justify-between">
            <button className="btn btn-muted rounded-full" onClick={() => setCustomSections([...customSections, { id: crypto.randomUUID(), title: "New section", content: "" }])}>
              <Plus className="mr-2 size-4" /> Add new section
            </button>
            <button className="btn btn-primary rounded-full hidden md:inline-flex" onClick={saveAll}>
              <Save className="mr-2 size-4" /> Save changes
            </button>
          </div>
        </section>
      </div>

      {/* Sticky mobile save bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-[color:var(--background)]/95 backdrop-blur border-t space-y-2">
        <button className="btn btn-primary w-full rounded-full h-12" onClick={saveAll}><Save className="mr-2 size-4" /> Save</button>
        <button className="btn btn-muted w-full rounded-full h-12" onClick={() => { localStorage.setItem("civicmatch.authenticated", "0"); window.location.href = "/"; }}><LogOut className="mr-2 size-4" /> Logout</button>
      </div>
    </div>
  );
}


