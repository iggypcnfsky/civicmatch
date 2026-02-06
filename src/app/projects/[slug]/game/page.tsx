"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Gamepad2, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import Logo from "@/components/Logo";
// Project types imported for future use

export default function ProjectGamePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { status, user } = useAuth();
  
  const [project, setProject] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchProjectAndCompletion() {
      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("id, data")
          .eq("slug", slug)
          .single();
        
        if (projectError) throw projectError;
        if (!projectData) throw new Error("Project not found");
        
        const row = projectData as unknown as { id: string; data: { title: string } };
        setProject({ id: row.id, name: row.data.title || "Project" });
        
        // Check if user has already completed the game
        if (user) {
          const { data: completion } = await supabase
            .from("game_completions")
            .select("id")
            .eq("project_id", row.id)
            .eq("user_id", user.id)
            .single();
          
          if (completion) {
            setHasCompleted(true);
            // Auto-redirect to dashboard if already completed
            router.push(`/projects/${slug}/dashboard`);
          }
        }
      } catch (err) {
        console.error("Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    
    if (slug && status !== "loading") {
      fetchProjectAndCompletion();
    }
  }, [slug, user, status, router]);
  
  const handlePass = async () => {
    if (!user || !project) {
      setError("You must be logged in to continue");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Record game completion
      const { error: insertError } = await supabase
        .from("game_completions")
        .insert({
          project_id: project.id,
          user_id: user.id,
          data: { 
            passed: true,
            passedAt: new Date().toISOString(),
          }
        });
      
      if (insertError) {
        // Check if already completed (unique constraint)
        if (insertError.code === '23505') {
          // Already completed, just redirect
          router.push(`/projects/${slug}/dashboard`);
          return;
        }
        throw insertError;
      }
      
      // Success - redirect to dashboard
      router.push(`/projects/${slug}/dashboard`);
    } catch (err) {
      console.error("Error completing game:", err);
      setError(err instanceof Error ? err.message : "Failed to complete game");
    } finally {
      setSubmitting(false);
    }
  };
  
  if (status === "loading" || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[color:var(--background)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#EB5E28]"></div>
      </div>
    );
  }
  
  if (status === "unauthenticated") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[color:var(--background)] p-6">
        <Lock className="size-16 text-[#EB5E28] mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Login Required</h1>
        <p className="text-center opacity-70 mb-6">
          You need to be logged in to access this project&apos;s game.
        </p>
        <Link
          href={`/explore?returnUrl=${encodeURIComponent(`/projects/${slug}/game`)}`}
          className="px-6 py-3 rounded-full bg-[#EB5E28] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Log in to continue
        </Link>
      </div>
    );
  }
  
  if (error && !project) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[color:var(--background)] p-6">
        <p className="text-xl mb-4">{error}</p>
        <Link 
          href="/explore"
          className="inline-flex items-center gap-2 text-[#EB5E28] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to Explore
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[color:var(--background)] pt-12">
      {/* Header - positioned below fixed TopBar */}
      <header className="flex items-center justify-between p-6 border-b border-divider">
        <Link 
          href={`/projects/${slug}`}
          className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft className="size-4" />
          Back to Manifesto
        </Link>
        <Logo className="size-8 text-[#EB5E28]" />
      </header>
      
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="w-24 h-24 rounded-full bg-[#EB5E28]/10 flex items-center justify-center mx-auto mb-6">
            <Gamepad2 className="size-12 text-[#EB5E28]" />
          </div>
          
          <h1 className="text-3xl lg:text-4xl font-semibold mb-4">
            {project?.name} Challenge
          </h1>
          
          <p className="text-lg opacity-70 leading-relaxed mb-8">
            To access the project dashboard and collaborate with other members, 
            you need to complete a short challenge that helps ensure you understand 
            and align with the project&apos;s mission.
          </p>
          
          {/* Placeholder game content */}
          <div className="bg-[color:var(--muted)]/20 rounded-2xl p-8 mb-8 border border-divider">
            <h2 className="text-xl font-medium mb-4 flex items-center justify-center gap-2">
              <CheckCircle className="size-5 text-green-500" />
              Game Placeholder
            </h2>
            <p className="opacity-70 text-sm mb-6">
              This is a placeholder for the project&apos;s entry game. 
              The actual game mechanics will be implemented later.
              For now, click &quot;Pass&quot; to continue.
            </p>
            
            {error && (
              <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                {error}
              </div>
            )}
            
            <button
              onClick={handlePass}
              disabled={submitting}
              className="px-8 py-4 rounded-full bg-[#EB5E28] text-white font-medium text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Processing..." : "Pass & Enter Dashboard"}
            </button>
          </div>
          
          <p className="text-xs opacity-50">
            By completing this challenge, you&apos;ll gain access to the project&apos;s 
            resources, discussions, and collaboration tools.
          </p>
        </div>
      </main>
    </div>
  );
}
