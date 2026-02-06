"use client";

import { useState, useEffect } from "react";
import { Plus, Lightbulb } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import IdeaCard from "./IdeaCard";
import AddIdeaModal from "./AddIdeaModal";
import type { Idea, IdeaRow, AuthorInfo, VoteCounts } from "@/types/project";

interface IdeasGridProps {
  projectId: string;
}

export default function IdeasGrid({ projectId }: IdeasGridProps) {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    async function fetchIdeas() {
      try {
        // Fetch ideas
        const { data: ideasData, error: ideasError } = await supabase
          .from("ideas")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        
        if (ideasError) throw ideasError;
        if (!ideasData || ideasData.length === 0) {
          setIdeas([]);
          setLoading(false);
          return;
        }

        const rows = ideasData as IdeaRow[];
        const creatorIds = [...new Set(rows.map(r => r.creator_id))];
        const ideaIds = rows.map(r => r.id);

        // Fetch creator profiles
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, data")
          .in("user_id", creatorIds);

        const profileMap = new Map<string, AuthorInfo>();
        profilesData?.forEach(p => {
          const data = p.data as Record<string, unknown>;
          profileMap.set(p.user_id, {
            id: p.user_id,
            name: (data.displayName as string) || (data.username as string) || "Unknown",
            avatarUrl: data.avatarUrl as string | undefined,
          });
        });

        // Fetch votes for all ideas
        const { data: votesData } = await supabase
          .from("votes")
          .select("target_id, vote_value")
          .eq("target_type", "idea")
          .in("target_id", ideaIds);

        // Fetch user's votes
        const userVotesMap = new Map<string, number>();
        if (user) {
          const { data: userVotes } = await supabase
            .from("votes")
            .select("target_id, vote_value")
            .eq("target_type", "idea")
            .eq("user_id", user.id)
            .in("target_id", ideaIds);
          
          userVotes?.forEach(v => {
            userVotesMap.set(v.target_id, v.vote_value);
          });
        }

        // Aggregate votes per idea
        const voteCountsMap = new Map<string, VoteCounts>();
        ideaIds.forEach(id => {
          voteCountsMap.set(id, { upvotes: 0, downvotes: 0, total: 0 });
        });
        votesData?.forEach(v => {
          const counts = voteCountsMap.get(v.target_id);
          if (counts) {
            if (v.vote_value === 1) counts.upvotes++;
            else if (v.vote_value === -1) counts.downvotes++;
            counts.total = counts.upvotes - counts.downvotes;
          }
        });

        // Map to Idea with metadata
        const mapped: Idea[] = rows.map((row) => ({
          id: row.id,
          projectId: row.project_id,
          creatorId: row.creator_id,
          description: row.data.description,
          createdAt: row.created_at,
          creator: profileMap.get(row.creator_id),
          votes: voteCountsMap.get(row.id),
          userVote: userVotesMap.get(row.id) || 0,
        }));
        
        setIdeas(mapped);
      } catch (err) {
        console.error("Error fetching ideas:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchIdeas();
  }, [projectId, user]);

  const handleAddIdea = async (data: { description: string }) => {
    if (!user) throw new Error("Not authenticated");
    
    const { data: newIdea, error } = await supabase
      .from("ideas")
      .insert({
        project_id: projectId,
        creator_id: user.id,
        data: {
          description: data.description,
        },
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Fetch current user's profile for display
    const { data: profileData } = await supabase
      .from("profiles")
      .select("data")
      .eq("user_id", user.id)
      .single();
    
    const pData = profileData?.data as Record<string, unknown> | undefined;
    
    const row = newIdea as IdeaRow;
    const mapped: Idea = {
      id: row.id,
      projectId: row.project_id,
      creatorId: row.creator_id,
      description: row.data.description,
      createdAt: row.created_at,
      creator: {
        id: user.id,
        name: (pData?.displayName as string) || (pData?.username as string) || "You",
        avatarUrl: pData?.avatarUrl as string | undefined,
      },
      votes: { upvotes: 0, downvotes: 0, total: 0 },
      userVote: 0,
    };
    
    setIdeas((prev) => [mapped, ...prev]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--accent)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Ideas</h2>
          <p className="text-sm text-[color:var(--foreground)]/60 mt-1">
            {ideas.length} {ideas.length === 1 ? "idea" : "ideas"} shared
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          Share Idea
        </button>
      </div>
      
      {/* Masonry grid */}
      {ideas.length > 0 ? (
        <div 
          className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4"
          style={{ columnFill: "balance" }}
        >
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[color:var(--muted)]/20 flex items-center justify-center mb-4">
            <Lightbulb className="size-8 text-[color:var(--foreground)]/40" />
          </div>
          <h3 className="text-lg font-medium mb-2">No ideas yet</h3>
          <p className="text-sm text-[color:var(--foreground)]/60 max-w-sm mb-6">
            Be the first to share an idea! Your thoughts could spark the next breakthrough for this project.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            Share First Idea
          </button>
        </div>
      )}
      
      {/* Add modal */}
      <AddIdeaModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddIdea}
      />
    </div>
  );
}
