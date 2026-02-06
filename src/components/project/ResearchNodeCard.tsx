"use client";

import { ExternalLink } from "lucide-react";
import VoteButton from "./VoteButton";
import type { ResearchNodeWithMeta } from "@/types/project";

interface ResearchNodeCardProps {
  node: ResearchNodeWithMeta;
}

export default function ResearchNodeCard({ node }: ResearchNodeCardProps) {
  return (
    <article className="card break-inside-avoid mb-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Title with optional link */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-[color:var(--foreground)] leading-tight">
            {node.title}
          </h3>
          {node.url && (
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-1.5 rounded-full hover:bg-[color:var(--muted)]/30 transition-colors text-[color:var(--accent)]"
              title="Open link"
            >
              <ExternalLink className="size-4" />
            </a>
          )}
        </div>
        
        {/* Description */}
        <p className="text-sm text-[color:var(--foreground)]/70 leading-relaxed">
          {node.description}
        </p>
        
        {/* Footer with author, date, and votes */}
        <div className="flex items-center justify-between pt-2 border-t border-divider">
          <div className="flex items-center gap-2">
            {/* Author avatar */}
            <div className="w-6 h-6 rounded-full bg-[color:var(--muted)]/40 overflow-hidden flex-shrink-0">
              {node.creator?.avatarUrl && (
                <img 
                  src={node.creator.avatarUrl} 
                  alt={node.creator.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="text-xs text-[color:var(--foreground)]/60">
              <span className="font-medium text-[color:var(--foreground)]/80">
                {node.creator?.name || "Unknown"}
              </span>
              <span className="mx-1">·</span>
              <span>
                {new Date(node.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
          
          {/* Voting */}
          <VoteButton
            targetType="research"
            targetId={node.id}
            initialUpvotes={node.votes?.upvotes || 0}
            initialDownvotes={node.votes?.downvotes || 0}
            initialUserVote={node.userVote || 0}
          />
        </div>
      </div>
    </article>
  );
}
