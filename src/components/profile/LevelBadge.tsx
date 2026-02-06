"use client";

import { calculateLevel, getLevelTitle } from "@/types/gamification";

interface LevelBadgeProps {
  xp: number;
  size?: "sm" | "md" | "lg";
  showTitle?: boolean;
}

/**
 * Displays user level as a badge with optional title
 */
export function LevelBadge({ xp, size = "md", showTitle = true }: LevelBadgeProps) {
  const level = calculateLevel(xp);
  const title = getLevelTitle(level);

  const sizeClasses = {
    sm: "h-6 min-w-6 text-xs",
    md: "h-8 min-w-8 text-sm",
    lg: "h-10 min-w-10 text-base",
  };

  const levelColors: Record<number, string> = {
    1: "from-stone-400 to-stone-500",
    2: "from-stone-500 to-stone-600",
    3: "from-emerald-400 to-emerald-600",
    4: "from-emerald-500 to-emerald-700",
    5: "from-blue-400 to-blue-600",
    6: "from-blue-500 to-blue-700",
    7: "from-purple-400 to-purple-600",
    8: "from-purple-500 to-purple-700",
    9: "from-amber-400 to-amber-600",
    10: "from-amber-500 to-orange-600",
    11: "from-rose-400 to-rose-600",
    12: "from-rose-500 to-rose-700",
  };

  const gradient = levelColors[level] || levelColors[1];

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`
          ${sizeClasses[size]}
          px-2 rounded-full
          bg-gradient-to-br ${gradient}
          text-white font-bold
          inline-flex items-center justify-center
          shadow-sm
        `}
      >
        {level}
      </div>
      {showTitle && (
        <span className="text-sm font-medium text-[color:var(--foreground)]">
          {title}
        </span>
      )}
    </div>
  );
}

/**
 * Compact level indicator for use in lists/cards
 */
export function LevelIndicator({ xp }: { xp: number }) {
  const level = calculateLevel(xp);

  return (
    <span
      className="
        inline-flex items-center justify-center
        h-5 w-5 rounded-full
        bg-[color:var(--accent)] text-[color:var(--background)]
        text-xs font-bold
      "
      title={`Level ${level}`}
    >
      {level}
    </span>
  );
}
