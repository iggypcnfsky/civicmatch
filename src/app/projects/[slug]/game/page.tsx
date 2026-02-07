"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import Logo from "@/components/Logo";

// This page is now a redirect point - onboarding happens on the main project page
export default function ProjectGamePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { status, user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function checkAndRedirect() {
      if (status === "loading") return;
      
      if (status === "unauthenticated") {
        setLoading(false);
        return;
      }
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("id, data")
          .eq("slug", slug)
          .single();
        
        if (projectError || !projectData) {
          setLoading(false);
          return;
        }
        
        const row = projectData as unknown as { id: string; data: { title: string } };
        
        // Check if user has completed the game/onboarding
        const { data: completion } = await supabase
          .from("game_completions")
          .select("id")
          .eq("project_id", row.id)
          .eq("user_id", user.id)
          .single();
        
        if (completion) {
          // User has completed, redirect to dashboard
          router.replace(`/projects/${slug}/dashboard`);
        } else {
          // User hasn't completed, redirect to project page for onboarding
          router.replace(`/projects/${slug}`);
        }
      } catch (err) {
        console.error("Error:", err);
        setLoading(false);
      }
    }
    
    checkAndRedirect();
  }, [slug, user, status, router]);
  
  if (status === "loading" || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[color:var(--background)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[color:var(--accent)]"></div>
      </div>
    );
  }
  
  if (status === "unauthenticated") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[color:var(--background)] p-6">
        <Lock className="size-16 text-[color:var(--accent)] mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Login Required</h1>
        <p className="text-center opacity-70 mb-6">
          You need to be logged in to access this project.
        </p>
        <Link
          href={`/explore?returnUrl=${encodeURIComponent(`/projects/${slug}`)}`}
          className="px-6 py-3 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:opacity-90 transition-opacity"
        >
          Log in to continue
        </Link>
      </div>
    );
  }
  
  return (
    <div className="min-h-dvh flex flex-col bg-[color:var(--background)] pt-12">
      <header className="flex items-center justify-between p-6 border-b border-divider">
        <Link 
          href={`/projects/${slug}`}
          className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft className="size-4" />
          Back to Project
        </Link>
        <Logo className="size-8 text-[color:var(--accent)]" />
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[color:var(--accent)] mb-4"></div>
        <p className="text-sm opacity-70">Redirecting...</p>
      </main>
    </div>
  );
}
