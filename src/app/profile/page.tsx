"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  UserRound, 
  Camera, 
  MapPin, 
  Save, 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  Wrench, 
  Heart, 
  Lightbulb, 
  Sparkles, 
  LogOut, 
  Lock, 
  Eye, 
  Mail, 
  Trash, 
  AlertTriangle,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import LocationAutocomplete, { LocationData } from "@/components/LocationAutocomplete";
import { loadGoogleMaps } from "@/lib/google/maps-loader";
import { ActivityTimeline, UpcomingEvents } from "@/components/profile";

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
  xp?: number;
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
  const [location, setLocation] = useState<string | LocationData>("");
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
  const [xp, setXp] = useState<number>(0);
  const [emailPreferences, setEmailPreferences] = useState({
    weeklyMatchingEnabled: true,
    profileRemindersEnabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
      xp, // Preserve XP
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
    
    // Handle location data - could be string (legacy) or LocationData object
    if (d.location) {
      if (typeof d.location === 'string') {
        setLocation(d.location);
      } else if (typeof d.location === 'object' && d.location && 'displayName' in d.location) {
        setLocation(d.location as LocationData);
      } else {
        setLocation(asString(d.location) ?? "");
      }
    } else {
      setLocation("");
    }
    
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
    setXp(typeof d.xp === 'number' ? d.xp : 0);
    
    // Handle email preferences
    if (d.emailPreferences && typeof d.emailPreferences === 'object') {
      setEmailPreferences({
        weeklyMatchingEnabled: d.emailPreferences.weeklyMatchingEnabled ?? true,
        profileRemindersEnabled: d.emailPreferences.profileRemindersEnabled ?? true,
      });
    }
  }

  // Load Google Maps API
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch(error => {
        console.warn('Failed to load Google Maps:', error);
        setMapsLoaded(false);
      });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess?.session?.user;
        if (!user) return;
        setCurrentUserId(user.id);
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

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;
      if (!user) return alert("Not authenticated");
      
      // First delete the profile (this will also handle related data cleanup)
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", user.id);
      
      if (profileError) {
        console.error("Delete profile error:", profileError);
        // Continue anyway as the auth deletion might work
      }
      
      // Delete user account via API route
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sess.session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete account');
      }
      
      // Clear local storage
      localStorage.clear();
      
      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Delete account error:", error);
      alert("Failed to delete account. Please try again or contact support.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
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
    <div className="min-h-dvh page-container pb-28 md:pb-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UserRound className="size-5 text-[color:var(--accent)]" />
          <h1 className="text-2xl font-bold">Edit Profile</h1>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            className="h-10 px-5 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm transition-colors"
            onClick={async () => {
              const { data: sess } = await supabase.auth.getSession();
              const uid = sess?.session?.user?.id;
              if (uid) router.push(`/profiles/${uid}`);
            }}
          >
            <Eye className="mr-2 size-4" /> Preview
          </button>
          <button 
            className="h-10 px-5 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60" 
            onClick={saveAll} 
            disabled={loading}
          >
            <Save className="mr-2 size-4" /> {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
        
        {/* LEFT COLUMN - Edit Forms */}
        <div className="space-y-4">
          {/* Basics Card */}
          <div id="basics" className="card space-y-4">
            <div className="border-b border-divider pb-3 flex items-center gap-2">
              <UserRound className="size-4 text-[color:var(--accent)]" />
              <h2 className="font-semibold">Basics</h2>
            </div>
            
            <div className="space-y-4">
              {/* Avatar section */}
              <div className="flex items-center gap-4">
                <div className="size-20 rounded-full bg-[color:var(--muted)]/40 flex items-center justify-center overflow-hidden ring-4 ring-[color:var(--background)] shadow-md">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="size-20 object-cover" />
                  ) : (
                    <Camera className="size-6 opacity-50" />
                  )}
                </div>
                <div>
                  <button
                    className="h-9 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 px-4 text-sm transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="mr-2 size-4" /> Change Photo
                  </button>
                  <p className="text-xs text-[color:var(--muted-foreground)] mt-1">JPG, PNG or WebP</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
              </div>
              
              {/* Name fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">First name</label>
                  <input className="w-full h-10 rounded-full border bg-transparent px-4 text-sm" value={first} onChange={(e) => setFirst(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Last name</label>
                  <input className="w-full h-10 rounded-full border bg-transparent px-4 text-sm" value={last} onChange={(e) => setLast(e.target.value)} />
                </div>
              </div>
              
              {/* Email */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <input className="w-full h-10 rounded-full border bg-transparent px-4 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              
              {/* Location */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Location</label>
                {mapsLoaded ? (
                  <LocationAutocomplete
                    value={location}
                    onChange={setLocation}
                    placeholder="Enter your city or location"
                    showUpdatePrompt={typeof location === 'string' && location.length > 0}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 opacity-70" />
                    <input 
                      className="flex-1 h-10 rounded-full border bg-transparent px-4 text-sm" 
                      value={typeof location === 'string' ? location : location?.displayName || ''} 
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter your city or location"
                    />
                  </div>
                )}
              </div>
              
              {/* Tags */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tags (comma‑separated)</label>
                <input className="w-full h-10 rounded-full border bg-transparent px-4 text-sm" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., Product Manager, Climate Tech" />
              </div>
              
              {/* Bio */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Intro</label>
                <textarea className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm resize-none" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A brief introduction about yourself..." />
              </div>
              
              {/* Links */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Links</label>
                <div className="space-y-2">
                  {links.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <LinkIcon className="size-4 opacity-70 flex-shrink-0" />
                      <input className="flex-1 h-10 rounded-full border bg-transparent px-4 text-sm" value={l} onChange={(e) => setLinks(links.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder="https://..." />
                      <button className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-red-100 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors" onClick={() => setLinks(links.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                  <button className="h-9 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 px-4 text-sm transition-colors" onClick={() => setLinks([...links, ""]) }><Plus className="mr-2 size-4" /> Add link</button>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Content Cards - 2x3 Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Skills & What I Do */}
            <section id="skills" className="card space-y-3">
              <header className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Wrench className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="font-semibold text-sm">Skills & What I Do</h2>
              </header>
              <textarea
                className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm min-h-[120px] resize-none"
                placeholder="List your core skills or roles (e.g., Full‑stack engineer, Product manager)"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </section>

            {/* What I'm Known For */}
            <section id="fame" className="card space-y-3">
              <header className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <Heart className="size-4 text-rose-600 dark:text-rose-400" />
                </div>
                <h2 className="font-semibold text-sm">What I&apos;m Known For</h2>
              </header>
              <textarea
                className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm min-h-[120px] resize-none"
                placeholder="What are you known for? (e.g., Led open‑data initiative in my city)"
                value={fame}
                onChange={(e) => setFame(e.target.value)}
              />
            </section>

            {/* What I'm Focused On */}
            <section id="aim" className="card space-y-3">
              <header className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Lightbulb className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="font-semibold text-sm">What I&apos;m Focused On</h2>
              </header>
              <textarea
                className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm min-h-[120px] resize-none"
                placeholder="What are you focusing on in the next 3–6 months?"
                value={aimSingle}
                onChange={(e) => setAimSingle(e.target.value)}
              />
            </section>

            {/* Long-term Strategy */}
            <section id="game" className="card space-y-3">
              <header className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Sparkles className="size-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="font-semibold text-sm">Long‑term Strategy</h2>
              </header>
              <textarea
                className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm min-h-[120px] resize-none"
                placeholder="What's your long‑term vision?"
                value={game}
                onChange={(e) => setGame(e.target.value)}
              />
            </section>

            {/* Work Style */}
            <section id="work-style" className="card space-y-3">
              <header className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Wrench className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="font-semibold text-sm">Work Style</h2>
              </header>
              <textarea
                className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm min-h-[120px] resize-none"
                placeholder="How do you like to work? (e.g., Remote async, weekly check‑ins)"
                value={workStyle}
                onChange={(e) => setWorkStyle(e.target.value)}
              />
            </section>

            {/* What do I need help with */}
            <section id="help-needed" className="card space-y-3">
              <header className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Lightbulb className="size-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="font-semibold text-sm">What do I need help with</h2>
              </header>
              <textarea
                className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm min-h-[120px] resize-none"
                placeholder="What help do you need? (e.g., Designer to shape UX)"
                value={helpNeeded}
                onChange={(e) => setHelpNeeded(e.target.value)}
              />
            </section>
          </div>

          {/* Settings Section */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Email Preferences Panel */}
            <div id="email-preferences" className="card space-y-4">
              <div className="border-b border-divider pb-3 flex items-center gap-2">
                <Mail className="size-4 text-[color:var(--accent)]" />
                <h2 className="font-semibold">Email Preferences</h2>
              </div>
              <div className="space-y-4">
                {/* Weekly Match Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Weekly Match</label>
                    <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
                      Receive weekly matches with collaborators
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
                    <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
                      Platform updates and highlights
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

            {/* Account Actions Panel */}
            <div id="account-actions" className="card space-y-4">
              <div className="border-b border-divider pb-3 flex items-center gap-2">
                <Settings className="size-4 text-[color:var(--accent)]" />
                <h2 className="font-semibold">Account</h2>
              </div>
              <div className="space-y-2">
                {/* Reset Password */}
                <button
                  className="w-full h-10 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm transition-colors"
                  onClick={() => router.push('/auth/reset')}
                >
                  <Lock className="mr-2 size-4" /> Reset Password
                </button>

                {/* Logout */}
                <button
                  className="w-full h-10 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm transition-colors"
                  onClick={async () => { await supabase.auth.signOut(); localStorage.setItem("civicmatch.authenticated", "0"); window.location.href = "/"; }}
                >
                  <LogOut className="mr-2 size-4" /> Logout
                </button>

                {/* Delete Account */}
                <button
                  className="w-full h-10 inline-flex items-center justify-center rounded-full border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-sm dark:border-red-800 dark:bg-red-950/50 dark:hover:bg-red-950/70 dark:text-red-400 transition-colors"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash className="mr-2 size-4" /> Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Sidebar */}
        <aside className="lg:sticky lg:top-20 space-y-4">
          {/* Upcoming Events */}
          {currentUserId && (
            <div className="card">
              <div className="flex items-center justify-between border-b border-divider pb-3 mb-4">
                <h3 className="font-semibold">Upcoming Events</h3>
              </div>
              <UpcomingEvents userId={currentUserId} limit={3} />
            </div>
          )}
          
          {/* Contributions CV */}
          <div className="card">
            <div className="flex items-center justify-between border-b border-divider pb-3 mb-4">
              <h3 className="font-semibold">Your Contributions</h3>
              {xp > 0 && (
                <span className="text-sm text-[color:var(--muted-foreground)]">
                  {xp.toLocaleString()} XP
                </span>
              )}
            </div>
            
            {/* Activity Timeline (CV) */}
            {currentUserId && (
              <ActivityTimeline 
                userId={currentUserId} 
                limit={15}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[color:var(--background)] rounded-2xl p-6 max-w-md w-full border shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold">Delete Account</h3>
            </div>
            <p className="text-sm text-[color:var(--muted-foreground)] mb-6">
              Are you sure you want to delete your account? This action cannot be undone. All your profile data, connections, and messages will be permanently deleted.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="h-10 px-4 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm flex-1 transition-colors"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="h-10 px-4 inline-flex items-center justify-center rounded-full border border-red-300 bg-red-600 hover:bg-red-700 text-white text-sm flex-1 disabled:opacity-50 transition-colors"
                onClick={deleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <>Deleting...</>
                ) : (
                  <>
                    <Trash className="mr-2 size-4" /> Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky mobile save bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-[color:var(--background)]/95 backdrop-blur border-t">
        <button
          className="h-12 w-full inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium disabled:opacity-60 transition-opacity"
          onClick={saveAll}
          disabled={loading}
        >
          <Save className="mr-2 size-4" /> {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
