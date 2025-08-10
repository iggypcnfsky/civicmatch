"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCheck, Send } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type ChatMessage = {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  read?: boolean;
};

export default function MobileChatPage() {
  const { id } = useParams<{ id: string }>();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [about, setAbout] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id || null;
      setUserId(uid);
      // Load conversation to resolve counterpart id
      const { data: conv } = await supabase
        .from("conversations")
        .select("data, updated_at")
        .eq("id", id)
        .maybeSingle();
      const participants: string[] = (conv?.data?.participantIds as string[] | undefined) || [];
      const otherId = participants.find((p) => p !== uid) || uid || null;
      if (otherId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, data")
          .eq("user_id", otherId)
          .maybeSingle();
        const d = (prof?.data || {}) as { displayName?: string; bio?: string; avatarUrl?: string };
        setName(d.displayName || prof?.username || "Member");
        setAbout(d.bio || "");
        setAvatarUrl(d.avatarUrl || "");
      }
      // Load messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, created_at, data")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      const mapped: ChatMessage[] = (msgs || []).map((m: { id: string; sender_id: string; created_at: string; data: { text?: string } }) => {
        const dt = new Date(m.created_at);
        const time = `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;
        return { id: m.id, text: m.data?.text || "", isMine: m.sender_id === uid, time };
      });
      setMessages(mapped);
    })();
  }, [id]);

  return (
    <div className="min-h-dvh p-3 md:p-4 lg:p-6 pt-14 lg:hidden">
      {/* Header with avatar/name/about */}
      <header className="p-3 flex items-center gap-3 border rounded-xl border-divider bg-[color:var(--background)]/80 mb-3">
        <div className="size-10 rounded-full overflow-hidden bg-[color:var(--muted)]/40 border border-divider">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{name}</div>
          <div className="text-xs opacity-70 truncate">{about}</div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto pb-24">
        <div className="w-full space-y-2">
          {messages.map((m, idx) => (
            <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
              <div className={`${m.isMine ? "bg-[color:var(--accent)] text-[color:var(--background)]" : "bg-[color:var(--muted)]/30"} max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm`}>
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
        className="p-3 fixed bottom-0 left-0 right-0 bg-[color:var(--background)]/95 backdrop-blur border-t border-divider"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim() || !id || !userId) return;
          const now = new Date();
          const hh = now.getHours().toString().padStart(2, "0");
          const mm = now.getMinutes().toString().padStart(2, "0");
          const optimisticId = `optimistic-${now.getTime()}`;
          setMessages((prev) => [...prev, { id: optimisticId, text, isMine: true, time: `${hh}:${mm}` }]);
          const inserting: { conversation_id: string; sender_id: string; data: { text: string } } = {
            conversation_id: id,
            sender_id: userId,
            data: { text },
          };
          setText("");
          await supabase.from("messages").insert(inserting);
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }}
      >
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" rows={2} className="flex-1 rounded-2xl border bg-transparent px-3 py-3 text-sm resize-none" />
          <button
            type="submit"
            aria-label="Send"
            className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)]"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}


