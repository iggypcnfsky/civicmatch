"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageSquareText,
  Send,
  Search,
  Phone,
  Video,
  Paperclip,
  Smile,
  CheckCheck,
} from "lucide-react";

type Thread = {
  id: string;
  name: string;
  preview: string;
  daysAgo: number;
  avatarColor: string;
  unread?: boolean;
};

type ChatMessage = {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  read?: boolean;
};

const DEMO_THREADS: Thread[] = [
  {
    id: "1",
    name: "Aleksa Stojanović",
    preview: "Definitely! https://www.holons.io/",
    daysAgo: 3,
    avatarColor: "#F59E0B",
    unread: true,
  },
  { id: "2", name: "Bálint Horváth", preview: "We have different interests…", daysAgo: 3, avatarColor: "#10B981" },
  { id: "3", name: "Beatrice Mufutu", preview: "Hi Iggy, sorry I did not read…", daysAgo: 6, avatarColor: "#6366F1" },
  { id: "4", name: "Grzegorz Ziemoiski", preview: "niestety zona mnie…", daysAgo: 9, avatarColor: "#EF4444" },
];

const INITIAL_DEMO_MESSAGES: ChatMessage[] = [
  { id: "m1", text: "how about redesigning democracy?", isMine: false, time: "09:23" },
  {
    id: "m2",
    text: "Definitely! let me know your thoughts, and if you'd like share your telegram handle",
    isMine: true,
    time: "09:24",
    read: true,
  },
  { id: "m3", text: "I'll DM you in a sec.", isMine: false, time: "09:25" },
];

export default function MessagesPage() {
  const [currentId, setCurrentId] = useState(DEMO_THREADS[0].id);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_DEMO_MESSAGES);
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollToEnd = () => endRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToEnd(); }, [messages, currentId]);
  const current = DEMO_THREADS.find((t) => t.id === currentId)!;

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-[360px_1fr]">
      {/* Threads list */}
      <aside className="border-r p-3 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-5 text-[color:var(--accent)]" />
          <h1 className="text-lg font-semibold">Messages</h1>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 text-xs">
          <button className="px-3 py-1 rounded-full border border-divider bg-[color:var(--muted)]/20">Active (12)</button>
          <button className="px-3 py-1 rounded-full border border-divider opacity-80 hover:bg-[color:var(--muted)]/20">Pending (3)</button>
          <button className="px-3 py-1 rounded-full border border-divider opacity-80 hover:bg-[color:var(--muted)]/20">Archived</button>
        </div>

        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
          <input className="w-full rounded-lg border bg-transparent py-2 pl-9 pr-3 text-sm" placeholder="Search conversations" />
        </div>
        <div className="rounded-lg border overflow-hidden">
          {DEMO_THREADS.map((t) => (
            <button
              key={t.id}
              onClick={() => setCurrentId(t.id)}
              className={`w-full flex items-start gap-3 px-3 py-2 text-left transition-colors ${
                currentId === t.id ? "bg-[color:var(--muted)]/30" : "hover:bg-[color:var(--muted)]/20"
              }`}
            >
              <div className="relative">
                <div className="size-8 rounded-full" style={{ backgroundColor: t.avatarColor }} />
                {t.unread && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[color:var(--accent)]" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium truncate">{t.name}</span>
                  <span className="text-xs opacity-60">{t.daysAgo}d</span>
                </div>
                <div className="text-sm opacity-80 truncate">{t.preview}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Active thread */}
      <section className="flex flex-col">
        <header className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full" style={{ backgroundColor: current.avatarColor }} />
            <div>
              <div className="font-semibold">{current.name}</div>
              <div className="text-xs opacity-70">Matched 3 days ago</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-muted"><Phone className="mr-2 size-4" /> Call</button>
            <button className="btn btn-muted"><Video className="mr-2 size-4" /> Video</button>
            <button className="btn btn-primary">We met!</button>
          </div>
        </header>

        {/* Messages list */}
        <div className="flex-1 p-4 overflow-y-auto pb-24 md:pb-0">
          <div className="mx-auto max-w-3xl space-y-2">
            {messages.map((m, idx) => (
              <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`${
                    m.isMine
                      ? "bg-[color:var(--accent)] text-[color:var(--background)]"
                      : "bg-[color:var(--muted)]/30"
                  } max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm`}
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
            {/* Typing indicator */}
            <div className="flex justify-start">
              <div className="bg-[color:var(--muted)]/30 rounded-2xl px-3 py-2 text-xs opacity-80">typing…</div>
            </div>
            <div ref={endRef} />
          </div>
        </div>

        {/* Composer (fixed on mobile, static on md+) */}
        <form
          className="border-t p-3 flex items-center gap-2 md:static fixed bottom-0 left-0 right-0 bg-[color:var(--background)]/95 backdrop-blur md:bg-transparent"
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
          <button type="button" className="btn btn-muted px-2"><Paperclip className="size-4" /></button>
          <button type="button" className="btn btn-muted px-2"><Smile className="size-4" /></button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message"
            className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm"
          />
          <button type="submit" className="btn btn-primary">
            <Send className="mr-2 size-4" /> Send
          </button>
        </form>
      </section>
    </div>
  );
}


