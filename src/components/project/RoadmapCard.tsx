"use client";

import VoteButton from "./VoteButton";
import type { RoadmapItem } from "@/types/project";

interface RoadmapCardProps {
  item: RoadmapItem;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function RoadmapCard({ item }: RoadmapCardProps) {
  return (
    <article className="bg-[color:var(--background)] rounded-xl border border-divider p-3 hover:shadow-md transition-shadow">
      <div className="space-y-2">
        {/* Title */}
        <h4 className="font-medium text-sm text-[color:var(--foreground)] leading-snug">
          {item.title}
        </h4>
        
        {/* Description (if exists) */}
        {item.description && (
          <p className="text-xs text-[color:var(--foreground)]/60 line-clamp-2">
            {item.description}
          </p>
        )}
        
        {/* Footer with priority, author, and votes */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {/* Priority badge */}
            {item.priority && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityColors[item.priority]}`}>
                {item.priority}
              </span>
            )}
            
            {/* Author avatar */}
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
              <span className="text-[10px] text-[color:var(--foreground)]/50 truncate max-w-[60px]">
                {item.creator?.name || "Unknown"}
              </span>
            </div>
          </div>
          
          {/* Voting */}
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
  );
}
