"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Compass, Bell, Star, Mail, Search, Users, Calendar, CalendarDays, MessageSquareText, CheckCircle2, Sparkles, MapPin, ExternalLink, UserRound, Github, ChevronLeft, ChevronRight, Flag } from "lucide-react";

function StatCard({ title, value, cta, icon: Icon }: { title: string; value: string; cta?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="text-3xl font-bold">{value}</div>
        {Icon && <Icon className="size-5 text-[color:var(--accent)]" />}
      </div>
      <div className="mt-1 text-sm text-[color:var(--foreground)]/70">{title}</div>
      {cta && (
        <button className="btn btn-primary mt-3 w-full" onClick={() => alert(cta)}>
          {cta}
        </button>
      )}
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-2">
        <Star className="size-4 text-[color:var(--accent)]" />
        <h3 className="font-semibold">How it works</h3>
      </div>
      <p className="text-sm leading-relaxed text-[color:var(--foreground)]/80">
        Review one profile at a time. Send an invite to connect; if they accept, you can chat.
        To keep quality high, you can send up to 20 invites per week.
      </p>
      <div className="flex gap-2">
        <button className="btn btn-primary">Start discovering</button>
        <button className="btn btn-muted">View saved</button>
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="size-4 text-[color:var(--accent)]" />
        <h3 className="font-semibold">Quick actions</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/discover" className="btn btn-primary">
          <Compass className="mr-2 size-4" /> Start discovering
        </Link>
        <Link href="/messages" className="btn btn-muted">
          <MessageSquareText className="mr-2 size-4" /> Open inbox
        </Link>
        <Link href="/profile" className="btn btn-muted">
          <Users className="mr-2 size-4" /> Edit profile
        </Link>
        <button className="btn btn-muted" onClick={() => alert("Invite link copied")}> 
          <Star className="mr-2 size-4" /> Copy invite link
        </button>
      </div>
    </div>
  );
}

function MeetingsCard() {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="size-4 text-[color:var(--accent)]" />
        <h3 className="font-semibold">Upcoming meetings</h3>
      </div>
      <ul className="text-sm space-y-2">
        <li className="flex items-center justify-between">
          <span>Tue 10:00 — Call with Aleksa</span>
          <button className="btn btn-muted">Details</button>
        </li>
        <li className="flex items-center justify-between">
          <span>Wed 15:30 — Chat with Beatrice</span>
          <button className="btn btn-muted">Details</button>
        </li>
      </ul>
    </div>
  );
}

