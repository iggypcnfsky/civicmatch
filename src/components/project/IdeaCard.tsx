"use client";

import VoteButton from "./VoteButton";
import type { Idea } from "@/types/project";

interface IdeaCardProps {
  idea: Idea;
}

export default function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <article className="card break-inside-avoid mb-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Description (main content) */}
        <p className="text-[color:var(--foreground)] leading-relaxed">
          {idea.description}
        </p>
        
        {/* Footer with author, date, and votes */}
        <div className="flex items-center justify-between pt-3 border-t border-divider">
          <div className="flex items-center gap-2">
            {/* Author avatar */}
            <div className="w-6 h-6 rounded-full bg-[color:var(--muted)]/40 overflow-hidden flex-shrink-0">
              {idea.creator?.avatarUrl && (
                <img 
                  src={idea.creator.avatarUrl} 
                  alt={idea.creator.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="text-xs text-[color:var(--foreground)]/60">
              <span className="font-medium text-[color:var(--foreground)]/80">
                {idea.creator?.name || "Unknown"}
              </span>
              <span className="mx-1">·</span>
              <span>
                {new Date(idea.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
          
          {/* Voting */}
          <VoteButton
            targetType="idea"
            targetId={idea.id}
            initialUpvotes={idea.votes?.upvotes || 0}
            initialDownvotes={idea.votes?.downvotes || 0}
            initialUserVote={idea.userVote || 0}
          />
        </div>
      </div>
    </article>
  );
}
