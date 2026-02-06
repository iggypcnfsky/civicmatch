"use client";

import { 
  BadgeId, 
  BADGES, 
  BADGE_RARITY_COLORS,
  calculateEarnedBadges,
  UserActivityStats
} from "@/types/gamification";
import {
  Footprints,
  BookOpen,
  Lightbulb,
  Users,
  Vote,
  GraduationCap,
  Sparkles,
  Map as MapIcon,
  Layers,
  Award,
  Lock,
} from "lucide-react";

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Footprints,
  BookOpen,
  Lightbulb,
  Users,
  Vote,
  GraduationCap,
  Sparkles,
  Map: MapIcon,
  Layers,
  Award,
};

interface BadgesDisplayProps {
  stats: UserActivityStats;
  showLocked?: boolean;
  compact?: boolean;
}

/**
 * Displays earned badges with optional locked badges shown
 */
export function BadgesDisplay({ stats, showLocked = true, compact = false }: BadgesDisplayProps) {
  const earnedBadgeIds = calculateEarnedBadges(stats);
  const allBadgeIds = Object.keys(BADGES) as BadgeId[];

  if (compact) {
    // Compact view - just show earned badge icons
    return (
      <div className="flex flex-wrap gap-2">
        {earnedBadgeIds.map((badgeId) => {
          const badge = BADGES[badgeId];
          const Icon = BADGE_ICONS[badge.icon] || Award;
          return (
            <div
              key={badgeId}
              className={`
                h-8 w-8 rounded-full flex items-center justify-center
                ${BADGE_RARITY_COLORS[badge.rarity]}
              `}
              title={badge.name}
            >
              <Icon className="size-4" />
            </div>
          );
        })}
        {earnedBadgeIds.length === 0 && (
          <span className="text-sm text-[color:var(--muted-foreground)] italic">
            No badges earned yet
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between border-b border-divider pb-3">
        <div className="flex items-center gap-2">
          <Award className="size-4 text-[color:var(--accent)]" />
          <h3 className="font-semibold">Achievements</h3>
        </div>
        <span className="text-sm text-[color:var(--muted-foreground)]">
          {earnedBadgeIds.length}/{allBadgeIds.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {allBadgeIds.map((badgeId) => {
          const badge = BADGES[badgeId];
          const isEarned = earnedBadgeIds.includes(badgeId);
          const Icon = BADGE_ICONS[badge.icon] || Award;

          if (!isEarned && !showLocked) return null;

          return (
            <div
              key={badgeId}
              className={`
                relative p-3 rounded-xl border transition-all
                ${isEarned 
                  ? `${BADGE_RARITY_COLORS[badge.rarity]} border-transparent` 
                  : 'bg-[color:var(--muted)]/10 border-divider opacity-50'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                {isEarned ? (
                  <Icon className="size-5" />
                ) : (
                  <Lock className="size-5 opacity-50" />
                )}
                <span className="text-xs font-medium truncate">{badge.name}</span>
              </div>
              <p className="text-xs opacity-70 line-clamp-2">
                {isEarned ? badge.description : badge.requirement}
              </p>
              
              {/* Rarity indicator */}
              {isEarned && (
                <div className="absolute top-1 right-1">
                  <span className={`
                    inline-block h-2 w-2 rounded-full
                    ${badge.rarity === 'common' ? 'bg-stone-400' : ''}
                    ${badge.rarity === 'uncommon' ? 'bg-green-400' : ''}
                    ${badge.rarity === 'rare' ? 'bg-blue-400' : ''}
                    ${badge.rarity === 'epic' ? 'bg-purple-400' : ''}
                    ${badge.rarity === 'legendary' ? 'bg-amber-400' : ''}
                  `} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Single badge display for highlighting
 */
export function BadgeChip({ badgeId }: { badgeId: BadgeId }) {
  const badge = BADGES[badgeId];
  const Icon = BADGE_ICONS[badge.icon] || Award;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${BADGE_RARITY_COLORS[badge.rarity]}
      `}
    >
      <Icon className="size-3.5" />
      {badge.name}
    </div>
  );
}

/**
 * Badge progress indicator showing how close to earning
 */
export function BadgeProgress({ 
  badgeId, 
  currentValue, 
  targetValue 
}: { 
  badgeId: BadgeId; 
  currentValue: number; 
  targetValue: number;
}) {
  const badge = BADGES[badgeId];
  const Icon = BADGE_ICONS[badge.icon] || Award;
  const progress = Math.min(100, Math.round((currentValue / targetValue) * 100));
  const isComplete = currentValue >= targetValue;

  return (
    <div className={`
      p-3 rounded-xl border
      ${isComplete 
        ? BADGE_RARITY_COLORS[badge.rarity] 
        : 'bg-[color:var(--muted)]/10 border-divider'
      }
    `}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`size-5 ${isComplete ? '' : 'opacity-50'}`} />
        <span className="text-sm font-medium">{badge.name}</span>
      </div>
      
      {!isComplete && (
        <>
          <div className="h-1.5 bg-[color:var(--muted)]/30 rounded-full overflow-hidden mb-1">
            <div
              className="h-full bg-[color:var(--accent)] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-[color:var(--muted-foreground)]">
            {currentValue}/{targetValue}
          </div>
        </>
      )}
    </div>
  );
}
