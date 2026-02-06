/**
 * Gamification System Types
 * 
 * Defines interfaces for XP, levels, badges, and activity tracking
 * used across the CivicMatch platform for the profile CV system.
 */

// ============================================================================
// XP & Levels
// ============================================================================

/**
 * XP rewards for different actions
 */
export const XP_REWARDS = {
  RESEARCH_NODE: 15,
  IDEA: 10,
  ROADMAP_ITEM: 10,
  VOTE: 1,
  GAME_COMPLETION: 25,
  PROFILE_COMPLETE: 50,
} as const;

/**
 * Level thresholds (cumulative XP required)
 * Logarithmic scaling: Level 1 = 0, Level 2 = 100, Level 3 = 300, etc.
 */
export const LEVEL_THRESHOLDS: number[] = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  700,    // Level 4
  1300,   // Level 5
  2100,   // Level 6
  3100,   // Level 7
  4300,   // Level 8
  5700,   // Level 9
  7300,   // Level 10
  9100,   // Level 11
  11100,  // Level 12
];

/**
 * Calculate user level from total XP
 */
export function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Get XP progress within current level
 */
export function getLevelProgress(xp: number): {
  currentLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressXp: number;
  progressPercent: number;
} {
  const level = calculateLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 2000;
  
  const progressXp = xp - currentThreshold;
  const levelRange = nextThreshold - currentThreshold;
  const progressPercent = Math.min(100, Math.round((progressXp / levelRange) * 100));

  return {
    currentLevel: level,
    currentLevelXp: currentThreshold,
    nextLevelXp: nextThreshold,
    progressXp,
    progressPercent,
  };
}

/**
 * Get level title based on level number
 */
export function getLevelTitle(level: number): string {
  const titles: Record<number, string> = {
    1: 'Newcomer',
    2: 'Explorer',
    3: 'Contributor',
    4: 'Collaborator',
    5: 'Builder',
    6: 'Leader',
    7: 'Innovator',
    8: 'Champion',
    9: 'Visionary',
    10: 'Pioneer',
    11: 'Legend',
    12: 'Civic Hero',
  };
  return titles[level] || `Level ${level}`;
}

// ============================================================================
// Badges / Achievements
// ============================================================================

export type BadgeId = 
  | 'first_steps'
  | 'researcher'
  | 'ideator'
  | 'team_player'
  | 'voter'
  | 'prolific_researcher'
  | 'visionary'
  | 'roadmap_planner'
  | 'multi_project'
  | 'century';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  requirement: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export const BADGES: Record<BadgeId, Badge> = {
  first_steps: {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your profile to at least 50%',
    icon: 'Footprints',
    requirement: 'Profile completion ≥ 50%',
    rarity: 'common',
  },
  researcher: {
    id: 'researcher',
    name: 'Researcher',
    description: 'Submit your first research node',
    icon: 'BookOpen',
    requirement: '1 research node',
    rarity: 'common',
  },
  ideator: {
    id: 'ideator',
    name: 'Ideator',
    description: 'Submit your first idea',
    icon: 'Lightbulb',
    requirement: '1 idea',
    rarity: 'common',
  },
  team_player: {
    id: 'team_player',
    name: 'Team Player',
    description: 'Join your first project',
    icon: 'Users',
    requirement: '1 project joined',
    rarity: 'common',
  },
  voter: {
    id: 'voter',
    name: 'Active Voter',
    description: 'Cast 10 votes on ideas or research',
    icon: 'Vote',
    requirement: '10 votes cast',
    rarity: 'uncommon',
  },
  prolific_researcher: {
    id: 'prolific_researcher',
    name: 'Prolific Researcher',
    description: 'Submit 5 or more research nodes',
    icon: 'GraduationCap',
    requirement: '5+ research nodes',
    rarity: 'rare',
  },
  visionary: {
    id: 'visionary',
    name: 'Visionary',
    description: 'Submit 10 or more ideas',
    icon: 'Sparkles',
    requirement: '10+ ideas',
    rarity: 'rare',
  },
  roadmap_planner: {
    id: 'roadmap_planner',
    name: 'Roadmap Planner',
    description: 'Create 5 or more roadmap items',
    icon: 'Map',
    requirement: '5+ roadmap items',
    rarity: 'uncommon',
  },
  multi_project: {
    id: 'multi_project',
    name: 'Multi-Project',
    description: 'Join 3 or more projects',
    icon: 'Layers',
    requirement: '3+ projects joined',
    rarity: 'rare',
  },
  century: {
    id: 'century',
    name: 'Century',
    description: 'Reach 100 total XP',
    icon: 'Award',
    requirement: '100+ XP',
    rarity: 'uncommon',
  },
};

