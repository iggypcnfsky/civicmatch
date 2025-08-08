"use client";

import Link from "next/link";
import { Compass, Bell, Star, Mail, Search, Users, Calendar, CalendarDays, MessageSquareText, CheckCircle2, Sparkles, MapPin, ExternalLink, UserRound } from "lucide-react";

function StatCard({ title, value, cta }: { title: string; value: string; cta?: string }) {
  return (
    <div className="card">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-[color:var(--foreground)]/70">{title}</div>
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
      <div className="grid sm:grid-cols-2 gap-2">
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
  return (
    <div className="min-h-dvh">
      <main className="p-4 md:p-6 lg:p-8 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Civic Match Dashboard</h1>
            <p className="text-sm text-[color:var(--foreground)]/70">Stay on top of invites, messages, and profiles.</p>
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Pending requests" value="10" cta="View pending" />
          <StatCard title="Unread messages" value="3" cta="Open inbox" />
          <StatCard title="Profiles matching your filters" value="1,482" cta="View profiles" />
          <StatCard title="Saved profiles awaiting invite" value="4" cta="View saved" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <QuickActions />
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