function RecentConversations() {
  const rows = [
    { name: "Aleksa Stojanović", preview: "Definitely! let me know…", days: 3 },
    { name: "Bálint Horváth", preview: "We have different interests…", days: 3 },
    { name: "Beatrice Mufutu", preview: "Hi Iggy…", days: 6 },
  ];
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquareText className="size-4 text-[color:var(--accent)]" />
        <h3 className="font-semibold">Recent conversations</h3>
      </div>
      <div className="divide-y">
        {rows.map((r) => (
          <Link key={r.name} href="/messages" className="flex items-center justify-between py-2 text-sm hover:bg-[color:var(--muted)]/20 px-2 rounded">
            <span className="truncate mr-3">{r.name} — <span className="opacity-70">{r.preview}</span></span>
            <span className="opacity-60 text-xs">{r.days}d</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SavedProfiles() {
  const items = ["Nadia (Policy)", "Leo (Design)", "Mina (Engineer)", "Tomas (PM)"];
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Users className="size-4 text-[color:var(--accent)]" />
        <h3 className="font-semibold">Saved profiles</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {items.map((i) => (
          <Link key={i} href="/discover" className="rounded border border-divider px-3 py-2 hover:bg-[color:var(--muted)]/20">{i}</Link>
        ))}
      </div>
    </div>
  );
}

function ProgressChecklist() {
  const items = [
    { label: "Complete profile basics", done: true },
    { label: "Set filters and preferences", done: true },
    { label: "Send first 3 invites", done: false },
    { label: "Schedule an intro call", done: false },
  ];
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="size-4 text-[color:var(--accent)]" />
        <h3 className="font-semibold">Your progress</h3>
      </div>
      <ul className="text-sm space-y-2">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2">
            <CheckCircle2 className={`size-4 ${it.done ? "text-[color:var(--accent)]" : "opacity-40"}`} />
            <span className={it.done ? "opacity-80" : "opacity-70"}>{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UpcomingEvents() {
  const events = [
    { title: "Civic Tech Forum", when: "Thu, 7 PM", where: "Online" },
    { title: "Open Data Summit", when: "Sat, 10 AM", where: "Bucharest" },
  ];
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="size-4 text-[color:var(--accent)]" />
        <h3 className="font-semibold">Upcoming events</h3>
      </div>
      <ul className="text-sm space-y-2">
        {events.map((e) => (
          <li key={e.title} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{e.title}</div>
              <div className="opacity-70 flex items-center gap-2 text-xs">
                <Calendar className="size-3" /> {e.when}
                <MapPin className="size-3" /> {e.where}
              </div>
            </div>
            <button className="btn btn-muted">Details</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NetworkingOpportunities() {
  const items = [
    { title: "Civic Match weekly mixer", link: "/events/mixer" },
    { title: "Open-source sprint (GovTools)", link: "/events/sprint" },
    { title: "Mentor office hours", link: "/events/mentors" },
  ];
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Users className="size-4 text-[color:var(--accent)]" />
        <h3 className="font-semibold">Networking opportunities</h3>
      </div>
      <div className="grid gap-2 text-sm">
        {items.map((it) => (
          <Link key={it.title} href={it.link} className="flex items-center justify-between rounded border border-divider px-3 py-2 hover:bg-[color:var(--muted)]/20">
            <span className="truncate mr-3">{it.title}</span>
            <ExternalLink className="size-4 opacity-70" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function SuggestedProfiles() {
  const suggestions = [
    { name: "Nadia A.", role: "Policy", match: 92 },
    { name: "Leo D.", role: "Design", match: 88 },
    { name: "Mina K.", role: "Engineer", match: 86 },
    { name: "Tomas P.", role: "PM", match: 84 },
  ];
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <UserRound className="size-4 text-[color:var(--accent)]" />
        <h3 className="font-semibold">Suggested profiles</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {suggestions.map((s) => (
          <Link key={s.name} href="/discover" className="flex items-center gap-3 rounded border border-divider px-3 py-2 hover:bg-[color:var(--muted)]/20">
            <div className="size-8 rounded-full bg-[color:var(--muted)]/60" />
            <div className="min-w-0">
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-xs opacity-70">{s.role} • Match {s.match}%</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
function MatchesCard() {
  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-[color:var(--accent)]" />
        <h3 className="font-semibold">Your matches</h3>
      </div>
      <p className="text-sm text-[color:var(--foreground)]/80">You have 24 active matches.</p>
      <Link href="/matches" className="btn btn-primary w-full">
        View your matches
      </Link>
    </div>
  );
}

function FiltersCard() {
  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-2">
        <Search className="size-4 text-[color:var(--accent)]" />
        <h3 className="font-semibold">Your filters</h3>
      </div>
      <p className="text-sm text-[color:var(--foreground)]/80">
        Looking for a technical co‑founder in Eastern Europe, aligned with civic tech and
        democratic tools.
      </p>
      <Link href="/filters" className="btn btn-muted w-full">
        Edit filters
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  // Start as unauthenticated to match server render; decide on client.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string>("there");

  useEffect(() => {
    const stored = localStorage.getItem("civicmatch.authenticated");
    setIsAuthenticated(stored === "1");
    const rawName = localStorage.getItem("civicmatch.name") || localStorage.getItem("civicmatch.displayName") || "";
    if (rawName.trim()) {
      setDisplayName(rawName.trim().split(" ")[0]);
    }
  }, []);

  if (isAuthenticated === false || isAuthenticated === null) {
    return (
      <LoginScreen
        onContinue={() => {
          localStorage.setItem("civicmatch.authenticated", "1");
          setIsAuthenticated(true);
        }}
      />
    );
  }
  return (
    <div className="min-h-dvh">
      <main className="p-4 md:p-6 lg:p-8 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Hey {displayName}!</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-muted" onClick={() => alert("Inbox opened")}> 
              <Mail className="mr-2 size-4" /> Inbox
            </button>
            <Link href="/discover" className="btn btn-primary"> 
              <Compass className="mr-2 size-4" /> New search
            </Link>
          </div>
        </header>

        {/* Quick links at the top on mobile */}
        <QuickActions />

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Pending requests" value="10" cta="View pending" icon={Bell} />
          <StatCard title="Unread messages" value="3" cta="Open inbox" icon={Mail} />
          <StatCard title="Profiles matching your filters" value="1,482" cta="View profiles" icon={Search} />
          <StatCard title="Saved profiles awaiting invite" value="4" cta="View saved" icon={Star} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <SuggestedProfiles />
            <RecentConversations />
            <MeetingsCard />
          </div>
          <div className="space-y-4">
            <ProgressChecklist />
            <UpcomingEvents />
            <NetworkingOpportunities />
            <div className="card flex items-center gap-3">
              <Users className="size-5 text-[color:var(--accent)]" />
              <div className="text-sm">You have 8 matches you haven’t messaged yet. Keep up momentum!</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function LoginScreen({ onContinue }: { onContinue: () => void }) {
  const slides = [
    {
      icon: Flag,
      title: "Content Moderation",
      description:
        "Flag inappropriate or synthetic media on social or community platforms, including deepfakes and misinformation.",
    },
    {
      icon: Users,
      title: "Quality Matches",
      description:
        "Curated, values‑aligned connections for civic tech builders, mentors, and collaborators across regions.",
    },
    {
      icon: Sparkles,
      title: "Smart Discovery",
      description:
        "Tune filters once and get ongoing, high‑signal suggestions powered by transparent matching heuristics.",
    },
  ];
  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setSlideIndex((s) => (s + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-dvh grid md:[grid-template-columns:minmax(0,1fr)_minmax(0,1fr)]">
      {/* Left panel: sign in form */}
      <div className="flex flex-col justify-between p-6 md:p-10 lg:p-12 border-r border-divider bg-[color:var(--background)]/95">
        <div>
          <div className="flex items-center gap-2 mb-10">
            <Users className="size-6 text-[color:var(--accent)]" />
            <span className="font-bold tracking-tight">Civic Match</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Sign in or Create Account</h2>
          <div className="space-y-3 max-w-sm">
            <button className="btn btn-muted w-full justify-start">
              <span className="mr-2 rounded bg-white/80 p-1 text-black">G</span>
              Continue with Google
            </button>
            <button className="btn btn-muted w-full justify-start">
              <Github className="mr-2 size-4" /> Continue with GitHub
            </button>
            <div className="text-center text-xs opacity-60">or</div>
            <input
              type="email"
              placeholder="Email address"
              className="w-full rounded-md border border-divider bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/40"
            />
            <button className="btn btn-primary w-full" onClick={onContinue}>Continue</button>
            <button className="text-xs underline opacity-80 hover:opacity-100">Use SAML SSO</button>
          </div>
        </div>
        <p className="text-[10px] opacity-60">
          By signing in, you agree to the Terms & Conditions and Privacy Policy.
        </p>
      </div>

      {/* Right panel: marketing slides (exact half width) */}
      <div className="relative hidden md:block overflow-hidden text-white">
        <div className="absolute inset-0 bg-[color:var(--foreground)]/5" />
        <div className="h-full w-full flex items-end p-10 bg-[radial-gradient(circle_at_20%_10%,rgba(235,94,40,0.18),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.10),transparent_45%)]">
          <div key={slideIndex} className="max-w-md select-none fade-in-up">
            {(() => { const Icon = slides[slideIndex].icon; return <Icon className="size-6 mb-3" />; })()}
            <h3 className="text-3xl font-semibold mb-2">{slides[slideIndex].title}</h3>
            <p className="text-white/90">{slides[slideIndex].description}</p>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === slideIndex ? "w-8 bg-white/80" : "w-3 bg-white/30"}`}
            />
          ))}
        </div>
        <div className="absolute bottom-6 right-6 flex gap-2">
          <button
            className="rounded-md border border-white/30 p-2 text-white/80 hover:bg-white/10"
            onClick={() => setSlideIndex((s) => (s - 1 + slides.length) % slides.length)}
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            className="rounded-md border border-white/30 p-2 text-white/80 hover:bg-white/10"
            onClick={() => setSlideIndex((s) => (s + 1) % slides.length)}
            aria-label="Next slide"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
