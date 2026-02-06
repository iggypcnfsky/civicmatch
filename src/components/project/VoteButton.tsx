"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface VoteButtonProps {
  targetType: 'idea' | 'research' | 'roadmap';
  targetId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote: number; // -1, 0, or 1
}

export default function VoteButton({
  targetType,
  targetId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote,
}: VoteButtonProps) {
  const { user } = useAuth();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [loading, setLoading] = useState(false);

  const handleVote = async (value: 1 | -1) => {
    if (!user || loading) return;
    
    setLoading(true);
    
    try {
      const newVote = userVote === value ? 0 : value; // Toggle off if same vote
      
      if (newVote === 0) {
        // Remove vote
        await supabase
          .from("votes")
          .delete()
          .eq("user_id", user.id)
          .eq("target_type", targetType)
          .eq("target_id", targetId);
      } else if (userVote === 0) {
        // Insert new vote
        await supabase
          .from("votes")
          .insert({
            user_id: user.id,
            target_type: targetType,
            target_id: targetId,
            vote_value: newVote,
          });
      } else {
        // Update existing vote
        await supabase
          .from("votes")
          .update({ vote_value: newVote })
          .eq("user_id", user.id)
          .eq("target_type", targetType)
          .eq("target_id", targetId);
      }
      
      // Update local state optimistically
      const oldVote = userVote;
      setUserVote(newVote);
      
      // Adjust counts based on vote change
      if (oldVote === 1) setUpvotes(u => u - 1);
      if (oldVote === -1) setDownvotes(d => d - 1);
      if (newVote === 1) setUpvotes(u => u + 1);
      if (newVote === -1) setDownvotes(d => d + 1);
      
    } catch (err) {
      console.error("Error voting:", err);
    } finally {
      setLoading(false);
    }
  };

  const total = upvotes - downvotes;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        disabled={loading || !user}
        className={`p-1 rounded transition-colors ${
          userVote === 1 
            ? 'text-green-500 bg-green-500/10' 
            : 'text-[color:var(--foreground)]/50 hover:text-green-500 hover:bg-green-500/10'
        } disabled:opacity-50`}
        title="Upvote"
      >
        <ChevronUp className="size-4" />
      </button>
      
      <span className={`text-xs font-medium min-w-[20px] text-center ${
        total > 0 ? 'text-green-500' : total < 0 ? 'text-red-500' : 'text-[color:var(--foreground)]/50'
      }`}>
        {total}
      </span>
      
      <button
        onClick={() => handleVote(-1)}
        disabled={loading || !user}
        className={`p-1 rounded transition-colors ${
          userVote === -1 
            ? 'text-red-500 bg-red-500/10' 
            : 'text-[color:var(--foreground)]/50 hover:text-red-500 hover:bg-red-500/10'
        } disabled:opacity-50`}
        title="Downvote"
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  );
}
