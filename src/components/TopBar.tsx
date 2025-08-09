"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, Compass, Mail, UsersRound } from "lucide-react";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase/client";

function pillClasses(active: boolean): string {
  if (active) return "h-10 w-10 md:w-auto md:px-4 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] gap-2 text-sm";
  return "h-10 w-10 md:w-auto md:px-4 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 gap-2 text-sm";
}

function profileClasses(active: boolean): string {
  return active
    ? "h-10 w-10 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)]"
    : "h-10 w-10 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30";
}

export default function TopBar() {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [_displayName, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  // Call usePathname unconditionally to keep hook order stable across renders
  const pathname = usePathname();
  useEffect(() => {
    setIsAuthed(localStorage.getItem("civicmatch.authenticated") === "1");
    const readFromCache = () => {
      const name = localStorage.getItem("civicmatch.displayName") || localStorage.getItem("civicmatch.name") || "";
      const avatar = localStorage.getItem("civicmatch.avatarUrl") || "";
      setDisplayName(name);
      setAvatarUrl(avatar);
    };
    const fetchAndCacheProfile = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("profiles").select("username, data").eq("user_id", uid).maybeSingle();
      const d = (data?.data || {}) as Record<string, unknown>;
      const name = (typeof d.displayName === "string" && d.displayName) || data?.username || "Member";
      const avatar = (typeof d.avatarUrl === "string" && d.avatarUrl) || "";
      localStorage.setItem("civicmatch.displayName", name);
      if (avatar) localStorage.setItem("civicmatch.avatarUrl", avatar); else localStorage.removeItem("civicmatch.avatarUrl");
      setDisplayName(name);
      setAvatarUrl(avatar);
    };
    const fetchOnceIfMissing = async () => {
      const cachedName = localStorage.getItem("civicmatch.displayName");
      const cachedAvatar = localStorage.getItem("civicmatch.avatarUrl");
      if (cachedName && cachedAvatar) return;
      await fetchAndCacheProfile();
    };
    readFromCache();
    fetchOnceIfMissing();
    const onAuth = async () => {
      setIsAuthed(localStorage.getItem("civicmatch.authenticated") === "1");
      // Force refresh avatar/name on login regardless of cache
      await fetchAndCacheProfile();
    };
    const onProfileUpdated = () => {
      // When profile changes, refetch to get fresh avatar, then cache
      fetchAndCacheProfile();
    };
    window.addEventListener("civicmatch:auth-changed", onAuth);
    window.addEventListener("civicmatch:profile-updated", onProfileUpdated);
    window.addEventListener("storage", onProfileUpdated);
    return () => {
      window.removeEventListener("civicmatch:auth-changed", onAuth);
      window.removeEventListener("civicmatch:profile-updated", onProfileUpdated);
      window.removeEventListener("storage", onProfileUpdated);
    };
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
        <Link href="/profile" className={profileClasses(isMyProfile)} aria-label="Profile">
          <span className={`h-8 w-8 rounded-full overflow-hidden border ${isMyProfile ? "border-[color:var(--background)]/30" : "border-divider"}`}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="block w-full h-full bg-[color:var(--muted)]/60" />
            )}
          </span>
          {/* No text on desktop for profile button to keep fixed width */}
        </Link>
      </div>
    </div>
  );
}


