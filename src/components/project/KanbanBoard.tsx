"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Map as MapIcon, GripVertical } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import AddRoadmapItemModal from "./AddRoadmapItemModal";
import VoteButton from "./VoteButton";
import type { 
  RoadmapItem, 
  RoadmapItemRow, 
  RoadmapStatus, 
  AuthorInfo, 
  VoteCounts,
} from "@/types/project";

const COLUMNS: { id: RoadmapStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'var(--foreground)' },
  { id: 'planned', label: 'Planned', color: '#3B82F6' },
  { id: 'in_progress', label: 'In Progress', color: '#F59E0B' },
  { id: 'done', label: 'Done', color: '#10B981' },
];

const priorityColors = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

interface KanbanBoardProps {
  projectId: string;
}

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addToColumn, setAddToColumn] = useState<RoadmapStatus>('backlog');
  const [draggedItem, setDraggedItem] = useState<RoadmapItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<RoadmapStatus | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from("roadmap_items")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true });
        
        if (itemsError) throw itemsError;
        if (!itemsData || itemsData.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        const rows = itemsData as RoadmapItemRow[];
        const creatorIds = [...new Set(rows.map(r => r.creator_id))];
        const itemIds = rows.map(r => r.id);

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

        const { data: votesData } = await supabase
          .from("votes")
          .select("target_id, vote_value")
          .eq("target_type", "roadmap")
          .in("target_id", itemIds);

        const userVotesMap = new Map<string, number>();
        if (user) {
          const { data: userVotes } = await supabase
            .from("votes")
            .select("target_id, vote_value")
            .eq("target_type", "roadmap")
            .eq("user_id", user.id)
            .in("target_id", itemIds);
          
          userVotes?.forEach(v => {
            userVotesMap.set(v.target_id, v.vote_value);
          });
        }

        const voteCountsMap = new Map<string, VoteCounts>();
        itemIds.forEach(id => {
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

        const mapped: RoadmapItem[] = rows.map((row) => ({
          id: row.id,
          projectId: row.project_id,
          creatorId: row.creator_id,
          title: row.data.title,
          description: row.data.description,
          status: row.data.status,
          priority: row.data.priority,
          order: row.data.order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          creator: profileMap.get(row.creator_id),
          votes: voteCountsMap.get(row.id),
          userVote: userVotesMap.get(row.id) || 0,
        }));
        
        setItems(mapped);
      } catch (err) {
        console.error("Error fetching roadmap items:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchItems();
  }, [projectId, user]);

  const handleAddItem = async (data: { 
    title: string; 
    description?: string; 
    status: RoadmapStatus;
    priority?: 'low' | 'medium' | 'high';
  }) => {
    if (!user) throw new Error("Not authenticated");
    
    const { data: newItem, error } = await supabase
      .from("roadmap_items")
      .insert({
        project_id: projectId,
        creator_id: user.id,
        data: {
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
        },
      })
      .select()
      .single();
    
    if (error) throw error;
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("data")
      .eq("user_id", user.id)
      .single();
    
    const pData = profileData?.data as Record<string, unknown> | undefined;
    
    const row = newItem as RoadmapItemRow;
    const mapped: RoadmapItem = {
      id: row.id,
      projectId: row.project_id,
      creatorId: row.creator_id,
      title: row.data.title,
      description: row.data.description,
      status: row.data.status,
      priority: row.data.priority,
      order: row.data.order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      creator: {
        id: user.id,
        name: (pData?.displayName as string) || (pData?.username as string) || "You",
        avatarUrl: pData?.avatarUrl as string | undefined,
      },
      votes: { upvotes: 0, downvotes: 0, total: 0 },
      userVote: 0,
    };
    
    setItems((prev) => [...prev, mapped]);
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, item: RoadmapItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    // Add dragging class after a tick to allow the drag image to be captured
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('opacity-50');
    }, 0);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('opacity-50');
    setDraggedItem(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: RoadmapStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: RoadmapStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedItem || draggedItem.status === newStatus) {
      setDraggedItem(null);
      return;
    }

    // Optimistically update local state
    setItems(prev => prev.map(item => 
      item.id === draggedItem.id 
        ? { ...item, status: newStatus }
        : item
    ));

    // Update in database
    try {
      const { error } = await supabase
        .from("roadmap_items")
        .update({
          data: {
            ...{
              title: draggedItem.title,
              description: draggedItem.description,
              priority: draggedItem.priority,
              order: draggedItem.order,
            },
            status: newStatus,
          }
        })
        .eq("id", draggedItem.id);

      if (error) {
        // Revert on error
        setItems(prev => prev.map(item => 
          item.id === draggedItem.id 
            ? { ...item, status: draggedItem.status }
            : item
        ));
        console.error("Error updating item status:", error);
      }
    } catch (err) {
      // Revert on error
      setItems(prev => prev.map(item => 
        item.id === draggedItem.id 
          ? { ...item, status: draggedItem.status }
          : item
      ));
      console.error("Error updating item status:", err);
    }
    
    setDraggedItem(null);
  }, [draggedItem]);

  const openAddModal = (status: RoadmapStatus) => {
    setAddToColumn(status);
    setShowAddModal(true);
  };

  // Group items by status
  const itemsByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = items
      .filter(item => item.status === col.id)
      .sort((a, b) => (b.votes?.total || 0) - (a.votes?.total || 0));
    return acc;
  }, {} as Record<RoadmapStatus, RoadmapItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--accent)]"></div>
      </div>
    );
  }

  const totalItems = items.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Roadmap</h2>
          <p className="text-sm text-[color:var(--foreground)]/60 mt-1">
            {totalItems} {totalItems === 1 ? "item" : "items"} · Drag to reorder
          </p>
        </div>
        <button
          onClick={() => openAddModal('backlog')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          Add Item
        </button>
      </div>
      
      {/* Kanban Board */}
      {totalItems > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map((column) => (
            <div 
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`
                bg-[color:var(--muted)]/10 rounded-2xl p-3 min-h-[300px] transition-colors
                ${dragOverColumn === column.id ? 'bg-[color:var(--accent)]/10 ring-2 ring-[color:var(--accent)]/30' : ''}
              `}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="font-medium text-sm">{column.label}</h3>
                  <span className="text-xs text-[color:var(--foreground)]/50 bg-[color:var(--muted)]/30 px-1.5 py-0.5 rounded-full">
                    {itemsByStatus[column.id].length}
                  </span>
                </div>
                <button
                  onClick={() => openAddModal(column.id)}
                  className="p-1 rounded hover:bg-[color:var(--muted)]/30 transition-colors text-[color:var(--foreground)]/50 hover:text-[color:var(--foreground)]"
                  title={`Add to ${column.label}`}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              
              {/* Column items */}
              <div className="space-y-2">
                {itemsByStatus[column.id].map((item) => (
                  <article 
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                    className="bg-[color:var(--background)] rounded-xl border border-divider p-3 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                  >
                    <div className="space-y-2">
                      {/* Drag handle and title */}
                      <div className="flex items-start gap-2">
                        <GripVertical className="size-4 text-[color:var(--foreground)]/30 flex-shrink-0 mt-0.5" />
                        <h4 className="font-medium text-sm text-[color:var(--foreground)] leading-snug flex-1">
                          {item.title}
                        </h4>
                      </div>
                      
                      {/* Description */}
                      {item.description && (
                        <p className="text-xs text-[color:var(--foreground)]/60 line-clamp-2 pl-6">
                          {item.description}
                        </p>
                      )}
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 pl-6">
                        <div className="flex items-center gap-2">
                          {item.priority && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityColors[item.priority]}`}>
                              {item.priority}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <div className="w-5 h-5 rounded-full bg-[color:var(--muted)]/40 overflow-hidden flex-shrink-0">
                              {item.creator?.avatarUrl && (
                                <img 
                                  src={item.creator.avatarUrl} 
                                  alt={item.creator.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <VoteButton
                          targetType="roadmap"
                          targetId={item.id}
                          initialUpvotes={item.votes?.upvotes || 0}
                          initialDownvotes={item.votes?.downvotes || 0}
                          initialUserVote={item.userVote || 0}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[color:var(--muted)]/20 flex items-center justify-center mb-4">
            <MapIcon className="size-8 text-[color:var(--foreground)]/40" />
          </div>
          <h3 className="text-lg font-medium mb-2">No roadmap items yet</h3>
          <p className="text-sm text-[color:var(--foreground)]/60 max-w-sm mb-6">
            Start planning your project&apos;s future by adding items to the roadmap. 
            Members can vote to help prioritize what matters most.
          </p>
          <button
            onClick={() => openAddModal('backlog')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            Add First Item
          </button>
        </div>
      )}
      
      {/* Add modal */}
      <AddRoadmapItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItem}
        defaultStatus={addToColumn}
      />
    </div>
  );
}
