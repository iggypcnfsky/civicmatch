"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Activity,
  ResearchActivity,
  IdeaActivity,
  RoadmapActivity,
  ProjectJoinActivity,
  UserActivityStats,
} from "@/types/gamification";
import {
  BookOpen,
  Lightbulb,
  Map as MapIcon,
  Users,
  Briefcase,
} from "lucide-react";

interface ActivityTimelineProps {
  userId: string;
  limit?: number;
  onStatsLoaded?: (stats: UserActivityStats) => void;
}

interface ProjectInfo {
  id: string;
  slug: string;
  title: string;
}

/**
 * CV-style activity list showing user contributions
 * Format: Project Name | Type | Snippet | Date
 */
export function ActivityTimeline({ 
  userId, 
  limit = 20, 
  onStatsLoaded 
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<Map<string, ProjectInfo>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      setLoading(true);
      try {
        // Fetch all activity types in parallel
        const [
          researchRes,
          ideasRes,
          roadmapRes,
          gameCompletionsRes,
          votesRes,
          profileRes,
        ] = await Promise.all([
          supabase
            .from("research_nodes")
            .select("id, project_id, created_at, data")
            .eq("creator_id", userId)
            .order("created_at", { ascending: false })
            .limit(limit),
          supabase
            .from("ideas")
            .select("id, project_id, created_at, data")
            .eq("creator_id", userId)
            .order("created_at", { ascending: false })
            .limit(limit),
          supabase
            .from("roadmap_items")
            .select("id, project_id, created_at, data")
            .eq("creator_id", userId)
            .order("created_at", { ascending: false })
            .limit(limit),
          supabase
            .from("game_completions")
            .select("id, project_id, completed_at")
            .eq("user_id", userId)
            .order("completed_at", { ascending: false })
            .limit(limit),
          supabase
            .from("votes")
            .select("id, target_type, target_id, vote_value, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("profiles")
            .select("data")
            .eq("user_id", userId)
            .single(),
        ]);

        // Collect all project IDs
        const projectIds = new Set<string>();
        researchRes.data?.forEach((r) => projectIds.add(r.project_id));
        ideasRes.data?.forEach((i) => projectIds.add(i.project_id));
        roadmapRes.data?.forEach((r) => projectIds.add(r.project_id));
        gameCompletionsRes.data?.forEach((g) => projectIds.add(g.project_id));

        // Fetch project info
        const projectMap = new Map<string, ProjectInfo>();
        if (projectIds.size > 0) {
          const { data: projectsData } = await supabase
            .from("projects")
            .select("id, slug, data")
            .in("id", Array.from(projectIds));

          if (projectsData) {
            projectsData.forEach((p) => {
              const data = p.data as { title?: string } | null;
              projectMap.set(p.id, {
                id: p.id,
                slug: p.slug,
                title: data?.title || p.slug,
              });
            });
            setProjects(projectMap);
          }
        }

        // Transform data into activities
        const allActivities: Activity[] = [];

        // Research nodes
        researchRes.data?.forEach((r) => {
          const data = r.data as { title?: string; description?: string; url?: string } | null;
          const project = projectMap.get(r.project_id);
          allActivities.push({
            id: r.id,
            type: "research",
            createdAt: r.created_at,
            projectId: r.project_id,
            projectName: project?.title,
            projectSlug: project?.slug,
            title: data?.title || "Research",
            description: data?.description || "",
            url: data?.url,
          } as ResearchActivity);
        });

        // Ideas
        ideasRes.data?.forEach((i) => {
          const data = i.data as { description?: string } | null;
          const project = projectMap.get(i.project_id);
          allActivities.push({
            id: i.id,
            type: "idea",
            createdAt: i.created_at,
            projectId: i.project_id,
            projectName: project?.title,
            projectSlug: project?.slug,
            description: data?.description || "",
          } as IdeaActivity);
        });

        // Roadmap items
        roadmapRes.data?.forEach((r) => {
          const data = r.data as { title?: string; status?: string } | null;
          const project = projectMap.get(r.project_id);
          allActivities.push({
            id: r.id,
            type: "roadmap",
            createdAt: r.created_at,
            projectId: r.project_id,
            projectName: project?.title,
            projectSlug: project?.slug,
            title: data?.title || "Roadmap item",
            status: data?.status || "backlog",
          } as RoadmapActivity);
        });

        // Game completions (project joins)
        gameCompletionsRes.data?.forEach((g) => {
          const project = projectMap.get(g.project_id);
          allActivities.push({
            id: g.id,
            type: "project_join",
            createdAt: g.completed_at,
            projectId: g.project_id,
            projectName: project?.title,
            projectSlug: project?.slug,
          } as ProjectJoinActivity);
        });

        // Sort by date descending
        allActivities.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setActivities(allActivities.slice(0, limit));

        // Calculate stats
        const profileData = profileRes.data?.data as { xp?: number } | null;
        const newStats: UserActivityStats = {
          totalXp: profileData?.xp || 0,
          researchCount: researchRes.data?.length || 0,
          ideaCount: ideasRes.data?.length || 0,
          roadmapCount: roadmapRes.data?.length || 0,
          projectCount: gameCompletionsRes.data?.length || 0,
          voteCount: votesRes.data?.length || 0,
          profileCompletionPercent: 50,
        };
        onStatsLoaded?.(newStats);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchActivities();
    }
  }, [userId, limit, onStatsLoaded]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-[color:var(--muted)]/10 rounded-lg" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-[color:var(--muted-foreground)]">
        <Briefcase className="size-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No contributions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => (
        <ActivityRow 
          key={activity.id} 
          activity={activity} 
          projectInfo={projects.get(activity.projectId || "")}
        />
      ))}
    </div>
  );
}

