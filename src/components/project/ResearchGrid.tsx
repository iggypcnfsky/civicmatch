"use client";

import { useState, useEffect } from "react";
import { Plus, FileSearch } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import ResearchNodeCard from "./ResearchNodeCard";
import AddResearchModal from "./AddResearchModal";
import type { ResearchNodeWithMeta, ResearchNodeRow, AuthorInfo, VoteCounts } from "@/types/project";

interface ResearchGridProps {
  projectId: string;
}

export default function ResearchGrid({ projectId }: ResearchGridProps) {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<ResearchNodeWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    async function fetchNodes() {
      try {
        // Fetch research nodes
        const { data: nodesData, error: nodesError } = await supabase
          .from("research_nodes")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        
        if (nodesError) throw nodesError;
        if (!nodesData || nodesData.length === 0) {
          setNodes([]);
          setLoading(false);
          return;
        }

        const rows = nodesData as ResearchNodeRow[];
        const creatorIds = [...new Set(rows.map(r => r.creator_id))];
        const nodeIds = rows.map(r => r.id);

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

        // Fetch votes for all nodes
        const { data: votesData } = await supabase
          .from("votes")
          .select("target_id, vote_value")
          .eq("target_type", "research")
          .in("target_id", nodeIds);

        // Fetch user's votes
        const userVotesMap = new Map<string, number>();
        if (user) {
          const { data: userVotes } = await supabase
            .from("votes")
            .select("target_id, vote_value")
            .eq("target_type", "research")
            .eq("user_id", user.id)
            .in("target_id", nodeIds);
          
          userVotes?.forEach(v => {
            userVotesMap.set(v.target_id, v.vote_value);
          });
        }

        // Aggregate votes per node
        const voteCountsMap = new Map<string, VoteCounts>();
        nodeIds.forEach(id => {
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

        // Map to ResearchNodeWithMeta
        const mapped: ResearchNodeWithMeta[] = rows.map((row) => ({
          id: row.id,
          projectId: row.project_id,
          creatorId: row.creator_id,
          title: row.data.title,
          description: row.data.description,
          url: row.data.url,
          createdAt: row.created_at,
          creator: profileMap.get(row.creator_id),
          votes: voteCountsMap.get(row.id),
          userVote: userVotesMap.get(row.id) || 0,
        }));
        
        setNodes(mapped);
      } catch (err) {
        console.error("Error fetching research nodes:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchNodes();
  }, [projectId, user]);

  const handleAddNode = async (data: { title: string; description: string; url?: string }) => {
    if (!user) throw new Error("Not authenticated");
    
    const { data: newNode, error } = await supabase
      .from("research_nodes")
      .insert({
        project_id: projectId,
        creator_id: user.id,
        data: {
          title: data.title,
          description: data.description,
          url: data.url,
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
    
    const row = newNode as ResearchNodeRow;
    const mapped: ResearchNodeWithMeta = {
      id: row.id,
      projectId: row.project_id,
      creatorId: row.creator_id,
      title: row.data.title,
      description: row.data.description,
      url: row.data.url,
      createdAt: row.created_at,
      creator: {
        id: user.id,
        name: (pData?.displayName as string) || (pData?.username as string) || "You",
        avatarUrl: pData?.avatarUrl as string | undefined,
      },
      votes: { upvotes: 0, downvotes: 0, total: 0 },
      userVote: 0,
    };
    
    setNodes((prev) => [mapped, ...prev]);
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
          <h2 className="text-xl font-medium">Research</h2>
          <p className="text-sm text-[color:var(--foreground)]/60 mt-1">
            {nodes.length} {nodes.length === 1 ? "item" : "items"}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          Add Research
        </button>
      </div>
      
      {/* Masonry grid */}
      {nodes.length > 0 ? (
        <div 
          className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4"
          style={{ columnFill: "balance" }}
        >
          {nodes.map((node) => (
            <ResearchNodeCard key={node.id} node={node} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[color:var(--muted)]/20 flex items-center justify-center mb-4">
            <FileSearch className="size-8 text-[color:var(--foreground)]/40" />
          </div>
          <h3 className="text-lg font-medium mb-2">No research yet</h3>
          <p className="text-sm text-[color:var(--foreground)]/60 max-w-sm mb-6">
            Start building your project&apos;s knowledge base by adding research articles, links, and notes.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            Add First Research
          </button>
        </div>
      )}
      
      {/* Add modal */}
      <AddResearchModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddNode}
      />
    </div>
  );
}
