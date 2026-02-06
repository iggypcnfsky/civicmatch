"use client";

import { useState, useEffect } from "react";
import { Users, UserCheck, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

interface PersonInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  contributionCount?: number;
}

interface PeoplePanelProps {
  projectId: string;
  organizerIds?: string[];
}

export default function PeoplePanel({ projectId, organizerIds = [] }: PeoplePanelProps) {
  const [organizers, setOrganizers] = useState<PersonInfo[]>([]);
  const [activeParticipants, setActiveParticipants] = useState<PersonInfo[]>([]);
  const [followers, setFollowers] = useState<PersonInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPeople() {
      try {
        // 1. Fetch organizer profiles
        if (organizerIds.length > 0) {
          const { data: organizerProfiles } = await supabase
            .from("profiles")
            .select("user_id, data")
            .in("user_id", organizerIds);
          
          if (organizerProfiles) {
            setOrganizers(organizerProfiles.map(p => {
              const data = p.data as Record<string, unknown>;
              return {
                id: p.user_id,
                name: (data.displayName as string) || "Unknown",
                avatarUrl: data.avatarUrl as string | undefined,
                bio: data.bio as string | undefined,
              };
            }));
          }
        }

        // 2. Get contributors (users who have created research_nodes or ideas)
        const [researchResult, ideasResult] = await Promise.all([
          supabase
            .from("research_nodes")
            .select("creator_id")
            .eq("project_id", projectId),
          supabase
            .from("ideas")
            .select("creator_id")
            .eq("project_id", projectId),
        ]);

        const contributorIds = new Set<string>();
        const contributionCounts = new Map<string, number>();
        
        researchResult.data?.forEach(r => {
          contributorIds.add(r.creator_id);
          contributionCounts.set(r.creator_id, (contributionCounts.get(r.creator_id) || 0) + 1);
        });
        ideasResult.data?.forEach(i => {
          contributorIds.add(i.creator_id);
          contributionCounts.set(i.creator_id, (contributionCounts.get(i.creator_id) || 0) + 1);
        });

        // Remove organizers from contributors
        organizerIds.forEach(id => contributorIds.delete(id));

        if (contributorIds.size > 0) {
          const { data: contributorProfiles } = await supabase
            .from("profiles")
            .select("user_id, data")
            .in("user_id", Array.from(contributorIds));
          
          if (contributorProfiles) {
            setActiveParticipants(contributorProfiles.map(p => {
              const data = p.data as Record<string, unknown>;
              return {
                id: p.user_id,
                name: (data.displayName as string) || "Unknown",
                avatarUrl: data.avatarUrl as string | undefined,
                bio: data.bio as string | undefined,
                contributionCount: contributionCounts.get(p.user_id) || 0,
              };
            }).sort((a, b) => (b.contributionCount || 0) - (a.contributionCount || 0)));
          }
        }

        // 3. Get followers (game completions minus organizers and contributors)
        const { data: gameCompletions } = await supabase
          .from("game_completions")
          .select("user_id")
          .eq("project_id", projectId);

        const followerIds = new Set<string>();
        gameCompletions?.forEach(gc => {
          if (!organizerIds.includes(gc.user_id) && !contributorIds.has(gc.user_id)) {
            followerIds.add(gc.user_id);
          }
        });

        if (followerIds.size > 0) {
          const { data: followerProfiles } = await supabase
            .from("profiles")
            .select("user_id, data")
            .in("user_id", Array.from(followerIds));
          
          if (followerProfiles) {
            setFollowers(followerProfiles.map(p => {
              const data = p.data as Record<string, unknown>;
              return {
                id: p.user_id,
                name: (data.displayName as string) || "Unknown",
                avatarUrl: data.avatarUrl as string | undefined,
                bio: data.bio as string | undefined,
              };
            }));
          }
        }

      } catch (err) {
        console.error("Error fetching people:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPeople();
  }, [projectId, organizerIds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--accent)]"></div>
      </div>
    );
  }

  const totalPeople = organizers.length + activeParticipants.length + followers.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-medium">People</h2>
        <p className="text-sm text-[color:var(--foreground)]/60 mt-1">
          {totalPeople} {totalPeople === 1 ? "person" : "people"} involved in this project
        </p>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Organizers Column */}
        <PeopleColumn
          title="Organizers"
          subtitle="Project leaders"
          icon={<UserCheck className="size-5" />}
          people={organizers}
          emptyMessage="No organizers assigned yet"
          accentColor="var(--accent)"
        />

        {/* Active Participants Column */}
        <PeopleColumn
          title="Active Participants"
          subtitle="Contributors"
          icon={<Users className="size-5" />}
          people={activeParticipants}
          emptyMessage="No contributions yet"
          accentColor="#10B981"
          showContributions
        />

        {/* Followers Column */}
        <PeopleColumn
          title="Followers"
          subtitle="Watching"
          icon={<Eye className="size-5" />}
          people={followers}
          emptyMessage="No followers yet"
          accentColor="#6366F1"
        />
      </div>
    </div>
  );
}

interface PeopleColumnProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  people: PersonInfo[];
  emptyMessage: string;
  accentColor: string;
  showContributions?: boolean;
}

function PeopleColumn({ 
  title, 
  subtitle, 
  icon, 
  people, 
  emptyMessage, 
  accentColor,
  showContributions 
}: PeopleColumnProps) {
  return (
    <div className="bg-[color:var(--muted)]/10 rounded-2xl p-4">
      {/* Column header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-divider">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-xs text-[color:var(--foreground)]/50">{subtitle}</p>
        </div>
        <span 
          className="ml-auto text-sm font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          {people.length}
        </span>
      </div>

      {/* People list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {people.length > 0 ? (
          people.map((person) => (
            <PersonCard 
              key={person.id} 
              person={person} 
              showContributions={showContributions}
            />
          ))
        ) : (
          <p className="text-sm text-[color:var(--foreground)]/40 text-center py-6">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}

interface PersonCardProps {
  person: PersonInfo;
  showContributions?: boolean;
}

function PersonCard({ person, showContributions }: PersonCardProps) {
  return (
    <Link 
      href={`/profiles/${person.id}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-[color:var(--background)] hover:shadow-md transition-all border border-transparent hover:border-divider"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-[color:var(--muted)]/40 overflow-hidden flex-shrink-0">
        {person.avatarUrl ? (
          <img 
            src={person.avatarUrl} 
            alt={person.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[color:var(--foreground)]/40 text-sm font-medium">
            {person.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{person.name}</h4>
        {person.bio && (
          <p className="text-xs text-[color:var(--foreground)]/50 line-clamp-1">
            {person.bio}
          </p>
        )}
        {showContributions && person.contributionCount && person.contributionCount > 0 && (
          <p className="text-xs text-[#10B981] mt-0.5">
            {person.contributionCount} contribution{person.contributionCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </Link>
  );
}
