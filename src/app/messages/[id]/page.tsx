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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>("Loading conversation...");
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function failSafeLogout() {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        try { await supabase.auth.signOut(); } catch {}
        if (typeof window !== "undefined") window.location.href = "/";
      }
    } catch {}
  }

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        console.log('Loading conversation:', id);
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess?.session?.user?.id || null;
        console.log('Current user ID:', uid);
        setUserId(uid);
        if (!uid) { 
          console.log('No user session, logging out');
          await failSafeLogout(); 
          return; 
        }
        // Load conversation with retry mechanism
        let conv = null;
        let retryCount = 0;
        const maxRetries = 5;
        const baseDelay = 500; // Start with 500ms
        
        while (retryCount < maxRetries && !conv) {
          const { data: convData, error: err } = await supabase
            .from("conversations")
            .select("data, updated_at")
            .eq("id", id)
            .maybeSingle();
            
          if (err) {
            console.error(`Error loading conversation (attempt ${retryCount + 1}):`, err);
          } else if (convData) {
            conv = convData;
            console.log('Conversation loaded successfully on attempt:', retryCount + 1);
            break;
          } else {
            console.log(`Conversation not found (attempt ${retryCount + 1}):`, id);
          }
          
          retryCount++;
          
          if (retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff
            console.log(`Retrying in ${delay}ms...`);
            setLoadingMessage(`Conversation not ready yet, retrying in ${Math.ceil(delay/1000)}s... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            setLoadingMessage("Loading conversation...");
          }
        }
        
        if (!conv) {
          console.error(`Failed to load conversation after ${maxRetries} attempts:`, id);
          await failSafeLogout();
          return;
        }
        console.log('Conversation loaded:', conv);
        const participants: string[] = (conv?.data?.participantIds as string[] | undefined) || [];
        console.log('Participants:', participants, 'Current user:', uid);
        const otherId = participants.find((p) => p !== uid) || uid || null;
        console.log('Other participant ID:', otherId);
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
        const { data: msgs, error: msgErr } = await supabase
          .from("messages")
          .select("id, sender_id, created_at, data")
          .eq("conversation_id", id)
          .order("created_at", { ascending: true });
        if (msgErr) { await failSafeLogout(); return; }
        const mapped: ChatMessage[] = (msgs || []).map((m: { id: string; sender_id: string; created_at: string; data: { text?: string } }) => {
          const dt = new Date(m.created_at);
          const time = `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;
          return { id: m.id, text: m.data?.text || "", isMine: m.sender_id === uid, time };
        });
        setMessages(mapped);
        setIsLoading(false);
      } catch (error) { 
        console.error('Error in conversation loading:', error);
        setIsLoading(false);
        await failSafeLogout(); 
      }
    })();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-dvh p-3 md:p-4 lg:p-6 pt-14 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-3 md:p-4 lg:p-6 pt-14">
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
          const { error } = await supabase.from("messages").insert(inserting);
          if (error) { await failSafeLogout(); }
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


