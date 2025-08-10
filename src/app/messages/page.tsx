"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Search, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type ConversationItem = {
  id: string;
  name: string;
  about: string;
  avatarUrl?: string;
  updatedAt: string;
  lastPreview?: string;
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

  // Load conversations for current user (RLS restricts automatically)
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id || null;
      setUserId(uid);
      if (!uid) return;
      const { data: convos, error } = await supabase
        .from("conversations")
        .select("id, updated_at, data")
        .order("updated_at", { ascending: false });
      if (error) return;
      const participantIds: string[] = [];
      const items: ConversationItem[] = (convos || []).map((c) => {
        const participants: string[] = (c as { data: { participantIds?: string[] } }).data?.participantIds || [];
        const otherId = participants.find((p) => p !== uid) || uid;
        if (otherId) participantIds.push(otherId);
        return { id: c.id, name: otherId, about: "", updatedAt: c.updated_at };
      });
      // Fetch counterpart profiles in one query
      if (participantIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, username, data")
          .in("user_id", participantIds);
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
      setThreads(items);
      if (items.length > 0) setCurrentId(items[0].id);
    })();
  }, []);

  // Load messages when thread changes
  useEffect(() => {
    (async () => {
      if (!currentId) return;
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, created_at, data")
        .eq("conversation_id", currentId)
        .order("created_at", { ascending: true });
      if (error) return;
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
    })();
  }, [currentId, userId]);

  return (
    <div className="min-h-dvh p-3 pt-14 md:pt-18 md:p-4 lg:p-6">
      {/* Content: split layout on desktop (1/3–2/3), list-first on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] min-h-[calc(100dvh-5rem)] lg:pt-3">
      {/* Threads list */}
      <aside className="lg:max-w-[520px] flex flex-col">
        <div className="card p-0 h-full flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-divider">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              <input className="w-full rounded-full border bg-transparent py-2 pl-9 pr-3 text-sm" placeholder="Search conversations" />
            </div>
          </div>
          {/* Conversations */}
          <div className="flex-1 overflow-auto">
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
                className={`w-full flex items-start gap-3 px-3 py-2 text-left transition-colors ${
                  currentId === t.id
                    ? "bg-[color:var(--muted)]/20"
                    : "hover:bg-[color:var(--muted)]/10"
                }`}
              >
                <div className="relative">
                  <div className="size-10 rounded-full overflow-hidden bg-[color:var(--muted)]/40 border border-divider">
                    {t.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium truncate">{t.name}</span>
                    <span className="text-xs opacity-60 whitespace-nowrap">{new Date(t.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs opacity-80 truncate">{t.lastPreview || ""}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Active thread */}
      <section className="hidden lg:flex flex-col card p-0 overflow-hidden">
        <header className="p-3 flex items-center justify-between border-b border-divider">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-full overflow-hidden bg-[color:var(--muted)]/40 border border-divider">
              {threads.find((t) => t.id === currentId)?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={threads.find((t) => t.id === currentId)!.avatarUrl!} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div>
              <div className="font-semibold truncate">{threads.find((t) => t.id === currentId)?.name || ""}</div>
              <div className="text-xs opacity-70 truncate">{threads.find((t) => t.id === currentId)?.about || ""}</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs opacity-70">
            {currentId && new Date(threads.find((t) => t.id === currentId)?.updatedAt || Date.now()).toLocaleString()}
          </div>
        </header>

        {/* Messages list */}
        <div className="flex-1 p-2 md:p-3 overflow-y-auto">
          <div className="w-full space-y-2">
            {messages.map((m, idx) => (
              <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`${
                    m.isMine
                      ? "bg-[color:var(--accent)] text-[color:var(--background)]"
                      : "bg-[color:var(--muted)]/30"
                  } max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm`}
                >
                  <div>{m.text}</div>
                  <div className={`mt-1 flex items-center gap-1 text-[10px] ${m.isMine ? "opacity-90" : "opacity-60"}`}>
                    <span>{m.time}</span>
                    {m.isMine && idx === messages.length - 2 && m.read && (
                      <span className="inline-flex items-center gap-0.5"><CheckCheck className="size-3" /> Seen</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>

        {/* Composer (fixed on mobile, static on md+) */}
        <form
          className="p-3 flex items-end gap-2 md:static fixed bottom-0 left-0 right-0 bg-[color:var(--background)]/95 backdrop-blur md:bg-transparent border-t border-divider"
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
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message"
            rows={2}
            className="flex-1 rounded-2xl border bg-transparent px-3 py-3 text-sm resize-none"
          />
          <button type="submit" className="h-10 md:px-4 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] gap-2 text-sm"
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
              await supabase.from("messages").insert(inserting);
              setTimeout(scrollToEnd, 50);
            }}
          >
            <Send className="size-4" /> Send
          </button>
        </form>
      </section>
      </div>
    </div>
  );
}




