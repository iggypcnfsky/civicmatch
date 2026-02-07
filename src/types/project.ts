/**
 * Project Types
 * 
 * Defines interfaces for Projects feature in CivicMatch.
 * Projects are collaborative initiatives that users can join after completing a game threshold.
 */

import type { ProfileWithLocation } from './profile';

/**
 * Onboarding slide for project presentation
 */
export interface OnboardingSlide {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  backgroundColor?: string;
}

/**
 * Project data structure (stored in JSONB `data` column)
 */
export interface ProjectData {
  title: string;
  description: string;
  manifesto?: string;
  founderName?: string;
  logoUrl?: string;
  videoUrl?: string;
  backgroundImageUrl?: string;
  tags?: string[];
  status?: 'active' | 'completed' | 'archived';
  stats?: {
    memberCount?: number;
  };
  location?: {
    city?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  };
  organizers?: string[]; // Array of user IDs designated as project organizers
  onboardingSlides?: OnboardingSlide[]; // Custom onboarding presentation slides
}

/**
 * Project database row
 */
export interface ProjectRow {
  id: string;
  slug: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  data: ProjectData;
}

/**
 * Project with resolved data for display
 */
export interface Project {
  id: string;
  slug: string;
  creatorId: string;
  name: string;
  description: string;
  manifesto?: string;
  founderName?: string;
  logoUrl?: string;
  videoUrl?: string;
  backgroundImageUrl?: string;
  tags?: string[];
  location?: {
    city?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  };
  createdAt?: string;
  members?: ProjectMember[];
  onboardingSlides?: OnboardingSlide[];
}

/**
 * Project member with role
 */
export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: 'founder' | 'admin' | 'member';
  createdAt: string;
  profile?: ProfileWithLocation;
}

/**
 * Project member database row
 */
export interface ProjectMemberRow {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
  data: Record<string, unknown>;
}

/**
 * Game completion record
 */
export interface GameCompletion {
  id: string;
  projectId: string;
  userId: string;
  completedAt: string;
}

/**
 * Game completion database row
 */
export interface GameCompletionRow {
  id: string;
  project_id: string;
  user_id: string;
  completed_at: string;
  data: Record<string, unknown>;
}

/**
 * Project with location for map display
 */
export interface ProjectWithLocation extends Project {
  members: ProjectMember[];
}

/**
 * Dashboard tabs
 */
export type DashboardTab = 
  | 'about'
  | 'presentation'
  | 'plan'
  | 'research'
  | 'ideas'
  | 'people'
  | 'jobs';

/**
 * Helper to map database row to Project
 */
export function mapProjectRowToProject(row: ProjectRow, members?: ProjectMember[]): Project {
  const data = row.data;
  return {
    id: row.id,
    slug: row.slug,
    creatorId: row.creator_id,
    name: data.title,
    description: data.description,
    manifesto: data.manifesto,
    founderName: data.founderName,
    logoUrl: data.logoUrl,
    videoUrl: data.videoUrl,
    backgroundImageUrl: data.backgroundImageUrl,
    tags: data.tags,
    location: data.location,
    createdAt: row.created_at,
    members,
    onboardingSlides: data.onboardingSlides,
  };
}

/**
 * Project for map display (with coordinates)
 */
export interface ProjectForMap {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  location: {
    coordinates: { lat: number; lng: number };
    displayName?: string;
  };
  memberCount?: number;
  members?: {
    id: string;
    avatarUrl?: string;
    name: string;
  }[];
}

/**
 * Research node data structure (stored in JSONB `data` column)
 */
export interface ResearchNodeData {
  title: string;
  description: string;
  url?: string;
}

/**
 * Research node database row
 */
export interface ResearchNodeRow {
  id: string;
  project_id: string;
  creator_id: string;
  created_at: string;
  data: ResearchNodeData;
}

/**
 * Research node with resolved data for display
 */
export interface ResearchNode {
  id: string;
  projectId: string;
  creatorId: string;
  title: string;
  description: string;
  url?: string;
  createdAt: string;
}

/**
 * Helper to map database row to ResearchNode
 */
export function mapResearchNodeRowToResearchNode(row: ResearchNodeRow): ResearchNode {
  return {
    id: row.id,
    projectId: row.project_id,
    creatorId: row.creator_id,
    title: row.data.title,
    description: row.data.description,
    url: row.data.url,
    createdAt: row.created_at,
  };
}

