"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Search, CheckCheck, Inbox } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type ConversationItem = {
  id: string;
  name: string;
  about: string;
  avatarUrl?: string;
  updatedAt: string;
  lastPreview?: string;
  otherUserId?: string;
};

type ChatMessage = {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  read?: boolean;
};

export default function MessagesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ConversationItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollToEnd = () => endRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToEnd(); }, [messages, currentId]);

  async function failSafeLogout() {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        try { await supabase.auth.signOut(); } catch {}
        if (typeof window !== "undefined") window.location.href = "/";
      }
    } catch {}
  }

  // Load conversations for current user (RLS restricts automatically)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id || null;
        setUserId(uid);
        if (!uid) { await failSafeLogout(); return; }
        const { data: convos, error } = await supabase
          .from("conversations")
          .select("id, updated_at, data")
          .order("updated_at", { ascending: false });
        if (error) { await failSafeLogout(); return; }
        const participantIds: string[] = [];
        const items: ConversationItem[] = (convos || []).map((c) => {
          const participants: string[] = (c as { data: { participantIds?: string[] } }).data?.participantIds || [];
          const otherId = participants.find((p) => p !== uid) || uid;
          if (otherId) participantIds.push(otherId);
          return { id: c.id, name: otherId, about: "", updatedAt: c.updated_at, otherUserId: otherId };
        });
        // Fetch counterpart profiles in one query
        if (participantIds.length > 0) {
          const { data: profs, error: profErr } = await supabase
            .from("profiles")
            .select("user_id, username, data")
            .in("user_id", participantIds);
          if (!profErr) {
            const byId = new Map<string, unknown>();
            (profs || []).forEach((p) => byId.set(p.user_id, p));
            items.forEach((it) => {
              const p = byId.get(it.name) as { data?: Record<string, unknown>; username?: string } | undefined;
              const d = (p?.data ?? {}) as { displayName?: string; bio?: string; avatarUrl?: string };
              it.name = d.displayName || p?.username || "Member";
              it.about = d.bio || "";
              it.avatarUrl = d.avatarUrl || undefined;
            });
          }
        }
        setThreads(items);
        if (items.length > 0) setCurrentId(items[0].id);
      } catch { await failSafeLogout(); }
    })();
  }, []);

  // Load messages when thread changes
  useEffect(() => {
    (async () => {
      try {
        if (!currentId) return;
        const { data, error } = await supabase
          .from("messages")
          .select("id, sender_id, created_at, data")
          .eq("conversation_id", currentId)
          .order("created_at", { ascending: true });
        if (error) { await failSafeLogout(); return; }
        const uid = userId;
        const mapped: ChatMessage[] = (data || []).map((m: { id: string; sender_id: string; created_at: string; data: { text?: string } }) => {
          const text = m.data?.text || "";
          const dt = new Date(m.created_at);
          const time = `${dt.getHours().toString().padStart(2, "0")}:${dt
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
          return { id: m.id, text, isMine: m.sender_id === uid, time };
        });
        setMessages(mapped);
        setTimeout(scrollToEnd, 50);
      } catch { await failSafeLogout(); }
    })();
  }, [currentId, userId]);

  return (
    <div className="min-h-dvh p-2 pt-14 md:pt-16 md:p-4 lg:p-6">
      {/* Content: split layout on desktop (1/3–2/3), list-first on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-3 min-h-[calc(100dvh-5rem)] lg:pt-2">
      {/* Threads list */}
      <aside className="flex flex-col">
        <div className="bg-[color:var(--background)] border border-[color:var(--border)] rounded-2xl h-full flex flex-col overflow-hidden shadow-sm">
          {/* Search */}
          <div className="p-4 border-b border-[color:var(--border)]">
            <div className="relative">
              <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
              <input className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/30 py-2.5 pl-10 pr-4 text-sm placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)] transition-colors" placeholder="Search conversations" />
            </div>
          </div>
          {/* Conversations */}
          <div className="flex-1 overflow-auto">
            {threads.length === 0 && (
              <div className="h-full grid place-items-center p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-12 rounded-full bg-[color:var(--muted)]/40 flex items-center justify-center">
                    <Inbox className="size-6 text-[color:var(--muted-foreground)]" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-sm">No conversations yet</div>
                    <div className="text-xs text-[color:var(--muted-foreground)]">Invite someone from Profiles to start a chat.</div>
                  </div>
                </div>
              </div>
            )}
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  if (typeof window !== "undefined" && window.innerWidth < 1024) {
                    router.push(`/messages/${t.id}`);
                  } else {
                    setCurrentId(t.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${
                  currentId === t.id
                    ? "bg-[color:var(--accent)]/10 border-r-2 border-[color:var(--accent)]"
                    : "hover:bg-[color:var(--muted)]/30"
                }`}
              >
                <div className="relative">
                  <div className="size-11 rounded-full overflow-hidden bg-[color:var(--muted)]/40 border border-[color:var(--border)] flex items-center justify-center">
                    {t.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatarUrl} alt="" className="w-full h-full object-cover aspect-square" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent)]/30 flex items-center justify-center text-sm font-medium text-[color:var(--accent)]">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium truncate text-sm">{t.name}</span>
                    <span className="text-xs text-[color:var(--muted-foreground)] whitespace-nowrap">{new Date(t.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-[color:var(--muted-foreground)] truncate">{t.lastPreview || "No messages yet"}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Active thread */}
      <section className="hidden lg:flex flex-col bg-[color:var(--background)] border border-[color:var(--border)] rounded-2xl overflow-hidden shadow-sm">
        {(!currentId || threads.length === 0) ? (
          <div className="flex-1 grid place-items-center p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="size-16 rounded-full bg-[color:var(--muted)]/40 flex items-center justify-center">
                <Inbox className="size-8 text-[color:var(--muted-foreground)]" />
              </div>
              <div className="space-y-2">
                <div className="font-medium">No messages yet</div>
                <div className="text-sm text-[color:var(--muted-foreground)]">Select a conversation or invite someone to connect.</div>
              </div>
            </div>
          </div>
        ) : (
        <>
        <header className="p-5 border-b border-[color:var(--border)]">
          <button 
            onClick={() => {
              const currentThread = threads.find((t) => t.id === currentId);
              if (currentThread?.otherUserId) {
                window.location.href = `/profiles/${currentThread.otherUserId}`;
              }
            }}
            className="flex items-center gap-4 min-w-0 hover:bg-[color:var(--muted)]/20 rounded-xl p-3 -m-3 transition-all duration-200 w-full"
          >
            <div className="size-14 rounded-full overflow-hidden bg-[color:var(--muted)]/40 border-2 border-[color:var(--border)] flex items-center justify-center shadow-sm">
              {threads.find((t) => t.id === currentId)?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={threads.find((t) => t.id === currentId)!.avatarUrl!} alt="" className="w-full h-full object-cover aspect-square" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent)]/30 flex items-center justify-center text-lg font-medium text-[color:var(--accent)]">
                  {(threads.find((t) => t.id === currentId)?.name || "").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 text-left flex-1">
              <div className="font-semibold text-base truncate mb-1">{threads.find((t) => t.id === currentId)?.name || ""}</div>
              <div className="text-sm text-[color:var(--muted-foreground)] truncate">{threads.find((t) => t.id === currentId)?.about || "Click to view profile"}</div>
            </div>
          </button>
        </header>

        {/* Messages list */}
        <div className="flex-1 px-5 py-4 overflow-y-auto">
          <div className="w-full space-y-3">
            {messages.map((m, idx) => (
              <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`${
                    m.isMine
                      ? "bg-[color:var(--accent)] text-white shadow-lg shadow-[color:var(--accent)]/20"
                      : "bg-[color:var(--muted)]/40 border border-[color:var(--border)]"
                  } max-w-[75%] rounded-2xl px-4 py-3 text-sm`}
                >
                  <div className="leading-relaxed">{m.text}</div>
                  <div className={`mt-2 flex items-center gap-1 text-[11px] ${m.isMine ? "text-white/80" : "text-[color:var(--muted-foreground)]"}`}>
                    <span>{m.time}</span>
                    {m.isMine && idx === messages.length - 2 && m.read && (
                      <span className="inline-flex items-center gap-1 ml-2"><CheckCheck className="size-3" /> Seen</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>

        {/* Composer */}
        <form
          className="p-5 border-t border-[color:var(--border)] bg-[color:var(--background)]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            const now = new Date();
            const hh = now.getHours().toString().padStart(2, "0");
            const mm = now.getMinutes().toString().padStart(2, "0");
            setMessages((prev) => [
              ...prev,
              { id: `m${prev.length + 1}`, text, isMine: true, time: `${hh}:${mm}`, read: false },
            ]);
            setText("");
            setTimeout(scrollToEnd, 50);
          }}
        >
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              rows={2}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/20 px-4 py-3 pr-12 text-sm resize-none placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)] transition-colors min-h-[60px] max-h-32"
              style={{
                height: 'auto',
                minHeight: '60px',
                fontSize: '16px' // Prevent zoom on iOS
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  if (e.metaKey || e.ctrlKey) {
                    // Cmd+Enter or Ctrl+Enter: insert new line (default behavior)
                    return;
                  } else {
                    // Enter: send message
                    e.preventDefault();
                    if (!text.trim() || !currentId || !userId) return;
                    
                    const inserting: { conversation_id: string; sender_id: string; data: { text: string } } = {
                      conversation_id: currentId,
                      sender_id: userId,
                      data: { text },
                    };
                    setText("");
                    const now = new Date();
                    setMessages((prev) => [
                      ...prev,
                      { id: `optimistic-${now.getTime()}`, text, isMine: true, time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}` },
                    ]);
                    const { error } = await supabase.from("messages").insert(inserting);
                    if (error) { await failSafeLogout(); }
                    setTimeout(scrollToEnd, 50);
                  }
                }
              }}
            />
            <button 
              type="submit" 
              disabled={!text.trim()}
              className="absolute bottom-3 right-3 h-8 w-8 inline-flex items-center justify-center rounded-lg bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              onClick={async (e) => {
                e.preventDefault();
                if (!text.trim() || !currentId || !userId) return;
                const inserting: { conversation_id: string; sender_id: string; data: { text: string } } = {
                  conversation_id: currentId,
                  sender_id: userId,
                  data: { text },
                };
                setText("");
                const now = new Date();
                setMessages((prev) => [
                  ...prev,
                  { id: `optimistic-${now.getTime()}`, text, isMine: true, time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}` },
                ]);
                const { error } = await supabase.from("messages").insert(inserting);
                if (error) { await failSafeLogout(); }
                setTimeout(scrollToEnd, 50);
              }}
            >
              <Send className="size-4" />
            </button>
          </div>
        </form>
        </>
        )}
      </section>
      </div>
    </div>
  );
}




