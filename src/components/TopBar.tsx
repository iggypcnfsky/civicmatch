"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, Compass, Euro, Mail, UsersRound } from "lucide-react";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

function pillClasses(active: boolean, isExplore: boolean = false): string {
  if (active) return "h-10 w-10 md:w-auto md:px-4 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] gap-2 text-sm";
  
  if (isExplore) {
    return "h-10 w-10 md:w-auto md:px-4 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--background)] text-[color:var(--foreground)] hover:bg-[color:var(--background)]/80 gap-2 text-sm";
  }
  
  return "h-10 w-10 md:w-auto md:px-4 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 gap-2 text-sm";
}

function profileClasses(active: boolean, isExplore: boolean = false): string {
  if (active) {
    return "h-10 w-10 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)]";
  }
  
  if (isExplore) {
    return "h-10 w-10 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--background)] text-[color:var(--foreground)] hover:bg-[color:var(--background)]/80";
  }
  
  return "h-10 w-10 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30";
}

export default function TopBar() {
  const { status } = useAuth();
  const isAuthed = status === "authenticated";
  const [, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [showMsgToast, setShowMsgToast] = useState<boolean>(false);
  const [hasNewMessage, setHasNewMessage] = useState<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  // Call usePathname unconditionally to keep hook order stable across renders
  const pathname = usePathname();
  useEffect(() => {
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

  // When auth becomes available, refresh profile cache once
  useEffect(() => {
    if (!isAuthed) return;
    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes?.user?.id) return;
        const { data } = await supabase.from("profiles").select("username, data").eq("user_id", userRes.user.id).maybeSingle();
        const d = (data?.data || {}) as Record<string, unknown>;
        const name = (typeof d.displayName === "string" && d.displayName) || data?.username || "Member";
        const avatar = (typeof d.avatarUrl === "string" && d.avatarUrl) || "";
        localStorage.setItem("civicmatch.displayName", name);
        if (avatar) localStorage.setItem("civicmatch.avatarUrl", avatar); else localStorage.removeItem("civicmatch.avatarUrl");
        setDisplayName(name);
        setAvatarUrl(avatar);
      } catch {}
    })();
  }, [isAuthed]);

  // Realtime: show toast when a new message arrives for this user
  useEffect(() => {
    if (!isAuthed) return;
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      console.log("[TopBar] Realtime init — isAuthed:", isAuthed);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      console.log("[TopBar] Current user id:", uid);
      if (!uid) return;

      channel = supabase
        .channel("messages_toast")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          async (payload) => {
            console.log("[TopBar] INSERT payload received:", payload);
            try {
              const newRow = payload.new as { sender_id?: string; conversation_id?: string };
              if (!newRow || !newRow.conversation_id) return;
              // Ignore my own sends
              if (newRow.sender_id === uid) {
                console.log("[TopBar] Ignoring own message");
                return;
              }
              // Skip if already inside messages views
              if (typeof window !== "undefined" && window.location.pathname.startsWith("/messages")) {
                console.log("[TopBar] Skipping toast because already on /messages");
                return;
              }
              // Check that the user can access the conversation (participant via RLS)
              const { data: conv } = await supabase
                .from("conversations")
                .select("id")
                .eq("id", newRow.conversation_id)
                .maybeSingle();
              if (!conv) {
                console.log("[TopBar] Conversation not visible to this user — likely not a participant");
                return;
              }
              if (!isMounted) return;
              setShowMsgToast(true);
              setHasNewMessage(true);
              if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
              toastTimerRef.current = window.setTimeout(() => setShowMsgToast(false), 4000);
              console.log("[TopBar] Toast shown and dot set");
            } catch {}
          }
        )
        .subscribe((status) => {
          console.log("[TopBar] Realtime channel status:", status);
        });
    })();

    return () => {
      isMounted = false;
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (channel) {
        console.log("[TopBar] Removing realtime channel");
        supabase.removeChannel(channel);
      }
    };
  }, [isAuthed]);

  // Polling fallback: check for recent unseen incoming messages in the background
  useEffect(() => {
    if (!isAuthed) return;
    const cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return;
      const fromStorage = localStorage.getItem("civicmatch.lastSeenMessagesAt");
      const baseline = fromStorage || new Date(0).toISOString();
      // Initial check once on mount
      try {
        const { data } = await supabase
          .from("messages")
          .select("id, sender_id, created_at")
          .gt("created_at", baseline)
          .neq("sender_id", uid)
          .order("created_at", { ascending: false })
          .limit(1);
        if (!cancelled && (data?.length || 0) > 0 && !window.location.pathname.startsWith("/messages")) {
          console.log("[TopBar] Poll detected new message");
          setHasNewMessage(true);
          setShowMsgToast(true);
          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
          toastTimerRef.current = window.setTimeout(() => setShowMsgToast(false), 4000);
        }
      } catch {}
    })();

    // Periodic polling every 12s
    pollTimerRef.current = window.setInterval(async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes?.user?.id;
        if (!uid) return;
        const fromStorage = localStorage.getItem("civicmatch.lastSeenMessagesAt");
        const baseline = fromStorage || new Date(0).toISOString();
        const { data } = await supabase
          .from("messages")
          .select("id, sender_id, created_at")
          .gt("created_at", baseline)
          .neq("sender_id", uid)
          .order("created_at", { ascending: false })
          .limit(1);
        if ((data?.length || 0) > 0 && !window.location.pathname.startsWith("/messages")) {
          console.log("[TopBar] Poll interval detected new message");
          setHasNewMessage(true);
          setShowMsgToast(true);
          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
          toastTimerRef.current = window.setTimeout(() => setShowMsgToast(false), 4000);
        }
      } catch {}
    }, 12000) as unknown as number;

    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, [isAuthed]);

  // Clear dot when entering messages page
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/messages")) {
      console.log("[TopBar] Path changed to", pathname, "— clearing dot");
      setHasNewMessage(false);
      // Mark as seen now
      try { localStorage.setItem("civicmatch.lastSeenMessagesAt", new Date().toISOString()); } catch {}
    }
  }, [pathname]);

  if (!isAuthed) return null;
  const isExplore = pathname === "/explore";
  const isProfiles = pathname === "/profiles" || pathname.startsWith("/profiles/");
  const isMessages = pathname.startsWith("/messages");
  const isFunding = pathname.startsWith("/funding");
  const isMessageDetail = pathname.startsWith("/messages/");
  const isMyProfile = pathname === "/profile";

  return (
    <div className={`sticky top-0 z-40 px-4 md:px-6 lg:px-8 py-2 flex items-center justify-between ${
      isExplore 
        ? '' 
        : 'bg-[color:var(--background)]/95 backdrop-blur border-b'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        {isMessageDetail && (
          <Link href="/messages" className="h-9 w-9 md:hidden inline-flex items-center justify-center rounded-full border border-divider" aria-label="Back">
            <ArrowLeft className="size-4" />
          </Link>
        )}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Home">
          <Logo className={`size-7 ${isExplore ? 'text-[color:var(--background)]' : 'text-[color:var(--foreground)]'}`} />
          <span className={`font-semibold truncate hidden md:inline ${isExplore ? 'text-[color:var(--background)]' : ''}`}>Civic Match</span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/explore" className={pillClasses(isExplore, isExplore)} aria-label="Explore">
          <Compass className="size-4" />
          <span className="hidden md:inline">Explore</span>
        </Link>
        <Link href="/profiles" className={pillClasses(isProfiles, isExplore)} aria-label="Profiles">
          <UsersRound className="size-4" />
          <span className="hidden md:inline">Profiles</span>
        </Link>
        <Link href="/funding" className={pillClasses(isFunding, isExplore)} aria-label="Funding">
          <Euro className="size-4" />
          <span className="hidden md:inline">Funding</span>
        </Link>
        <Link
          href="/messages"
          className={`${pillClasses(isMessages, isExplore)} relative`}
          aria-label="Messages"
          onClick={() => {
            console.log("[TopBar] Messages clicked — clearing dot");
            setHasNewMessage(false);
            try { localStorage.setItem("civicmatch.lastSeenMessagesAt", new Date().toISOString()); } catch {}
          }}
        >
          <span className="relative inline-flex items-center">
            <Mail className="size-4" />
            {hasNewMessage && !isMessages && (
              <span className="absolute left-full ml-1 top-0.5 size-2 rounded-full bg-[color:var(--accent)] ring-2 ring-[color:var(--background)]" aria-hidden="true" />
            )}
          </span>
          <span className="hidden md:inline">Messages</span>
        </Link>
        <Link href="/profile" className={profileClasses(isMyProfile, isExplore)} aria-label="Profile">
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
      {showMsgToast && !isMessages && (
        <Link
          href="/messages"
          className="fixed right-4 top-14 z-[60] inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm shadow-md bg-[color:var(--accent)] text-[color:var(--background)]"
          aria-live="polite"
        >
          <Mail className="size-4" /> New message — Open
        </Link>
      )}
    </div>
  );
}