/**
 * Single activity row: Project | Type | Snippet | Date
 */
function ActivityRow({ 
  activity, 
  projectInfo,
}: { 
  activity: Activity; 
  projectInfo?: ProjectInfo;
}) {
  const typeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    research: { label: "Research", icon: BookOpen, color: "text-blue-600 dark:text-blue-400" },
    idea: { label: "Idea", icon: Lightbulb, color: "text-amber-600 dark:text-amber-400" },
    roadmap: { label: "Roadmap", icon: MapIcon, color: "text-green-600 dark:text-green-400" },
    project_join: { label: "Joined", icon: Users, color: "text-purple-600 dark:text-purple-400" },
  };

  const config = typeConfig[activity.type] || typeConfig.research;
  const Icon = config.icon;

  const getSnippet = (): string => {
    switch (activity.type) {
      case "research":
        return activity.title || activity.description?.slice(0, 60) || "";
      case "idea":
        return activity.description?.slice(0, 60) || "";
      case "roadmap":
        return activity.title || "";
      case "project_join":
        return "Became a member";
      default:
        return "";
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
    });
  };

  const snippet = getSnippet();

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[color:var(--muted)]/10 transition-colors group">
      {/* Project Name */}
      <a 
        href={projectInfo ? `/projects/${projectInfo.slug}` : '#'}
        className="font-medium text-sm min-w-[100px] max-w-[140px] truncate hover:text-[color:var(--accent)] transition-colors"
        title={projectInfo?.title}
      >
        {projectInfo?.title || "Project"}
      </a>

      {/* Type Badge */}
      <div className={`flex items-center gap-1 ${config.color} text-xs font-medium min-w-[80px]`}>
        <Icon className="size-3.5" />
        <span>{config.label}</span>
      </div>

      {/* Snippet */}
      <div className="flex-1 text-sm text-[color:var(--muted-foreground)] truncate min-w-0">
        {snippet}
        {snippet.length >= 60 && "..."}
      </div>

      {/* Date */}
      <div className="text-xs text-[color:var(--muted-foreground)] whitespace-nowrap">
        {formatDate(activity.createdAt)}
      </div>
    </div>
  );
}

/**
 * Stats summary showing contribution counts
 */
export function ActivityStats({ stats }: { stats: UserActivityStats }) {
  const items = [
    { label: "Research", value: stats.researchCount, icon: BookOpen },
    { label: "Ideas", value: stats.ideaCount, icon: Lightbulb },
    { label: "Roadmap", value: stats.roadmapCount, icon: MapIcon },
    { label: "Projects", value: stats.projectCount, icon: Users },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="text-center p-2 rounded-lg bg-[color:var(--muted)]/10"
        >
          <item.icon className="size-4 mx-auto mb-1 text-[color:var(--muted-foreground)]" />
          <div className="text-lg font-semibold">{item.value}</div>
          <div className="text-xs text-[color:var(--muted-foreground)]">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
