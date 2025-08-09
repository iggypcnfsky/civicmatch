"use client";

import { useEffect, useRef, useState } from "react";
import { UserRound, Camera, MapPin, Save, Plus, Trash2, Link as LinkIcon, Wrench, Heart, Lightbulb, Sparkles, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type AimItem = { title: string; summary: string };
type CustomSection = { id: string; title: string; content: string };

type ProfileData = {
  displayName?: string;
  email?: string;
  location?: string;
  tags?: string | string[];
  bio?: string;
  links?: string[] | Record<string, unknown>;
  skills?: string | string[];
  fame?: string;
  aim?: AimItem[];
  game?: string;
  portfolio?: string[];
  customSections?: CustomSection[];
  avatarUrl?: string;
};

export default function ProfilePage() {
  // Initialize empty so fetched data is not overridden by demo defaults
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [skills, setSkills] = useState("");
  const [fame, setFame] = useState("");
  const [aim, setAim] = useState<AimItem[]>([]);
  const [game, setGame] = useState("");
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function buildProfileData() {
    const displayName = `${first} ${last}`.trim();
    return {
      displayName,
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
      avatarUrl,
    } as const;
  }

  function asString(v: unknown): string | undefined { return typeof v === "string" ? v : undefined; }
  function asStringArray(v: unknown): string[] {
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
    if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
  }

  function applyProfileData(d: ProfileData) {
    if (!d) return;
    const display = asString(d.displayName) ?? "";
    if (display) {
      setFirst(display.split(" ")?.[0] || "");
      setLast(display.split(" ").slice(1).join(" ") || "");
    }
    setEmail(asString(d.email) ?? "");
    setLocation(asString(d.location) ?? "");
    const tagsArray = Array.isArray(d.tags) ? asStringArray(d.tags) : asStringArray(d.tags);
    setTags(tagsArray.join(", "));
    setBio(asString(d.bio) ?? "");
    if (Array.isArray(d.links)) setLinks(asStringArray(d.links));
    setSkills(asString(d.skills) ?? "");
    setFame(asString(d.fame) ?? "");
    setAim(Array.isArray(d.aim) ? d.aim : []);
    setGame(asString(d.game) ?? "");
    setPortfolio(Array.isArray(d.portfolio) ? d.portfolio : []);
    setCustomSections(Array.isArray(d.customSections) ? d.customSections : []);
    setAvatarUrl(asString(d.avatarUrl) ?? "");
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (!user) return;
        // Ensure a profile exists (create once; never overwrite existing data)
        const username = user.email ?? "";
        const existing = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!existing.data && username) {
          await supabase
            .from("profiles")
            .insert({ user_id: user.id, username, data: { email: username } });
        }
        const { data, error } = await supabase.from("profiles").select("data").eq("user_id", user.id).single();
        if (!error && (data?.data as unknown)) {
          applyProfileData(data.data as ProfileData);
        }
      } finally {
        setLoading(false);
      }
    })();
    // applyProfileData is stable for our usage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAll = async () => {
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) return alert("Not authenticated");
      const payload = buildProfileData();
      await supabase
        .from("profiles")
        .update({ data: payload })
        .eq("user_id", user.id);
      localStorage.setItem("civicmatch.profileDraft", JSON.stringify(payload));
      const display = `${first} ${last}`.trim();
      localStorage.setItem("civicmatch.name", display);
      localStorage.setItem("civicmatch.displayName", display);
      try { window.dispatchEvent(new Event("civicmatch:profile-updated")); } catch {}
      alert("Profile saved");
    } finally {
      setLoading(false);
    }
  };

  function getStorageKeyFromPublicUrl(publicUrl: string): { bucket: string; path: string } | null {
    try {
      const u = new URL(publicUrl);
      const marker = "/storage/v1/object/public/";
      const idx = u.pathname.indexOf(marker);
      if (idx === -1) return null;
      const rest = u.pathname.slice(idx + marker.length);
      const [bucket, ...pathParts] = rest.split("/");
      return { bucket, path: pathParts.join("/") };
    } catch {
      return null;
    }
  }

  async function uploadAvatar(file: File) {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      setAvatarUrl(url);
    }
  }

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8 space-y-6 pb-28 md:pb-6">
      <header className="flex items-center gap-2">
        <UserRound className="size-5 text-[color:var(--accent)]" />
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <button className="ml-auto btn btn-primary rounded-full hidden md:inline-flex" onClick={saveAll} disabled={loading}>
          <Save className="mr-2 size-4" /> {loading ? "Saving..." : "Save"}
        </button>
        <button
          className="btn btn-muted rounded-full hidden md:inline-flex"
          onClick={async () => { await supabase.auth.signOut(); localStorage.setItem("civicmatch.authenticated", "0"); window.location.href = "/"; }}
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
                <div className="size-16 rounded-full bg-[color:var(--muted)]/60 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="size-16 object-cover" />
                  ) : (
                    <Camera className="size-6" />
                  )}
                </div>
                <div className="space-x-2">
                  <button className="btn btn-muted rounded-full" onClick={() => fileInputRef.current?.click()}>Change Picture</button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
                </div>
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
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-[color:var(--accent)]" />
                <h2 className="font-semibold">AIM — What I’m Focused On</h2>
              </div>
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
            <button className="btn btn-primary rounded-full hidden md:inline-flex" onClick={saveAll} disabled={loading}>
              <Save className="mr-2 size-4" /> {loading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </section>
      </div>

      {/* Sticky mobile save bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-[color:var(--background)]/95 backdrop-blur border-t space-y-2">
        <button className="btn btn-primary w-full rounded-full h-12" onClick={saveAll} disabled={loading}><Save className="mr-2 size-4" /> {loading ? "Saving..." : "Save"}</button>
        <button className="btn btn-muted w-full rounded-full h-12" onClick={async () => { await supabase.auth.signOut(); localStorage.setItem("civicmatch.authenticated", "0"); window.location.href = "/"; }}><LogOut className="mr-2 size-4" /> Logout</button>
      </div>
    </div>
  );
}


