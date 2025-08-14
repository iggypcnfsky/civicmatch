"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue>({ status: "loading", session: null, user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data?.session ?? null);
      setStatus(data?.session ? "authenticated" : "unauthenticated");
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setStatus(nextSession ? "authenticated" : "unauthenticated");
    });
    return () => {
      isMounted = false;
      try { sub.subscription.unsubscribe(); } catch {}
    };
  }, []);

  // Ensure Realtime uses the current JWT for RLS-filtered changes
  useEffect(() => {
    const token = session?.access_token;
    if (token) {
      try {
        // Attach auth to Realtime so postgres_changes respect RLS for this user
        supabase.realtime.setAuth(token);
        // Optional: reconnect existing channels with new token
        supabase.realtime.getChannels().forEach((ch) => ch.send({ type: "broadcast", event: "system:refresh-jwt", payload: {} }));
        // Debug
        console.log("[AuthProvider] Realtime auth token set");
      } catch {}
    }
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    session,
    user: session?.user ?? null,
  }), [status, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}


