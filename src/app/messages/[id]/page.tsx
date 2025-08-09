"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCheck, Send } from "lucide-react";

type ChatMessage = {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  read?: boolean;
};

export default function MobileChatPage() {
  const { id: _id } = useParams<{ id: string }>();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "m1", text: "how about redesigning democracy?", isMine: false, time: "09:23" },
    { id: "m2", text: "Definitely! let me know your thoughts, and if you'd like share your telegram handle", isMine: true, time: "09:24", read: true },
    { id: "m3", text: "I'll DM you in a sec.", isMine: false, time: "09:25" },
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className="min-h-dvh p-4 md:p-6 lg:p-8 pt-16 lg:hidden">

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto pb-24">
        <div className="mx-auto max-w-3xl space-y-2">
          {messages.map((m, idx) => (
            <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
              <div className={`${m.isMine ? "bg-[color:var(--accent)] text-[color:var(--background)]" : "bg-[color:var(--muted)]/30"} max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm`}>
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

      {/* Composer sticky bottom */}
      <form
        className="p-3 fixed bottom-0 left-0 right-0 bg-[color:var(--background)]/95 backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          const now = new Date();
          const hh = now.getHours().toString().padStart(2, "0");
          const mm = now.getMinutes().toString().padStart(2, "0");
          setMessages((prev) => [...prev, { id: `m${prev.length + 1}`, text, isMine: true, time: `${hh}:${mm}` }]);
          setText("");
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }}
      >
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" rows={2} className="flex-1 rounded-2xl border bg-transparent px-3 py-3 text-sm resize-none" />
          <button type="submit" className="btn btn-primary rounded-full h-12 px-6"><Send className="mr-2 size-4" /> Send</button>
        </div>
      </form>
    </div>
  );
}