/**
 * Idea data structure (stored in JSONB `data` column)
 * Ideas are simpler than research - just a description
 */
export interface IdeaData {
  description: string;
}

/**
 * Idea database row
 */
export interface IdeaRow {
  id: string;
  project_id: string;
  creator_id: string;
  created_at: string;
  data: IdeaData;
}

/**
 * Idea with resolved data for display
 */
export interface Idea {
  id: string;
  projectId: string;
  creatorId: string;
  description: string;
  createdAt: string;
  // Extended fields for display
  creator?: AuthorInfo;
  votes?: VoteCounts;
  userVote?: number; // -1, 0, or 1
}

/**
 * Helper to map database row to Idea
 */
export function mapIdeaRowToIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    projectId: row.project_id,
    creatorId: row.creator_id,
    description: row.data.description,
    createdAt: row.created_at,
  };
}

/**
 * Vote database row
 */
export interface VoteRow {
  id: string;
  user_id: string;
  target_type: 'idea' | 'research' | 'roadmap';
  target_id: string;
  vote_value: -1 | 1;
  created_at: string;
}

/**
 * Vote counts for an item
 */
export interface VoteCounts {
  upvotes: number;
  downvotes: number;
  total: number;
}

/**
 * Author info for display
 */
export interface AuthorInfo {
  id: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Extended ResearchNode with author and votes for display
 */
export interface ResearchNodeWithMeta extends ResearchNode {
  creator?: AuthorInfo;
  votes?: VoteCounts;
  userVote?: number; // -1, 0, or 1
}

/**
 * Roadmap item status (Kanban columns)
 */
export type RoadmapStatus = 'backlog' | 'planned' | 'in_progress' | 'done';

/**
 * Roadmap item data structure (stored in JSONB `data` column)
 */
export interface RoadmapItemData {
  title: string;
  description?: string;
  status: RoadmapStatus;
  priority?: 'low' | 'medium' | 'high';
  order?: number; // For sorting within a column
}

/**
 * Roadmap item database row
 */
export interface RoadmapItemRow {
  id: string;
  project_id: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  data: RoadmapItemData;
}

/**
 * Roadmap item with resolved data for display
 */
export interface RoadmapItem {
  id: string;
  projectId: string;
  creatorId: string;
  title: string;
  description?: string;
  status: RoadmapStatus;
  priority?: 'low' | 'medium' | 'high';
  order?: number;
  createdAt: string;
  updatedAt: string;
  // Extended fields for display
  creator?: AuthorInfo;
  votes?: VoteCounts;
  userVote?: number; // -1, 0, or 1
}

/**
 * Helper to map database row to RoadmapItem
 */
export function mapRoadmapItemRowToRoadmapItem(row: RoadmapItemRow): RoadmapItem {
  return {
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
  };
}

/**
 * Kanban column configuration
 */
export const KANBAN_COLUMNS: { id: RoadmapStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'var(--foreground)' },
  { id: 'planned', label: 'Planned', color: '#3B82F6' }, // blue
  { id: 'in_progress', label: 'In Progress', color: '#F59E0B' }, // amber
  { id: 'done', label: 'Done', color: '#10B981' }, // green
];

/**
 * Job type options
 */
export type JobType = 'full_time' | 'part_time' | 'volunteer' | 'contract';

/**
 * Job status
 */
export type JobStatus = 'open' | 'closed';

/**
 * Job data structure (stored in JSONB `data` column)
 */
export interface JobData {
  title: string;
  description: string;
  location: string;
  type: JobType;
  requirements?: string;
  status: JobStatus;
}

/**
 * Job database row
 */
export interface JobRow {
  id: string;
  project_id: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  data: JobData;
}

/**
 * Job with resolved data for display
 */
export interface Job {
  id: string;
  projectId: string;
  creatorId: string;
  title: string;
  description: string;
  location: string;
  type: JobType;
  requirements?: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Helper to map database row to Job
 */
export function mapJobRowToJob(row: JobRow): Job {
  return {
    id: row.id,
    projectId: row.project_id,
    creatorId: row.creator_id,
    title: row.data.title,
    description: row.data.description,
    location: row.data.location,
    type: row.data.type,
    requirements: row.data.requirements,
    status: row.data.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Job type display labels
 */
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  volunteer: 'Volunteer',
  contract: 'Contract',
};

/**
 * Job type colors for badges
 */
export const JOB_TYPE_COLORS: Record<JobType, string> = {
  full_time: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  part_time: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  volunteer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  contract: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};
