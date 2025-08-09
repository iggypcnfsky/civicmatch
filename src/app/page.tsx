"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, LogOut, SlidersHorizontal, Bookmark, X, Compass, UserRound } from "lucide-react";
import Logo from "@/components/Logo";

type Profile = { id: number; name: string; role: string; bio: string };

export default function ExplorePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    setIsAuthenticated(localStorage.getItem("civicmatch.authenticated") === "1");
  }, []);

  const initial: Profile[] = useMemo(() => {
    const names = [
      "Nadia A.", "Leo D.", "Mina K.", "Tomas P.", "Ilya S.", "Bea M.",
      "Arun R.", "Sofia L.", "Mateo G.", "Hana K.", "Omar F.", "Lina V.",
      "Jon P.", "Rina C.", "Kai W.", "Maya T.", "Noah B.", "Zoe H."
    ];
    const roles = ["Design", "Product", "Engineering", "Policy"];
    const bios = [
      "Designing tools for public transparency",
      "Product thinker into civic participation",
      "Backend engineer, reliability‑minded",
      "Policy researcher focused on data rights",
    ];
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i + 1,
      name: names[i % names.length],
      role: roles[i % roles.length],
      bio: bios[i % bios.length],
    }));
  }, []);
  const [items, setItems] = useState<Profile[]>(initial);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setItems((prev) => [
          ...prev,
          ...Array.from({ length: 12 }).map((_, i) => ({
            id: prev.length + i + 1,
            name: `Person ${prev.length + i + 1}`,
            role: ["Design", "Product", "Engineering", "Policy"][(prev.length + i) % 4],
            bio: [
              "Designing tools for public transparency",
              "Product thinker into civic participation",
              "Backend engineer, reliability‑minded",
              "Policy researcher focused on data rights",
            ][(prev.length + i) % 4],
          })),
        ]);
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (isAuthenticated === false || isAuthenticated === null) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="card max-w-sm w-full text-center space-y-4">
          <h2 className="text-xl font-semibold">Welcome to Civic Match</h2>
          <p className="text-sm opacity-80">Sign in to start exploring profiles.</p>
          <input type="email" placeholder="Email address" className="w-full rounded-md border border-divider bg-transparent px-3 py-2 text-sm" />
          <button
            className="btn btn-primary w-full"
            onClick={() => {
              localStorage.setItem("civicmatch.authenticated", "1");
              setIsAuthenticated(true);
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8">

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        {/* Masonry-like grid using CSS columns */}
        <section className="min-w-0">
          <div className="columns-1 sm:columns-2 xl:columns-3 gap-6">
            {items.map((p) => (
              <article key={p.id} className="mb-6 break-inside-avoid rounded-2xl border border-divider overflow-hidden shadow-sm">
                <Link href="/profiles" className="block focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/40 rounded-2xl">
                  <div className="relative aspect-[4/3] bg-[color:var(--muted)]/40">
                    <span className="absolute top-3 left-3 rounded-full bg-[color:var(--background)]/90 border border-divider px-2 py-1 text-xs">
                      {p.role}
                    </span>
                    <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-[color:var(--background)]/80 border border-divider flex items-center justify-center" aria-label="Save" onClick={(e)=>{e.preventDefault();}}>
                      <Bookmark className="size-4" />
                    </button>
                  </div>
                  <div className="bg-[color:var(--background)] text-sm p-3 space-y-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="opacity-80 line-clamp-2">{p.bio}</div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
          <div ref={sentinelRef} className="h-10" />
        </section>

        {/* Sticky filter panel (desktop) */}
        <aside className="hidden lg:block sticky top-20 h-[calc(100dvh-5rem)] overflow-auto">
          <div className="card space-y-3 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-[color:var(--accent)]" /><h3 className="font-semibold">Filters</h3></div>
              <button className="text-xs underline opacity-80" onClick={() => alert('Reset filters')}>Reset</button>
            </div>
            <div className="text-xs opacity-80">Tune who you want to meet. These settings affect Explore.</div>
            <button className="btn btn-muted w-full">Role: Any</button>
            <button className="btn btn-muted w-full">Distance: Anywhere</button>
            <button className="btn btn-muted w-full">Skills: Any</button>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-muted w-full">Experience: Any</button>
              <button className="btn btn-muted w-full">Availability: Any</button>
            </div>
            <button className="btn btn-muted w-full">Collaboration: Any</button>
            <div className="pt-1 text-xs opacity-70">Changes auto‑save. Use Save to persist across devices.</div>
            <button className="btn btn-primary w-full">Save Filters</button>
          </div>
        </aside>
      </div>

      {/* Sticky bottom filter control (mobile) */}
      <div className="lg:hidden fixed bottom-3 left-0 right-0 flex justify-center z-40">
        <button
          className="mx-auto h-12 px-6 rounded-full border border-divider bg-[color:var(--background)] shadow-lg flex items-center gap-2 text-sm font-medium"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="size-4" /> Filters
        </button>
      </div>

      {/* Mobile filters modal */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-divider bg-[color:var(--background)] p-4 space-y-3 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-[color:var(--accent)]" /><h3 className="font-semibold">Filters</h3></div>
              <button className="h-8 w-8 rounded-full border border-divider flex items-center justify-center" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <X className="size-4" />
              </button>
            </div>
            <div className="text-xs opacity-80">Tune who you want to meet.</div>
            <button className="btn btn-muted w-full">Role: Any</button>
            <button className="btn btn-muted w-full">Distance: Anywhere</button>
            <button className="btn btn-muted w-full">Skills: Any</button>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-muted w-full">Experience: Any</button>
              <button className="btn btn-muted w-full">Availability: Any</button>
            </div>
            <button className="btn btn-muted w-full">Collaboration: Any</button>
            <button className="btn btn-primary w-full" onClick={() => setFiltersOpen(false)}>Save Filters</button>
          </div>
        </div>
      )}
    </div>
  );
}


