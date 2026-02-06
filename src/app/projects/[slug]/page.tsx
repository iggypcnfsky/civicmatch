"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Play, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import type { Project, ProjectRow } from "@/types/project";

export default function ProjectManifestoPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { status, user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);
  
  // Check if authenticated user has already completed the game
  useEffect(() => {
    async function checkGameCompletion() {
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
        
        // Check if user has completed the game
        const { data: completion } = await supabase
          .from("game_completions")
          .select("id")
          .eq("project_id", projectData.id)
          .eq("user_id", user.id)
          .single();
        
        if (completion) {
          // User has completed game, redirect to dashboard
          router.replace(`/projects/${slug}/dashboard`);
          return;
        }
      } catch (err) {
        // No completion found or error - continue showing manifesto
        console.error("Error checking game completion:", err);
      }
      
      setCheckingCompletion(false);
    }
    
    if (slug) {
      checkGameCompletion();
    }
  }, [slug, status, user, router]);
  
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
  
  if (loading || checkingCompletion) {
    return (
      <>
        <div className="fixed inset-0 bg-[color:var(--muted)] -z-10" />
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[color:var(--foreground)]"></div>
        </div>
      </>
    );
  }
  
  if (error || !project) {
    return (
      <>
        <div className="fixed inset-0 bg-[color:var(--muted)] -z-10" />
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl mb-4">{error || "Project not found"}</p>
            <Link 
              href="/explore"
              className="inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
            >
              <ArrowLeft className="size-4" />
              Back to Explore
            </Link>
          </div>
        </div>
      </>
    );
  }
  
  const handleContinue = () => {
    router.push(`/projects/${slug}/game`);
  };

  return (
    <>
      {/* Fixed background that fills entire viewport */}
      <div className="fixed inset-0 bg-[color:var(--muted)] -z-10">
        {/* Decorative blur circle (from Figma) */}
        <div 
          className="absolute -left-[540px] -top-[617px] w-[1589px] h-[1448px] rounded-full opacity-10"
          style={{ 
            background: 'rgba(0, 0, 0, 0.1)',
            filter: 'blur(500px)',
          }}
        />
      </div>
      
      {/* Content - positioned below fixed TopBar */}
      <div className="relative z-10 h-full flex flex-col pt-12">
        {/* Main content */}
        <main className="flex-1 flex flex-col justify-center px-6 lg:px-12 py-8 max-w-4xl">
          {/* Project name and video link */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <h1 className="text-4xl lg:text-5xl font-normal text-[color:var(--foreground)]">
              {project.name}
            </h1>
            {project.videoUrl && (
              <button
                onClick={() => setShowVideo(true)}
                className="flex items-center gap-2 text-[color:var(--foreground)] hover:opacity-80 transition-opacity"
              >
                <Play className="size-5" />
                <span className="text-lg">Play video</span>
              </button>
            )}
          </div>
          
          {/* Manifesto text */}
          <div className="text-[color:var(--foreground)] text-xl lg:text-2xl leading-relaxed max-w-2xl whitespace-pre-line">
            {project.manifesto || project.description}
          </div>
        </main>
        
        {/* Footer with founder and continue button */}
        <footer className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 p-6 lg:p-8">
          {/* Founder info */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-full bg-[color:var(--background)] overflow-hidden">
              {/* Founder avatar placeholder */}
            </div>
            {project.founderName && (
              <span className="text-[color:var(--foreground)] text-lg lg:text-2xl">
                {project.founderName}, Founder
              </span>
            )}
          </div>
          
          {/* Continue button */}
          <button
            onClick={handleContinue}
            className="flex items-center justify-center gap-3 px-10 py-5 rounded-full bg-[color:var(--background)] hover:opacity-90 transition-opacity text-[color:var(--foreground)] font-normal text-lg lg:text-xl"
          >
            Continue
            <ArrowRight className="size-5" />
          </button>
        </footer>
      </div>
      
      {/* Video Modal */}
      {showVideo && project.videoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="relative w-full max-w-4xl aspect-video">
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-12 right-0 text-white hover:text-[#EB5E28] transition-colors"
            >
              Close
            </button>
            <iframe
              src={project.videoUrl}
              className="w-full h-full rounded-lg"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
