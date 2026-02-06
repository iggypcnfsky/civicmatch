"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Users, FileText, Lightbulb, Briefcase, Calendar, Search, Eye, EyeOff, UserRound, AlertTriangle, MapPin } from "lucide-react";
import type { DashboardTab, ProjectRow } from "@/types/project";

const DASHBOARD_TABS: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
  { id: 'vision', label: 'Vision', icon: Eye },
  { id: 'plan', label: 'Plan', icon: FileText },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'people', label: 'People', icon: Users },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
];

interface MapFilters {
  showPeople: boolean;
  showProjects: boolean;
  showEvents: boolean;
  showChallenges: boolean;
}

interface TopBarProps {
  mapFilters?: MapFilters;
  onTogglePeople?: () => void;
  onToggleProjects?: () => void;
  onToggleEvents?: () => void;
  onToggleChallenges?: () => void;
  onShowAll?: () => void;
  onHideAll?: () => void;
  onProfileClick?: () => void;
}

export default function TopBar({ 
  mapFilters, 
  onTogglePeople, 
  onToggleProjects, 
  onToggleEvents, 
  onToggleChallenges,
  onShowAll,
  onHideAll,
  onProfileClick
}: TopBarProps = {}) {
  const { status } = useAuth();
  const isAuthed = status === "authenticated";
  const [, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Detect if we're on a dashboard page
  const dashboardMatch = pathname?.match(/^\/projects\/([^/]+)\/dashboard/);
  const projectSlug = dashboardMatch?.[1];
  const isDashboard = !!projectSlug;
  const activeTab = (searchParams?.get('tab') as DashboardTab) || 'research';

  // Detect if we're on the explore page
  const isExplorePage = pathname === "/" || pathname === "/explore";

  useEffect(() => {
    const readFromCache = () => {
      const name = localStorage.getItem("civicmatch.displayName") || localStorage.getItem("civicmatch.name") || "";
      const avatar = localStorage.getItem("civicmatch.avatarUrl") || "";
      setDisplayName(name);
      setAvatarUrl(avatar);
    };
    const fetchAndCacheProfile = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("profiles").select("username, data").eq("user_id", uid).maybeSingle();
      const d = (data?.data || {}) as Record<string, unknown>;
      const name = (typeof d.displayName === "string" && d.displayName) || data?.username || "Member";
      const avatar = (typeof d.avatarUrl === "string" && d.avatarUrl) || "";
      localStorage.setItem("civicmatch.displayName", name);
      if (avatar) localStorage.setItem("civicmatch.avatarUrl", avatar); else localStorage.removeItem("civicmatch.avatarUrl");
      setDisplayName(name);
      setAvatarUrl(avatar);
    };
    const fetchOnceIfMissing = async () => {
      const cachedName = localStorage.getItem("civicmatch.displayName");
      const cachedAvatar = localStorage.getItem("civicmatch.avatarUrl");
      if (cachedName && cachedAvatar) return;
      await fetchAndCacheProfile();
    };
    readFromCache();
    fetchOnceIfMissing();
    const onAuth = async () => {
      // Force refresh avatar/name on login regardless of cache
      await fetchAndCacheProfile();
    };
    const onProfileUpdated = () => {
      // When profile changes, refetch to get fresh avatar, then cache
      fetchAndCacheProfile();
    };
    window.addEventListener("civicmatch:auth-changed", onAuth);
    window.addEventListener("civicmatch:profile-updated", onProfileUpdated);
    window.addEventListener("storage", onProfileUpdated);
    return () => {
      window.removeEventListener("civicmatch:auth-changed", onAuth);
      window.removeEventListener("civicmatch:profile-updated", onProfileUpdated);
      window.removeEventListener("storage", onProfileUpdated);
    };
  }, []);

  // When auth becomes available, refresh profile cache once
  useEffect(() => {
    if (!isAuthed) return;
    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes?.user?.id) return;
        const { data } = await supabase.from("profiles").select("username, data").eq("user_id", userRes.user.id).maybeSingle();
        const d = (data?.data || {}) as Record<string, unknown>;
        const name = (typeof d.displayName === "string" && d.displayName) || data?.username || "Member";
        const avatar = (typeof d.avatarUrl === "string" && d.avatarUrl) || "";
        localStorage.setItem("civicmatch.displayName", name);
        if (avatar) localStorage.setItem("civicmatch.avatarUrl", avatar); else localStorage.removeItem("civicmatch.avatarUrl");
        setDisplayName(name);
        setAvatarUrl(avatar);
      } catch {}
    })();
  }, [isAuthed]);

  const handleDashboardTabChange = (tab: DashboardTab) => {
    if (projectSlug) {
      router.push(`/projects/${projectSlug}/dashboard?tab=${tab}`, { scroll: false });
    }
  };

  if (!isAuthed) return null;

  // For explore page, render two separate navbars
  if (isExplorePage) {
    return (
      <>
        {/* Left Navbar - Sidebar area (30%) with background */}
        <div className="fixed top-0 left-0 w-[30%] z-40 flex items-center justify-between px-4 py-2 bg-[color:var(--background)]">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Home">
            <Logo className="size-7 text-[color:var(--foreground)]" />
            <span className="font-semibold truncate hidden md:inline text-[color:var(--foreground)]">Civic Match</span>
          </Link>
          
          {/* Avatar in left navbar */}
          <button 
            onClick={onProfileClick}
            className="block rounded-full p-0.5 hover:bg-[color:var(--muted)]/30 transition-colors"
            aria-label="Profile"
          >
            <span className="h-9 w-9 rounded-full overflow-hidden border flex-shrink-0 block border-divider">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="block w-full h-full bg-[color:var(--muted)]/60" />
              )}
            </span>
          </button>
        </div>

        {/* Right Navbar - Map area (70%) without background, just filter buttons */}
        {mapFilters && (
          <div 
            className="fixed z-40 flex items-center justify-end px-4 py-2"
            style={{ 
              top: 0, 
              left: '30%', 
              right: 0,
              background: 'transparent',
              pointerEvents: 'none'
            }}
          >
            <div className="flex items-center gap-3" style={{ pointerEvents: 'auto' }}>
              {/* Map Filters Label */}
              <span className="text-xs font-medium text-[color:var(--muted-foreground)] hidden lg:inline">
                Map Filters:
              </span>
              
              {/* Filter Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onTogglePeople}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    mapFilters.showPeople 
                      ? 'bg-[color:var(--accent)] text-[color:var(--background)] border-[color:var(--accent)]' 
                      : 'bg-[color:var(--background)]/80 backdrop-blur-sm text-[color:var(--foreground)] border-divider'
                  }`}
                  title="Toggle People"
                >
                  <UserRound className="size-3.5" />
                  <span className="hidden sm:inline">People</span>
                </button>
                <button
                  onClick={onToggleProjects}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    mapFilters.showProjects 
                      ? 'bg-green-500 text-gray-900 border-green-500' 
                      : 'bg-[color:var(--background)]/80 backdrop-blur-sm text-[color:var(--foreground)] border-divider'
                  }`}
                  title="Toggle Projects"
                >
                  <Briefcase className="size-3.5" />
                  <span className="hidden sm:inline">Projects</span>
                </button>
                <button
                  onClick={onToggleEvents}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    mapFilters.showEvents 
                      ? 'bg-blue-500 text-gray-900 border-blue-500' 
                      : 'bg-[color:var(--background)]/80 backdrop-blur-sm text-[color:var(--foreground)] border-divider'
                  }`}
                  title="Toggle Events"
                >
                  <Calendar className="size-3.5" />
                  <span className="hidden sm:inline">Events</span>
                </button>
                <button
                  onClick={onToggleChallenges}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    mapFilters.showChallenges 
                      ? 'bg-amber-400 text-gray-900 border-amber-400' 
                      : 'bg-[color:var(--background)]/80 backdrop-blur-sm text-[color:var(--foreground)] border-divider'
                  }`}
                  title="Toggle Civic Challenges"
                >
                  <AlertTriangle className="size-3.5" />
                  <span className="hidden sm:inline">Challenges</span>
                </button>
              </div>
              
              {/* Divider */}
              <div className="w-px h-6 bg-divider hidden sm:block" />
              
              {/* Show All / Hide All Button */}
              {(() => {
                const allVisible = mapFilters.showPeople && mapFilters.showProjects && mapFilters.showEvents && mapFilters.showChallenges;
                const someVisible = mapFilters.showPeople || mapFilters.showProjects || mapFilters.showEvents || mapFilters.showChallenges;
                
                if (allVisible) {
                  return (
                    <button
                      onClick={onHideAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border bg-[color:var(--background)]/80 backdrop-blur-sm text-[color:var(--foreground)] border-divider hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50"
                      title="Hide all layers"
                    >
                      <EyeOff className="size-3.5" />
                      <span className="hidden sm:inline">Hide all</span>
                    </button>
                  );
                } else {
                  return (
                    <button
                      onClick={onShowAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border bg-[color:var(--background)]/80 backdrop-blur-sm text-[color:var(--foreground)] border-divider hover:bg-[color:var(--accent)]/10 hover:text-[color:var(--accent)] hover:border-[color:var(--accent)]/50"
                      title="Show all layers"
                    >
                      <Eye className="size-3.5" />
                      <span className="hidden sm:inline">Show all</span>
                    </button>
                  );
                }
              })()}
            </div>
          </div>
        )}
      </>
    );
  }

  // Standard single navbar for non-explore pages
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-[color:var(--background)] px-4 py-2">
      <div className="flex items-center gap-6 min-w-0">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Home">
          <Logo className="size-7 text-[color:var(--foreground)]" />
          <span className="font-semibold truncate hidden md:inline text-[color:var(--foreground)]">Civic Match</span>
        </Link>
        
        {/* Main Nav Links - Removed Events link since events are now in explore page */}
      </div>
      
      {/* Dashboard tabs - center */}
      {isDashboard && (
        <nav className="hidden lg:flex items-center gap-4 flex-1 justify-center px-4">
          {DASHBOARD_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleDashboardTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-opacity text-sm ${
                  activeTab === tab.id 
                    ? 'text-[color:var(--foreground)] opacity-100' 
                    : 'text-[color:var(--foreground)] opacity-60 hover:opacity-80'
                }`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
      
      {/* Mobile dashboard tabs */}
      {isDashboard && (
        <nav className="lg:hidden flex items-center gap-2 overflow-x-auto flex-1 px-2 -mx-2">
          {DASHBOARD_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleDashboardTabChange(tab.id)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-opacity text-xs whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id 
                    ? 'text-[color:var(--foreground)] opacity-100' 
                    : 'text-[color:var(--foreground)] opacity-60'
                }`}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
      
      <div className="flex items-center gap-3">
        {/* Profile avatar - clickable */}
        <button 
          onClick={onProfileClick}
          className="block rounded-full p-0.5 hover:bg-[color:var(--muted)]/30 transition-colors"
          aria-label="Profile"
        >
          <span className="h-9 w-9 rounded-full overflow-hidden border flex-shrink-0 block border-divider">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="block w-full h-full bg-[color:var(--muted)]/60" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
