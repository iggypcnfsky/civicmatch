"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Mail,
  UserRound,
  Search,
  Star,
  SlidersHorizontal,
  Briefcase,
  Lightbulb,
  Wrench,
  Link as LinkIcon,
  AtSign,
  Image as ImageIcon,
  Play,
  Pause,
} from "lucide-react";

export default function DiscoverPage() {
  // Demo local state for filters and media
  const [role, setRole] = useState<string[]>(["Technical"]);
  // Distance preference replaces region
  const [distance, setDistance] = useState<string[]>(["Anywhere"]);
  const [skills, setSkills] = useState<string[]>(["Development", "Product"]);
  const [causes, setCauses] = useState<string[]>(["Democracy & Governance", "Open Data & Transparency"]);
  const [availability, setAvailability] = useState<string[]>(["10–20 hrs/wk"]);
  const [collabTypes, setCollabTypes] = useState<string[]>(["Co‑founder"]);
  const [projectStages, setProjectStages] = useState<string[]>(["Idea"]);
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [remotePref, setRemotePref] = useState<string[]>(["Remote"]);
  const [timezone, setTimezone] = useState<string[]>(["±3h"]);
  const [experience, setExperience] = useState<string[]>(["Senior"]);
  const [compensation, setCompensation] = useState<string[]>(["Equity"]);
  const [contributions, setContributions] = useState<string[]>(["Volunteering"]);
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [orgTypes, setOrgTypes] = useState<string[]>([]);
  const [coverAlt, setCoverAlt] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const toggle = (arr: string[], value: string, setter: (v: string[]) => void) => {
    setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const Chip = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs transition-colors border ${
        active
          ? "bg-[color:var(--accent)] text-[color:var(--background)] border-transparent"
          : "bg-transparent hover:bg-[color:var(--muted)]/20 border-divider"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8">
      <div className="mb-4 flex items-center gap-2 text-sm">
        <ArrowLeft className="size-4" />
        <Link href="/" className="underline">Back</Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Main column */}
        <div className="xl:col-span-2 space-y-4">
          {/* Header with cover and media */}
          <div className="card flex flex-col gap-3 overflow-hidden p-0">
            <div
              className="relative h-36 md:h-44 w-full"
              style={{
                background:
                  coverAlt
                    ? "linear-gradient(135deg,#EB5E28 0%,#252422 60%)"
                    : "linear-gradient(135deg,#CCC5B9 0%,#FFFCF2 60%)",
              }}
            >
              <button
                className="absolute top-2 right-2 btn btn-muted"
                onClick={() => setCoverAlt((v) => !v)}
              >
                <ImageIcon className="mr-2 size-4" /> Change cover
              </button>
              <div className="absolute bottom-2 left-2 flex items-center gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => setVideoPlaying((v) => !v)}
                >
                  {videoPlaying ? (
                    <>
                      <Pause className="mr-2 size-4" /> Pause intro
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 size-4" /> Play intro
                    </>
                  )}
                </button>
                <span className="text-xs opacity-70 hidden md:block">
                  {videoPlaying ? "Playing sample video…" : "Video available"}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-[color:var(--muted)]/60 flex items-center justify-center">
                  <UserRound className="size-8 text-[color:var(--foreground)]/70" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold">Mohamed Riyas</h1>
                  <div className="flex items-center gap-3 text-sm text-[color:var(--foreground)]/70">
                    <span className="inline-flex items-center gap-1"><MapPin className="size-4" /> Bucharest, Romania</span>
                    <span>33</span>
                    <span>Last seen 5 days ago</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-3 mt-3 text-sm bg-[color:var(--background)]">
                I'm <strong>technical</strong>, ready within a year, and <strong>committed</strong> to an idea. I'm willing to do <strong>Product</strong> and <strong>Engineering</strong>.
              </div>
            </div>
          </div>
          {/* Content sections in two-column grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* About */}
            <section className="card space-y-3">
              <header className="flex items-center gap-2">
                <UserRound className="size-4 text-[color:var(--accent)]" />
                <h2 className="font-semibold">About Me</h2>
              </header>
              <div className="space-y-3 text-sm leading-relaxed text-[color:var(--foreground)]/85">
                <div>
                  <div className="font-medium mb-1">Intro</div>
                  <p>
                    I'm a backend engineer and technical lead with experience delivering distributed
                    systems for automotive, logistics, and enterprise platforms. I enjoy clean
                    architecture, reliability, and mentoring. Recently, I delivered solutions for
                    Toyota Motors Europe and Wabtec. I'm seeking impact‑driven projects with strong
                    teams.
                  </p>
                </div>
                <div>
                  <div className="font-medium mb-1">Life Story</div>
                  <p>
                    Co‑founded my first company, learned from an early failure, and now lead
                    engineering at an established company while exploring new civic tech ideas.
                  </p>
                </div>
                <div>
                  <div className="font-medium mb-1">Free Time</div>
                  <p>Reading, exploring AI, cycling.</p>
                </div>
              </div>
            </section>

            {/* Projects */}
            <section className="card space-y-3">
              <header className="flex items-center gap-2">
                <Briefcase className="size-4 text-[color:var(--accent)]" />
                <h2 className="font-semibold">Projects</h2>
              </header>
              <ul className="list-disc pl-5 text-sm space-y-2">
                <li>Open Budget Explorer — Transparency tool for municipal budgets (Next.js, Postgres)</li>
                <li>Community Pulse — lightweight deliberation app for neighborhoods (React Native)</li>
              </ul>
            </section>

            {/* Ideas */}
            <section className="card space-y-3">
              <header className="flex items-center gap-2">
                <Lightbulb className="size-4 text-[color:var(--accent)]" />
                <h2 className="font-semibold">Ideas</h2>
              </header>
              <p className="text-sm">Exploring a toolkit for participatory budgeting and digital town halls.</p>
            </section>

            {/* Skills & Tools */}
            <section className="card space-y-3">
              <header className="flex items-center gap-2">
                <Wrench className="size-4 text-[color:var(--accent)]" />
                <h2 className="font-semibold">Skills & Tools</h2>
              </header>
              <div className="flex flex-wrap gap-2">
                {["TypeScript", "React", "Node", "Postgres", "Supabase", "Tailwind"].map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full text-xs border border-divider">{s}</span>
                ))}
              </div>
            </section>

            {/* Contact & Links */}
            <section className="card space-y-3 md:col-span-2">
              <header className="flex items-center gap-2">
                <LinkIcon className="size-4 text-[color:var(--accent)]" />
                <h2 className="font-semibold">Contact & Links</h2>
              </header>
              <div className="text-sm grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2"><AtSign className="size-4 opacity-70" /> hey@iggy.love</div>
                <div className="flex items-center gap-2"><LinkIcon className="size-4 opacity-70" /> linkedin.com/in/iggylove</div>
                <div className="flex items-center gap-2"><LinkIcon className="size-4 opacity-70" /> github.com/iggylove</div>
              </div>
            </section>
          </div>
        </div>

        {/* Right column */}
        <aside className="xl:col-span-1 w-full flex flex-col gap-4">
          <section className="card space-y-3">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-[color:var(--accent)]" />
                <h3 className="font-semibold">Invite to connect</h3>
              </div>
              <button className="text-sm inline-flex items-center gap-1">
                <Star className="size-4 text-[color:var(--accent)]" /> Save
              </button>
            </header>
            <textarea
              className="w-full rounded-lg border bg-transparent p-3 text-sm"
              rows={4}
              placeholder="Write a short message and click Invite"
            />
            <button className="btn btn-primary w-full" onClick={() => alert("Invite sent")}>Invite to connect</button>
            <button className="btn btn-muted w-full" onClick={() => alert("Profile skipped")}>Skip profile</button>
            <p className="text-xs text-[color:var(--foreground)]/60">You have <strong>20</strong> invites left this week.</p>
          </section>

          {/* Expanded filters */}
          <section className="card space-y-3">
            <header className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-[color:var(--accent)]" />
              <h3 className="font-semibold">Filters</h3>
            </header>
            <div className="space-y-3 text-sm">
              <div>
                <div className="mb-1 opacity-80">Role</div>
                <div className="flex gap-2 flex-wrap">
                  {["Technical", "Product", "Design", "Ops"].map((r) => (
                    <Chip key={r} label={r} active={role.includes(r)} onClick={() => toggle(role, r, setRole)} />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 opacity-80">Distance</div>
                <div className="flex gap-2 flex-wrap">
                  {["Nearby (≤25 km)", "Within 100 km", "Same country", "Anywhere"].map((d) => (
                    <Chip key={d} label={d} active={distance.includes(d)} onClick={() => toggle(distance, d, setDistance)} />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 opacity-80">Skills</div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    "Development",
                    "Design",
                    "Product",
                    "Data & Research",
                    "Policy",
                    "Community & Organizing",
                    "Marketing & Comms",
                    "Operations",
                    "Fundraising",
                    "Legal",
                    "Content & Media",
                  ].map((s) => (
                    <Chip key={s} label={s} active={skills.includes(s)} onClick={() => toggle(skills, s, setSkills)} />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 opacity-80">Causes</div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    "Democracy & Governance",
                    "Open Data & Transparency",
                    "Civic Participation",
                    "Climate & Environment",
                    "Education",
                    "Public Health",
                    "Housing & Urban",
                    "Justice & Equity",
                  ].map((c) => (
                    <Chip key={c} label={c} active={causes.includes(c)} onClick={() => toggle(causes, c, setCauses)} />
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 opacity-80">Availability</div>
                  <div className="flex gap-2 flex-wrap">
                    {["<10 hrs/wk", "10–20 hrs/wk", "20–30 hrs/wk", "Full‑time"].map((a) => (
                      <Chip key={a} label={a} active={availability.includes(a)} onClick={() => toggle(availability, a, setAvailability)} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 opacity-80">Experience level</div>
                  <div className="flex gap-2 flex-wrap">
                    {["Junior", "Mid", "Senior", "Principal"].map((lvl) => (
                      <Chip key={lvl} label={lvl} active={experience.includes(lvl)} onClick={() => toggle(experience, lvl, setExperience)} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-1 opacity-80">Collaboration type</div>
                <div className="flex gap-2 flex-wrap">
                  {["Co‑founder", "Collaborator", "Advisor"].map((t) => (
                    <Chip key={t} label={t} active={collabTypes.includes(t)} onClick={() => toggle(collabTypes, t, setCollabTypes)} />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 opacity-80">What I can contribute</div>
                <div className="flex gap-2 flex-wrap">
                  {["Volunteering", "Mentorship", "Advising", "Funding", "Network"].map((t) => (
                    <Chip key={t} label={t} active={contributions.includes(t)} onClick={() => toggle(contributions, t, setContributions)} />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 opacity-80">Project stage</div>
                <div className="flex gap-2 flex-wrap">
                  {["Idea", "Prototype", "MVP", "Launched"].map((st) => (
                    <Chip key={st} label={st} active={projectStages.includes(st)} onClick={() => toggle(projectStages, st, setProjectStages)} />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 opacity-80">Background</div>
                <div className="flex gap-2 flex-wrap">
                  {["Government/Public sector", "Nonprofit", "Startup", "Academia", "Community org"].map((b) => (
                    <Chip key={b} label={b} active={backgrounds.includes(b)} onClick={() => toggle(backgrounds, b, setBackgrounds)} />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 opacity-80">Organization type</div>
                <div className="flex gap-2 flex-wrap">
                  {["Nonprofit", "For‑profit", "Co‑op", "Open‑source collective", "Gov Lab"].map((o) => (
                    <Chip key={o} label={o} active={orgTypes.includes(o)} onClick={() => toggle(orgTypes, o, setOrgTypes)} />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 opacity-80">Languages</div>
                <div className="flex gap-2 flex-wrap">
                  {["English", "Polish", "Romanian", "German", "Spanish"].map((lang) => (
                    <Chip key={lang} label={lang} active={languages.includes(lang)} onClick={() => toggle(languages, lang, setLanguages)} />
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 opacity-80">Work mode</div>
                  <div className="flex gap-2 flex-wrap">
                    {["Remote", "Hybrid", "On‑site"].map((m) => (
                      <Chip key={m} label={m} active={remotePref.includes(m)} onClick={() => toggle(remotePref, m, setRemotePref)} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 opacity-80">Timezone overlap</div>
                  <div className="flex gap-2 flex-wrap">
                    {["±1h", "±3h", "±6h", "Any"].map((z) => (
                      <Chip key={z} label={z} active={timezone.includes(z)} onClick={() => toggle(timezone, z, setTimezone)} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-1 opacity-80">Compensation</div>
                <div className="flex gap-2 flex-wrap">
                  {["Equity", "Paid", "Volunteer"].map((c) => (
                    <Chip key={c} label={c} active={compensation.includes(c)} onClick={() => toggle(compensation, c, setCompensation)} />
                  ))}
                </div>
              </div>
              <button className="btn btn-primary w-full" onClick={() => alert("Filters applied")}>Apply filters</button>
            </div>
          </section>
        </aside>
      </div>

      {/* Sticky composer on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-[color:var(--background)]/95 backdrop-blur border-t">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            alert('Message sent');
          }}
        >
          <input className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm" placeholder="Send a message" />
          <button className="btn btn-primary">Send</button>
        </form>
      </div>
    </div>
  );
}