export const BADGE_RARITY_COLORS: Record<Badge['rarity'], string> = {
  common: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  uncommon: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  epic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  legendary: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
};

/**
 * Calculate which badges a user has earned based on their stats
 */
export function calculateEarnedBadges(stats: UserActivityStats): BadgeId[] {
  const earned: BadgeId[] = [];

  if (stats.profileCompletionPercent >= 50) earned.push('first_steps');
  if (stats.researchCount >= 1) earned.push('researcher');
  if (stats.ideaCount >= 1) earned.push('ideator');
  if (stats.projectCount >= 1) earned.push('team_player');
  if (stats.voteCount >= 10) earned.push('voter');
  if (stats.researchCount >= 5) earned.push('prolific_researcher');
  if (stats.ideaCount >= 10) earned.push('visionary');
  if (stats.roadmapCount >= 5) earned.push('roadmap_planner');
  if (stats.projectCount >= 3) earned.push('multi_project');
  if (stats.totalXp >= 100) earned.push('century');

  return earned;
}

// ============================================================================
// Activity Types (for CV Timeline)
// ============================================================================

export type ActivityType = 
  | 'research'
  | 'idea'
  | 'roadmap'
  | 'project_join'
  | 'vote';

export interface BaseActivity {
  id: string;
  type: ActivityType;
  createdAt: string;
  projectId?: string;
  projectName?: string;
  projectSlug?: string;
}

export interface ResearchActivity extends BaseActivity {
  type: 'research';
  title: string;
  description: string;
  url?: string;
}

export interface IdeaActivity extends BaseActivity {
  type: 'idea';
  description: string;
}

export interface RoadmapActivity extends BaseActivity {
  type: 'roadmap';
  title: string;
  status: string;
}

export interface ProjectJoinActivity extends BaseActivity {
  type: 'project_join';
}

export interface VoteActivity extends BaseActivity {
  type: 'vote';
  targetType: 'idea' | 'research' | 'roadmap';
  voteValue: -1 | 1;
}

export type Activity = 
  | ResearchActivity 
  | IdeaActivity 
  | RoadmapActivity 
  | ProjectJoinActivity
  | VoteActivity;

/**
 * User activity statistics for badge calculation
 */
export interface UserActivityStats {
  totalXp: number;
  researchCount: number;
  ideaCount: number;
  roadmapCount: number;
  projectCount: number;
  voteCount: number;
  profileCompletionPercent: number;
}

/**
 * Activity display config
 */
export const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: string;
  label: string;
  color: string;
  xp: number;
}> = {
  research: {
    icon: 'BookOpen',
    label: 'Added research',
    color: 'text-blue-500',
    xp: XP_REWARDS.RESEARCH_NODE,
  },
  idea: {
    icon: 'Lightbulb',
    label: 'Shared an idea',
    color: 'text-amber-500',
    xp: XP_REWARDS.IDEA,
  },
  roadmap: {
    icon: 'Map',
    label: 'Created roadmap item',
    color: 'text-green-500',
    xp: XP_REWARDS.ROADMAP_ITEM,
  },
  project_join: {
    icon: 'Users',
    label: 'Joined project',
    color: 'text-purple-500',
    xp: XP_REWARDS.GAME_COMPLETION,
  },
  vote: {
    icon: 'ThumbsUp',
    label: 'Voted',
    color: 'text-stone-500',
    xp: XP_REWARDS.VOTE,
  },
};

/**
 * Format activity date for display
 */
export function formatActivityDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Group activities by month for timeline display
 */
export function groupActivitiesByMonth(activities: Activity[]): Map<string, Activity[]> {
  const groups = new Map<string, Activity[]>();
  
  for (const activity of activities) {
    const date = new Date(activity.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(activity);
  }
  
  return groups;
}
