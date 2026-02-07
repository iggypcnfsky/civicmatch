"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import ProjectOnboarding from "@/components/ProjectOnboarding";
import type { Project, ProjectRow, OnboardingSlide } from "@/types/project";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { status, user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);
  
  // Check if authenticated user has already completed the onboarding
  useEffect(() => {
    async function checkCompletion() {
      if (status === "loading") return;
      
      if (status === "unauthenticated" || !user) {
        setCheckingCompletion(false);
        return;
      }
      
      try {
        // First get the project ID
        const { data: projectData } = await supabase
          .from("projects")
          .select("id")
          .eq("slug", slug)
          .single();
        
        if (!projectData) {
          setCheckingCompletion(false);
          return;
        }
        
        // Check if user has completed the onboarding/game
        const { data: completion } = await supabase
          .from("game_completions")
          .select("id")
          .eq("project_id", projectData.id)
          .eq("user_id", user.id)
          .single();
        
        if (completion) {
          setHasCompleted(true);
        }
      } catch (err) {
        // No completion found - user hasn't completed yet
        console.log("No completion found for user");
      }
      
      setCheckingCompletion(false);
    }
    
    if (slug) {
      checkCompletion();
    }
  }, [slug, status, user]);
  
  useEffect(() => {
    async function fetchProject() {
      try {
        const { data, error: fetchError } = await supabase
          .from("projects")
          .select("*")
          .eq("slug", slug)
          .single();
        
        if (fetchError) throw fetchError;
        if (!data) throw new Error("Project not found");
        
        // Map to Project type
        const row = data as unknown as ProjectRow;
        const projectData: Project = {
          id: row.id,
          slug: row.slug,
          creatorId: row.creator_id,
          name: row.data.title || "Untitled Project",
          description: row.data.description || "",
          manifesto: row.data.manifesto,
          founderName: row.data.founderName,
          logoUrl: row.data.logoUrl,
          videoUrl: row.data.videoUrl,
          backgroundImageUrl: row.data.backgroundImageUrl,
          tags: row.data.tags,
          location: row.data.location,
          createdAt: row.created_at,
          onboardingSlides: row.data.onboardingSlides,
        };
        
        setProject(projectData);
      } catch (err) {
        console.error("Error fetching project:", err);
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    }
    
    if (slug && !checkingCompletion) {
      fetchProject();
    }
  }, [slug, checkingCompletion]);
  
  const handleOnboardingComplete = () => {
    // Navigate to dashboard after completing onboarding
    router.push(`/projects/${slug}/dashboard`);
  };

  const handleOnboardingClose = () => {
    // Go back to explore when user closes/skips onboarding
    router.push("/explore");
  };
  
  if (loading || checkingCompletion) {
    return (
      <div className="fixed inset-0 bg-[color:var(--background)] z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[color:var(--accent)]"></div>
      </div>
    );
  }
  
  if (error || !project) {
    return (
      <div className="fixed inset-0 bg-[color:var(--background)] z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">{error || "Project not found"}</p>
          <button 
            onClick={() => router.push("/explore")}
            className="inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
          >
            <ArrowLeft className="size-4" />
            Back to Explore
          </button>
        </div>
      </div>
    );
  }
  
  // If user has already completed onboarding, redirect to dashboard
  if (hasCompleted) {
    router.replace(`/projects/${slug}/dashboard`);
    return (
      <div className="fixed inset-0 bg-[color:var(--background)] z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[color:var(--accent)]"></div>
      </div>
    );
  }
  
  // Show the onboarding presentation
  return (
    <ProjectOnboarding 
      project={project}
      onComplete={handleOnboardingComplete}
      onClose={handleOnboardingClose}
    />
  );
}
