"use client";

import { getLevelProgress, getLevelTitle, calculateLevel } from "@/types/gamification";
import { Zap, TrendingUp } from "lucide-react";

interface ExperienceMeterProps {
  xp: number;
  showDetails?: boolean;
  compact?: boolean;
  animate?: boolean;
}

/**
 * Displays user XP progress with level and progress bar
 */
export function ExperienceMeter({ 
  xp, 
  showDetails = true, 
  compact = false,
  animate = true 
}: ExperienceMeterProps) {
  const progress = getLevelProgress(xp);
  const title = getLevelTitle(progress.currentLevel);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Zap className="size-4 text-[color:var(--accent)]" />
          <span className="font-semibold">{xp.toLocaleString()} XP</span>
        </div>
        <div className="text-sm opacity-70">Level {progress.currentLevel}</div>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[color:var(--accent)] to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            {progress.currentLevel}
          </div>
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-[color:var(--muted-foreground)]">
              Level {progress.currentLevel}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-[color:var(--accent)] font-semibold">
            <Zap className="size-4" />
            {xp.toLocaleString()}
          </div>
          <div className="text-xs text-[color:var(--muted-foreground)]">Total XP</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 bg-[color:var(--muted)]/30 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r from-[color:var(--accent)] to-orange-500 rounded-full ${
              animate ? "transition-all duration-1000 ease-out" : ""
            }`}
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[color:var(--muted-foreground)]">
          <span>{progress.progressXp.toLocaleString()} XP</span>
          <span>{progress.nextLevelXp.toLocaleString()} XP to Level {progress.currentLevel + 1}</span>
        </div>
      </div>

      {/* Stats breakdown */}
      {showDetails && (
        <div className="pt-2 border-t border-divider">
          <div className="flex items-center gap-2 text-sm text-[color:var(--muted-foreground)]">
            <TrendingUp className="size-4" />
            <span>
              {progress.nextLevelXp - xp} XP until next level
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Mini XP display for headers/cards
 */
export function XPBadge({ xp }: { xp: number }) {
  const level = calculateLevel(xp);
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[color:var(--accent)]/10 border border-[color:var(--accent)]/20">
      <span className="h-5 w-5 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] text-xs font-bold flex items-center justify-center">
        {level}
      </span>
      <span className="text-sm font-medium">
        {xp.toLocaleString()} XP
      </span>
    </div>
  );
}
