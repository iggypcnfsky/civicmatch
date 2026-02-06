"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { VisionContent, ResearchGrid, IdeasGrid, KanbanBoard, JobsPanel, PeoplePanel } from "@/components/project";
import type { Project, ProjectRow, DashboardTab } from "@/types/project";

const VALID_TABS: DashboardTab[] = ['vision', 'plan', 'research', 'ideas', 'jobs', 'people'];

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const { status, user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('research');
  const [organizerIds, setOrganizerIds] = useState<string[]>([]);
  
  // Get tab from URL or default
  useEffect(() => {
    const tab = searchParams.get('tab') as DashboardTab;
    if (tab && VALID_TABS.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("slug", slug)
          .single();
        
        if (projectError) throw projectError;
        
        const row = projectData as unknown as ProjectRow;
        setProject({
          id: row.id,
          slug: row.slug,
          creatorId: row.creator_id,
          name: row.data.title || "Untitled",
          description: row.data.description || "",
          manifesto: row.data.manifesto,
          founderName: row.data.founderName,
          logoUrl: row.data.logoUrl,
          videoUrl: row.data.videoUrl,
          backgroundImageUrl: row.data.backgroundImageUrl,
          tags: row.data.tags,
          location: row.data.location,
          createdAt: row.created_at,
        });
        
        // Set organizer IDs (includes creator by default)
        const organizers = row.data.organizers || [];
        if (!organizers.includes(row.creator_id)) {
          organizers.unshift(row.creator_id);
        }
        setOrganizerIds(organizers);
        
        // Check if user has completed the game
        const { data: completion } = await supabase
          .from("game_completions")
          .select("id")
          .eq("project_id", row.id)
          .eq("user_id", user.id)
          .single();
        
        if (!completion) {
          // Redirect to game if not completed
          router.push(`/projects/${slug}/game`);
          return;
        }
        
        setHasAccess(true);
        
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (slug && status === "authenticated" && user) {
      fetchData();
    } else if (status === "unauthenticated") {
      router.push(`/explore?returnUrl=${encodeURIComponent(`/projects/${slug}/dashboard`)}`);
    }
  }, [slug, user, status, router]);
  
  if (status === "loading" || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[color:var(--foreground)]"></div>
      </div>
    );
  }
  
  if (!hasAccess || !project) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-dvh flex flex-col pt-12">
      {/* Main content area - uses Universal Padding System, positioned below TopBar */}
      <main className="flex-1 page-container py-6">
        {/* Vision Tab */}
        {activeTab === 'vision' && (
          <div className="w-full">
            <VisionContent project={project} compact />
          </div>
        )}
        
        {/* Plan Tab (Kanban Roadmap) */}
        {activeTab === 'plan' && (
          <KanbanBoard projectId={project.id} />
        )}
        
        {/* Research Tab */}
        {activeTab === 'research' && (
          <ResearchGrid projectId={project.id} />
        )}
        
        {/* Ideas Tab */}
        {activeTab === 'ideas' && (
          <IdeasGrid projectId={project.id} />
        )}
        
        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <JobsPanel projectId={project.id} />
        )}
        
        {/* People Tab */}
        {activeTab === 'people' && (
          <PeoplePanel projectId={project.id} organizerIds={organizerIds} />
        )}
      </main>
    </div>
  );
}
