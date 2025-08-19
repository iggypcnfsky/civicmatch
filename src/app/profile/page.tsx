"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, Camera, MapPin, Save, Plus, Trash2, Link as LinkIcon, Wrench, Heart, Lightbulb, Sparkles, LogOut, Lock, Eye, Mail } from "lucide-react";
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
  workStyle?: string;
  helpNeeded?: string;
  emailPreferences?: {
    weeklyMatchingEnabled?: boolean;
    profileRemindersEnabled?: boolean;
    connectionNotifications?: boolean;
    frequency?: string;
    preferredTime?: string;
    timezone?: string;
  };
};

export default function ProfilePage() {
  const router = useRouter();
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

  const [game, setGame] = useState("");
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [aimSingle, setAimSingle] = useState<string>("");
  const [workStyle, setWorkStyle] = useState<string>("");
  const [helpNeeded, setHelpNeeded] = useState<string>("");
  const [emailPreferences, setEmailPreferences] = useState({
    weeklyMatchingEnabled: true,
    profileRemindersEnabled: true,
  });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function failSafeLogout() {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        try { await supabase.auth.signOut(); } catch {}
        if (typeof window !== "undefined") window.location.href = "/";
      }
    } catch {}
  }

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
      aim: aimSingle ? [{ title: aimSingle, summary: "" }] : [],
      game,
      portfolio,
      customSections,
      avatarUrl,
      workStyle,
      helpNeeded,
      emailPreferences,
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

    setAimSingle(Array.isArray(d.aim) && d.aim.length > 0 ? (d.aim[0]?.title || "") : "");
    setGame(asString(d.game) ?? "");
    setPortfolio(Array.isArray(d.portfolio) ? d.portfolio : []);
    setCustomSections(Array.isArray(d.customSections) ? d.customSections : []);
    setAvatarUrl(asString(d.avatarUrl) ?? "");
    setWorkStyle(asString((d as ProfileData).workStyle) ?? "");
    setHelpNeeded(asString((d as ProfileData).helpNeeded) ?? "");
    
    // Handle email preferences
    if (d.emailPreferences && typeof d.emailPreferences === 'object') {
      setEmailPreferences({
        weeklyMatchingEnabled: d.emailPreferences.weeklyMatchingEnabled ?? true,
        profileRemindersEnabled: d.emailPreferences.profileRemindersEnabled ?? true,
      });
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess?.session?.user;
        if (!user) return;
        // Ensure a profile exists (create once; never overwrite existing data)
        const username = user.email ?? "";
        const { data: existing, error: existingErr } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (existingErr) { await failSafeLogout(); return; }
        if (!existing && username) {
          const { error: insertErr } = await supabase
            .from("profiles")
            .insert({ user_id: user.id, username, data: { email: username } });
          if (insertErr) { await failSafeLogout(); return; }
        }
        const { data, error } = await supabase.from("profiles").select("data").eq("user_id", user.id).single();
        if (!error && (data?.data as unknown)) {
          applyProfileData(data.data as ProfileData);
        } else if (error) {
          await failSafeLogout();
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
      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;
      if (!user) return alert("Not authenticated");
      const payload = buildProfileData();
      const { error } = await supabase
        .from("profiles")
        .update({ data: payload })
        .eq("user_id", user.id);
      if (error) { await failSafeLogout(); return; }
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



  async function uploadAvatar(file: File) {
    const { data: sess } = await supabase.auth.getSession();
    const user = sess?.session?.user;
    if (!user) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      setAvatarUrl(url);
    } else { await failSafeLogout(); }
  }

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8 space-y-6 pb-28 md:pb-6">
      <header className="flex items-center gap-2">
        <UserRound className="size-5 text-[color:var(--accent)]" />
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <button
            className="h-10 px-5 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm"
            onClick={async () => {
              const { data: sess } = await supabase.auth.getSession();
              const uid = sess?.session?.user?.id;
              if (uid) router.push(`/profiles?user=${uid}`);
            }}
          >
            <Eye className="mr-2 size-4" /> Preview profile
          </button>
          <button
            className="h-10 px-5 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm"
            onClick={() => router.push('/auth/reset')}
          >
            <Lock className="mr-2 size-4" /> Reset Password
          </button>
          <button className="h-10 px-5 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] text-sm" onClick={saveAll} disabled={loading}>
            <Save className="mr-2 size-4" /> {loading ? "Saving..." : "Save"}
          </button>
          <button
            className="h-10 px-5 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm"
            onClick={async () => { await supabase.auth.signOut(); localStorage.setItem("civicmatch.authenticated", "0"); window.location.href = "/"; }}
          >
            <LogOut className="mr-2 size-4" /> Logout
          </button>
        </div>
      </header>

      <div className="space-y-4">
        {/* Main form - 2 column layout for desktop */}
        <section className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
          {/* Left Column - Container for BASICS and Email Preferences */}
          <div className="space-y-4">
          {/* Basics */}
          <div id="basics" className="card space-y-4">
            <div className="border-b border-divider pb-3 flex items-center justify-between">
              <h2 className="font-semibold">Basics</h2>
            </div>
            <div className="space-y-4">
              {/* Avatar section */}
              <div className="flex flex-col items-center gap-4">
                <div className="size-24 rounded-full bg-[color:var(--muted)]/60 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="size-24 object-cover" />
                  ) : (
                    <Camera className="size-6" />
                  )}
                </div>
                <button
                  className="h-10 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 px-4 text-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-2 size-4" /> Change Picture
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
              </div>
              
              {/* Name fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm">First name</label>
                  <input className="w-full rounded-lg border bg-transparent px-3 py-2" value={first} onChange={(e) => setFirst(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm">Last name</label>
                  <input className="w-full rounded-lg border bg-transparent px-3 py-2" value={last} onChange={(e) => setLast(e.target.value)} />
                </div>
              </div>
              
              {/* Email */}
              <div>
                <label className="text-sm">Email</label>
                <input className="w-full rounded-lg border bg-transparent px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              
              {/* Location */}
              <div>
                <label className="text-sm">Location</label>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 opacity-70" />
                  <input className="flex-1 rounded-lg border bg-transparent px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>
              
              {/* Tags */}
              <div>
                <label className="text-sm">Tags (comma‑separated)</label>
                <input className="w-full rounded-lg border bg-transparent px-3 py-2" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
              
              {/* Bio */}
              <div>
                <label className="text-sm">Intro</label>
                <textarea className="w-full rounded-lg border bg-transparent px-3 py-2" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              
              {/* Links */}
              <div>
                <label className="text-sm">Links</label>
                <div className="space-y-2">
                  {links.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <LinkIcon className="size-4 opacity-70" />
                      <input className="flex-1 rounded-full border bg-transparent px-4 py-2" value={l} onChange={(e) => setLinks(links.map((x, idx) => (idx === i ? e.target.value : x)))} />
                      <button className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30" onClick={() => setLinks(links.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                  <button className="h-10 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 px-4 text-sm" onClick={() => setLinks([...links, ""]) }><Plus className="mr-2 size-4" /> Add link</button>
                </div>
              </div>
            </div>
          </div>

          {/* Email Preferences Panel */}
          <div id="email-preferences" className="card space-y-4">
            <div className="border-b border-divider pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-[color:var(--accent)]" />
                <h2 className="font-semibold">Email Preferences</h2>
              </div>
            </div>
            <div className="space-y-4">
              {/* Weekly Match Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Weekly Match</label>
                  <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
                    Receive weekly matches with potential collaborators
                  </p>
                </div>
                <button
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    emailPreferences.weeklyMatchingEnabled 
                      ? 'bg-[color:var(--accent)]' 
                      : 'bg-[color:var(--muted)]/60'
                  }`}
                  onClick={() => setEmailPreferences(prev => ({ ...prev, weeklyMatchingEnabled: !prev.weeklyMatchingEnabled }))}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailPreferences.weeklyMatchingEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Newsletter Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Newsletter</label>
                  <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
                    Receive updates about platform features and community highlights
                  </p>
                </div>
                <button
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    emailPreferences.profileRemindersEnabled 
                      ? 'bg-[color:var(--accent)]' 
                      : 'bg-[color:var(--muted)]/60'
                  }`}
                  onClick={() => setEmailPreferences(prev => ({ ...prev, profileRemindersEnabled: !prev.profileRemindersEnabled }))}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailPreferences.profileRemindersEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Right Column - All other panels */}
          <div className="space-y-4">
            {/* Skills & What I Do */}
            <section id="skills" className="card space-y-3">
              <header className="flex items-center gap-2"><Wrench className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Skills & What I Do</h2></header>
              <textarea
                className="w-full rounded-lg border bg-transparent px-3 py-2 min-h-[160px] resize-none"
                rows={3}
                placeholder="List your core skills or roles (e.g., Full‑stack engineer, Product manager)"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </section>

            {/* What I'm Known For */}
            <section id="fame" className="card space-y-3">
              <header className="flex items-center gap-2"><Heart className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">What I&apos;m Known For</h2></header>
              <textarea
                className="w-full rounded-lg border bg-transparent px-3 py-2 min-h-[160px] resize-none"
                rows={3}
                placeholder="What are you known for? (e.g., Led open‑data initiative in my city; ex‑Google PM)"
                value={fame}
                onChange={(e) => setFame(e.target.value)}
              />
            </section>

            {/* What I'm Focused On */}
            <section id="aim" className="card space-y-3">
              <header className="flex items-center gap-2"><Lightbulb className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">What I&apos;m Focused On</h2></header>
              <textarea
                className="w-full rounded-lg border bg-transparent px-3 py-2 min-h-[160px] resize-none"
                rows={3}
                placeholder="What are you focusing on in the next 3–6 months? (e.g., Building MVP for civic engagement app)"
                value={aimSingle}
                onChange={(e) => setAimSingle(e.target.value)}
              />
            </section>

            {/* Long-term Strategy */}
            <section id="game" className="card space-y-3">
              <header className="flex items-center gap-2"><Sparkles className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Long‑term Strategy</h2></header>
              <textarea
                className="w-full rounded-lg border bg-transparent px-3 py-2 min-h-[160px] resize-none"
                rows={3}
                placeholder="What's your long‑term vision? (e.g., Launch a public‑interest tech cooperative)"
                value={game}
                onChange={(e) => setGame(e.target.value)}
              />
            </section>

            {/* Work Style */}
            <section id="work-style" className="card space-y-3">
              <header className="flex items-center gap-2"><Wrench className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">Work Style</h2></header>
              <textarea
                className="w-full rounded-lg border bg-transparent px-3 py-2 min-h-[160px] resize-none"
                rows={3}
                placeholder="How do you like to work? (e.g., Remote async, weekly check‑ins, prefers rapid prototyping)"
                value={workStyle}
                onChange={(e) => setWorkStyle(e.target.value)}
              />
            </section>

            {/* What do I need help with */}
            <section id="help-needed" className="card space-y-3">
              <header className="flex items-center gap-2"><Lightbulb className="size-4 text-[color:var(--accent)]" /><h2 className="font-semibold">What do I need help with</h2></header>
              <textarea
                className="w-full rounded-lg border bg-transparent px-3 py-2 min-h-[160px] resize-none"
                rows={3}
                placeholder="What help do you need? (e.g., Designer to shape UX; Intro to city data portal)"
                value={helpNeeded}
                onChange={(e) => setHelpNeeded(e.target.value)}
              />
            </section>
          </div>
        </section>
      </div>

      {/* Sticky mobile save bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-[color:var(--background)]/95 backdrop-blur border-t space-y-2">
        <button
          className="h-10 w-full inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] text-sm disabled:opacity-60"
          onClick={saveAll}
          disabled={loading}
        >
          <Save className="mr-2 size-4" /> {loading ? "Saving..." : "Save"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="h-10 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm"
            onClick={async () => {
              const { data: sess } = await supabase.auth.getSession();
              const uid = sess?.session?.user?.id;
              if (uid) router.push(`/profiles?user=${uid}`);
            }}
          >
            <Eye className="mr-2 size-4" /> Preview
          </button>
          <button
            className="h-10 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm"
            onClick={() => router.push('/auth/reset')}
          >
            <Lock className="mr-2 size-4" /> Reset Password
          </button>
        </div>
        <button
          className="h-10 w-full inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm"
          onClick={async () => { await supabase.auth.signOut(); localStorage.setItem("civicmatch.authenticated", "0"); window.location.href = "/"; }}
        >
          <LogOut className="mr-2 size-4" /> Logout
        </button>
      </div>
    </div>
  );
}


