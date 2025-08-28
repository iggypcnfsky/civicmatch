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
  const [otherUserId, setOtherUserId] = useState<string>("");
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
          setOtherUserId(otherId);
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
    <div className="min-h-dvh p-3 pt-14 bg-[color:var(--muted)]/5">
      {/* Header with avatar/name/about */}
      <button 
        onClick={() => {
          if (otherUserId) {
            window.location.href = `/profiles/${otherUserId}`;
          }
        }}
        className="w-full p-4 flex items-center gap-4 bg-[color:var(--background)] border border-[color:var(--border)] rounded-2xl mb-4 hover:bg-[color:var(--muted)]/20 transition-all duration-200 shadow-sm"
      >
        <div className="size-12 rounded-full overflow-hidden bg-[color:var(--muted)]/40 border-2 border-[color:var(--border)] flex items-center justify-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover aspect-square" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent)]/30 flex items-center justify-center text-sm font-medium text-[color:var(--accent)]">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 text-left flex-1">
          <div className="font-semibold text-base truncate mb-1">{name}</div>
          <div className="text-sm text-[color:var(--muted-foreground)] truncate line-clamp-2">{about || "Click to view profile"}</div>
        </div>
      </button>

      {/* Messages */}
      <div className="flex-1 px-3 py-4 overflow-y-auto pb-28">
        <div className="w-full space-y-3">
          {messages.map((m, idx) => (
            <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
              <div className={`${
                m.isMine 
                  ? "bg-[color:var(--accent)] text-white shadow-lg shadow-[color:var(--accent)]/20" 
                  : "bg-[color:var(--background)] border border-[color:var(--border)]"
              } max-w-[85%] rounded-2xl px-4 py-3 text-sm`}>
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

      {/* Composer sticky bottom */}
      <form
        className="p-4 fixed bottom-0 left-0 right-0 bg-[color:var(--background)]/95 backdrop-blur border-t border-[color:var(--border)]"
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
                }
              }
            }}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Send"
            className="absolute bottom-3 right-3 h-8 w-8 inline-flex items-center justify-center rounded-lg bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}


