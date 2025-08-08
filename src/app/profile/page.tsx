"use client";

import { useState } from "react";
import { UserRound, Camera, MapPin, Save } from "lucide-react";

export default function ProfilePage() {
  const [first, setFirst] = useState("Iggy");
  const [last, setLast] = useState("Love");
  const [email, setEmail] = useState("hey@iggy.love");
  const [location, setLocation] = useState("Kraków, Poland");
  const [bio, setBio] = useState("hey!");

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8 space-y-6">
      <header className="flex items-center gap-2">
        <UserRound className="size-5 text-[color:var(--accent)]" />
        <h1 className="text-2xl font-bold">My Profile</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar steps */}
        <aside className="card h-fit p-0 overflow-hidden">
          <div className="border-b px-4 py-3 font-semibold border-divider">My Profile</div>
          <nav className="flex flex-col">
            {[
              "Basics",
              "More About You",
              "Co‑Founder Preferences",
              "Preview Your Profile",
            ].map((item) => (
              <button key={item} className="text-left px-4 py-2 hover:bg-[color:var(--muted)]/20 border-b border-divider last:border-b-0">
                {item}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main form */}
        <section className="space-y-4">
          <div className="card space-y-4">
            <div className="border-b border-divider pb-3 flex items-center justify-between">
              <h2 className="font-semibold">Basics</h2>
              <button className="btn btn-primary"><Save className="mr-2 size-4" /> Save</button>
            </div>

            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-[color:var(--muted)]/60 flex items-center justify-center">
                <Camera className="size-6" />
              </div>
              <button className="btn btn-muted">Change Picture</button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                <label className="text-sm">LinkedIn URL</label>
                <input className="w-full rounded-lg border bg-transparent px-3 py-2" placeholder="https://www.linkedin.com/in/iggylove/" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm">Location</label>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 opacity-70" />
                  <input className="flex-1 rounded-lg border bg-transparent px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm">Introduce yourself</label>
                <textarea className="w-full rounded-lg border bg-transparent px-3 py-2" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


