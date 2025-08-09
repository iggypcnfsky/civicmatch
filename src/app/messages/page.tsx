"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Search, Phone, Video, CheckCheck } from "lucide-react";

type Thread = {
  id: string;
  name: string;
  preview: string;
  daysAgo: number;
  avatarColor: string;
  unread?: boolean;
  about?: string;
};

type ChatMessage = {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  read?: boolean;
};

const DEMO_THREADS: Thread[] = [
  { id: "1", name: "Aleksa Stojanović", preview: "Definitely! https://www.holons.io/", daysAgo: 1, avatarColor: "#F59E0B", unread: true, about: "Product designer focused on civic participation." },
  { id: "2", name: "Bálint Horváth", preview: "We have different interests…", daysAgo: 2, avatarColor: "#10B981", about: "Policy researcher into data rights." },
  { id: "3", name: "Beatrice Mufutu", preview: "Hi Iggy, sorry I did not read…", daysAgo: 6, avatarColor: "#6366F1", unread: true, about: "Community organizer exploring open data." },
  { id: "4", name: "Grzegorz Ziemoiski", preview: "niestety zona mnie…", daysAgo: 9, avatarColor: "#EF4444", about: "Engineer, civic tools and reliability." },
  { id: "5", name: "Nadia A.", preview: "Prototype looks great — can we test Friday?", daysAgo: 0, avatarColor: "#F97316", unread: true, about: "Civic‑minded product designer." },
  { id: "6", name: "Leo D.", preview: "Looping in Maya for policy input.", daysAgo: 4, avatarColor: "#22C55E", about: "Product thinker into public services." },
  { id: "7", name: "Mina K.", preview: "Sending notes from the call.", daysAgo: 7, avatarColor: "#06B6D4", about: "Backend engineer, open gov." },
  { id: "8", name: "Tomas P.", preview: "Let's sync next week.", daysAgo: 11, avatarColor: "#8B5CF6", about: "Data viz for budgets." },
  { id: "9", name: "Ilya S.", preview: "Got the dataset cleaned.", daysAgo: 13, avatarColor: "#F43F5E", about: "DBA and infra volunteer." },
  { id: "10", name: "Bea M.", preview: "Here’s the Figma link.", daysAgo: 5, avatarColor: "#0EA5E9", about: "Design systems for gov." },
  { id: "11", name: "Arun R.", preview: "Happy to mentor the team.", daysAgo: 8, avatarColor: "#84CC16", about: "Advisor, policy + product." },
  { id: "12", name: "Sofia L.", preview: "Shared a draft announcement.", daysAgo: 12, avatarColor: "#FB7185", about: "Comms and civic campaigns." },
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
  const router = useRouter();
  const [currentId, setCurrentId] = useState(DEMO_THREADS[0].id);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_DEMO_MESSAGES);
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollToEnd = () => endRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToEnd(); }, [messages, currentId]);
  const current = DEMO_THREADS.find((t) => t.id === currentId)!;

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8">
      {/* Content: split layout on desktop (1/3–2/3), list-first on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] min-h-[calc(100dvh-5rem)]">
      {/* Threads list */}
      <aside className="border-r p-2 space-y-2 lg:max-w-[520px] flex flex-col overflow-hidden">
        <div className="flex-1 rounded-2xl border overflow-auto">
          <div className="sticky top-0 z-10 bg-[color:var(--background)]/95 backdrop-blur border-b border-divider px-3 py-2">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              <input className="w-full rounded-full border bg-transparent py-1.5 pl-9 pr-3 text-sm" placeholder="Search conversations" />
            </div>
          </div>
          <div className="divide-y divide-divider">
          {DEMO_THREADS.map((t) => (
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
                  ? "bg-[color:var(--muted)]/25 border-l-2 border-[color:var(--accent)]"
                  : "hover:bg-[color:var(--muted)]/15"
              }`}
            >
              <div className="relative">
                <div className="size-10 rounded-full" style={{ backgroundColor: t.avatarColor }} />
                {t.unread && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[color:var(--accent)] ring-2 ring-[color:var(--background)]" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium truncate">{t.name}</span>
                  <span className="text-xs opacity-60 whitespace-nowrap">{t.daysAgo}d</span>
                </div>
                <div className="text-xs opacity-80 truncate">{t.preview}</div>
              </div>
            </button>
          ))}
          </div>
        </div>
      </aside>

      {/* Active thread */}
      <section className="hidden lg:flex flex-col">
        <header className="border-b p-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-full" style={{ backgroundColor: current.avatarColor }} />
            <div>
              <div className="font-semibold truncate">{current.name}</div>
              <div className="text-xs opacity-70 truncate">{current.about ?? "Looking to collaborate on civic tech"}</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs opacity-70">Matched {current.daysAgo} days ago</div>
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
          className="border-t p-3 flex items-end gap-2 md:static fixed bottom-0 left-0 right-0 bg-[color:var(--background)]/95 backdrop-blur md:bg-transparent"
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
          <button type="submit" className="btn btn-primary rounded-full h-12 px-6">
            <Send className="mr-2 size-4" /> Send
          </button>
        </form>
      </section>
      </div>
    </div>
  );
}



