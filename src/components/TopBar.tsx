"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, Compass, Mail, UsersRound } from "lucide-react";
import Logo from "@/components/Logo";

function pillClasses(active: boolean): string {
  if (active) return "h-10 w-10 md:w-auto md:px-4 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] gap-2 text-sm";
  return "h-10 w-10 md:w-auto md:px-4 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 gap-2 text-sm";
}

export default function TopBar() {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>("");
  // Call usePathname unconditionally to keep hook order stable across renders
  const pathname = usePathname();
  useEffect(() => {
    setIsAuthed(localStorage.getItem("civicmatch.authenticated") === "1");
    const readName = () => {
      const name = localStorage.getItem("civicmatch.displayName") || localStorage.getItem("civicmatch.name") || "";
      setDisplayName(name);
    };
    readName();
    const handler = () => setIsAuthed(localStorage.getItem("civicmatch.authenticated") === "1");
    window.addEventListener("civicmatch:auth-changed", handler);
    window.addEventListener("civicmatch:profile-updated", readName);
    window.addEventListener("storage", readName as any);
    return () => window.removeEventListener("civicmatch:auth-changed", handler);
  }, []);

  if (!isAuthed) return null;
  const isExplore = pathname === "/";
  const isProfiles = pathname === "/profiles" || pathname.startsWith("/profiles/");
  const isMessages = pathname.startsWith("/messages");
  const isMessageDetail = pathname.startsWith("/messages/");
  const isMyProfile = pathname === "/profile";

  return (
    <div className="sticky top-0 z-40 px-4 md:px-6 lg:px-8 py-2 bg-[color:var(--background)]/95 backdrop-blur border-b flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {isMessageDetail && (
          <Link href="/messages" className="h-9 w-9 md:hidden inline-flex items-center justify-center rounded-full border border-divider" aria-label="Back">
            <ArrowLeft className="size-4" />
          </Link>
        )}
        <Logo className="size-7 text-[color:var(--foreground)]" />
        <span className="font-semibold truncate hidden md:inline">Civic Match</span>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/" className={pillClasses(isExplore)} aria-label="Explore">
          <Compass className="size-4" />
          <span className="hidden md:inline">Explore</span>
        </Link>
        <Link href="/profiles" className={pillClasses(isProfiles)} aria-label="Profiles">
          <UsersRound className="size-4" />
          <span className="hidden md:inline">Profiles</span>
        </Link>
        <Link href="/messages" className={pillClasses(isMessages)} aria-label="Messages">
          <Mail className="size-4" />
          <span className="hidden md:inline">Messages</span>
        </Link>
        <Link href="/profile" className={`${pillClasses(isMyProfile)} md:px-3`} aria-label="Profile">
          <span className={`h-6 w-6 rounded-full border ${isMyProfile ? "bg-[color:var(--background)]/20 border-[color:var(--background)]/30" : "bg-[color:var(--muted)]/60 border-divider"}`} />
          <span className="hidden md:inline truncate max-w-[12ch]">{displayName || "You"}</span>
        </Link>
      </div>
    </div>
  );
}


