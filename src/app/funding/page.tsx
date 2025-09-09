"use client";

import { useEffect, useState } from "react";
import { Plus, Search, DollarSign, Calendar, Users, Heart, Bookmark, ArrowRight, Globe, Clock, TrendingUp, Euro } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import AddFundingModal from "@/components/AddFundingModal";

// Types based on FUNDING.md architecture
interface FundingOpportunity {
  id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  data: {
    title: string;
    country_code: string;
    amount: number;
    currency: string;
    deadline: string;
    website_url: string;
    description?: string;
    eligibility?: string;
  };
  creator?: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  interest_count?: number;
  user_is_interested?: boolean;
  interested_user_ids?: string[];
  user_has_bookmarked?: boolean;
}

interface FundingFilters {
  search: string;
  countries: string[];
  deadlineRange: 'next-30-days' | 'next-3-months' | 'next-6-months' | 'all';
  amountRange: 'under-50k' | '50k-500k' | '500k-plus' | 'all';
  sortBy: 'deadline-asc' | 'deadline-desc' | 'amount-desc' | 'interest-desc' | 'created-desc';
  bookmarked: boolean;
}

// Country flags system
const COUNTRY_FLAGS = {
  'US': '🇺🇸', 'UK': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷', 
  'EU': '🇪🇺', 'CA': '🇨🇦', 'AU': '🇦🇺', 'JP': '🇯🇵',
  'BR': '🇧🇷', 'IN': '🇮🇳', 'CN': '🇨🇳', 'MX': '🇲🇽',
  'ES': '🇪🇸', 'IT': '🇮🇹', 'NL': '🇳🇱', 'SE': '🇸🇪',
  'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'CH': '🇨🇭',
  'AT': '🇦🇹', 'BE': '🇧🇪', 'IE': '🇮🇪', 'PT': '🇵🇹',
  'GR': '🇬🇷', 'PL': '🇵🇱', 'CZ': '🇨🇿', 'HU': '🇭🇺',
  'SK': '🇸🇰', 'SI': '🇸🇮', 'HR': '🇭🇷', 'RO': '🇷🇴',
  'BG': '🇧🇬', 'EE': '🇪🇪', 'LV': '🇱🇻', 'LT': '🇱🇹',
  'LU': '🇱🇺', 'MT': '🇲🇹', 'CY': '🇨🇾', 'IS': '🇮🇸',
  'NZ': '🇳🇿', 'KR': '🇰🇷', 'SG': '🇸🇬', 'HK': '🇭🇰',
  'TW': '🇹🇼', 'MY': '🇲🇾', 'TH': '🇹🇭', 'ID': '🇮🇩',
  'PH': '🇵🇭', 'VN': '🇻🇳', 'ZA': '🇿🇦', 'NG': '🇳🇬',
  'KE': '🇰🇪', 'GH': '🇬🇭', 'EG': '🇪🇬', 'MA': '🇲🇦',
  'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪',
  'UY': '🇺🇾', 'CR': '🇨🇷', 'PA': '🇵🇦', 'GT': '🇬🇹',
  'RU': '🇷🇺', 'TR': '🇹🇷', 'IL': '🇮🇱', 'AE': '🇦🇪',
  'SA': '🇸🇦', 'QA': '🇶🇦',
} as const;

// Comprehensive country options for filters
const COUNTRIES = [
  // Major funding countries first
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'EU', name: 'European Union', flag: '🇪🇺' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
];

const getCountryFlag = (countryCode: string): string => {
  return COUNTRY_FLAGS[countryCode as keyof typeof COUNTRY_FLAGS] || '🌍';
};

// Time-based grouping logic
const getTimeGroup = (deadline: string): string => {
  const date = new Date(deadline);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 7) return 'This week';
  if (diffDays <= 30) return 'This month';
  
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
};

const groupOpportunitiesByTime = (opportunities: FundingOpportunity[]): Record<string, FundingOpportunity[]> => {
  const groups: Record<string, FundingOpportunity[]> = {};
  
  opportunities.forEach(opportunity => {
    const group = getTimeGroup(opportunity.data.deadline);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(opportunity);
  });
  
  // Sort groups by urgency
  const sortedGroups: Record<string, FundingOpportunity[]> = {};
  const groupOrder = ['This week', 'This month'];
  
  // Add urgent groups first
  groupOrder.forEach(group => {
    if (groups[group]) {
      sortedGroups[group] = groups[group].sort((a, b) => 
        new Date(a.data.deadline).getTime() - new Date(b.data.deadline).getTime()
      );
    }
  });
  
  // Add month/year groups sorted chronologically
  Object.keys(groups)
    .filter(group => !groupOrder.includes(group))
    .sort((a, b) => {
      const dateA = new Date(groups[a][0].data.deadline);
      const dateB = new Date(groups[b][0].data.deadline);
      return dateA.getTime() - dateB.getTime();
    })
    .forEach(group => {
      sortedGroups[group] = groups[group].sort((a, b) => 
        new Date(a.data.deadline).getTime() - new Date(b.data.deadline).getTime()
      );
    });
  
  return sortedGroups;
};

// Calendar grouping logic for sidebar
const groupOpportunitiesByCalendar = (opportunities: FundingOpportunity[]): Record<string, Record<string, number>> => {
  const calendar: Record<string, Record<string, number>> = {};
  
  opportunities.forEach(opportunity => {
    const date = new Date(opportunity.data.deadline);
    const year = date.getFullYear().toString();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    
    if (!calendar[year]) {
      calendar[year] = {};
    }
    
    if (!calendar[year][month]) {
      calendar[year][month] = 0;
    }
    
    calendar[year][month]++;
  });
  
  // Sort years descending, months chronologically within each year
  const sortedCalendar: Record<string, Record<string, number>> = {};
  
  Object.keys(calendar)
    .sort((a, b) => parseInt(b) - parseInt(a)) // Years descending (2025, 2024) - newest first
    .forEach(year => {
      const months = calendar[year];
      sortedCalendar[year] = {};
      
      // Sort months by actual date to get newest first within each year
      const monthEntries = Object.entries(months);
      
      monthEntries
        .sort((a, b) => {
          const monthA = new Date(`${a[0]} 1, ${year}`).getMonth();
          const monthB = new Date(`${b[0]} 1, ${year}`).getMonth();
          
          // Always sort months descending (newest first)
          return monthB - monthA;
        })
        .forEach(([month, count]) => {
          sortedCalendar[year][month] = count;
        });
    });
  
  return sortedCalendar;
};

// Calendar sidebar component
function CalendarSidebar({ 
  opportunities, 
  onMonthSelect 
}: { 
  opportunities: FundingOpportunity[];
  onMonthSelect: (year: string, month: string) => void;
}) {
  const calendarData = groupOpportunitiesByCalendar(opportunities);
  
  return (
    <div className="w-56 card space-y-4 h-fit">
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(calendarData).map(([year, months]) => (
          <div key={year} className="space-y-2">
            <h4 className="font-semibold text-base text-[color:var(--accent)]">{year}</h4>
            <div className="space-y-1 ml-2">
              {Object.entries(months).map(([month, count]) => (
                <button
                  key={`${year}-${month}`}
                  onClick={() => onMonthSelect(year, month)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[color:var(--muted)]/20 transition-colors text-left"
                >
                  <span className="text-sm">{month}</span>
                  <span className="text-xs text-[color:var(--muted-foreground)] bg-[color:var(--muted)]/30 px-2 py-1 rounded-full">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {opportunities.length > 0 && (
        <div className="text-xs text-[color:var(--muted-foreground)] pt-2 border-t border-[color:var(--border)]">
          Total: {opportunities.length}
        </div>
      )}
    </div>
  );
}

// Amount formatting
const formatAmount = (amount: number, currency: string = 'USD'): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  const value = amount / 100; // Convert from cents
  
  if (value >= 1000000) {
    return formatter.format(value / 1000000) + 'M';
  } else if (value >= 1000) {
    return formatter.format(value / 1000) + 'K';
  }
  return formatter.format(value);
};

// Deadline formatting
const formatDeadline = (deadline: string): string => {
  const date = new Date(deadline);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Expired';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays} days`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const getDeadlineUrgency = (deadline: string): string => {
  const date = new Date(deadline);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'text-red-500';
  if (diffDays <= 7) return 'text-red-500';
  if (diffDays <= 30) return 'text-yellow-600';
  return 'text-[color:var(--muted-foreground)]';
};

// Component to display interested user avatars
function InterestedUserAvatars({ 
  userIds, 
  maxDisplay = 4 
}: { 
  userIds: string[];
  maxDisplay?: number;
}) {
  const [users, setUsers] = useState<Array<{id: string, displayName?: string, avatarUrl?: string}>>([]);
  
  useEffect(() => {
    if (userIds.length === 0) return;
    
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, username, data')
          .in('user_id', userIds.slice(0, maxDisplay));
          
        if (error) throw error;
        
        const userData = (data || []).map(profile => ({
          id: profile.user_id as string,
          displayName: ((profile.data as Record<string, unknown>)?.displayName as string) || profile.username || '',
          avatarUrl: (profile.data as Record<string, unknown>)?.avatarUrl as string | undefined,
        }));
        
        setUsers(userData);
      } catch (error) {
        console.error('Error fetching interested users:', error);
      }
    };
    
    fetchUsers();
  }, [userIds, maxDisplay]);
  
  if (userIds.length === 0) return null;
  
  return (
    <div className="absolute top-4 right-4 flex">
      {users.map((user, i) => (
        <button
          key={user.id}
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/profiles/${user.id}`;
          }}
          className="size-6 rounded-full border border-[color:var(--background)] shadow-sm overflow-hidden hover:scale-110 transition-transform cursor-pointer"
          style={{ 
            marginLeft: i > 0 ? '-8px' : '0',
            zIndex: 10 - i 
          }}
          title={`View ${user.displayName}'s profile`}
        >
          {user.avatarUrl ? (
            <Image 
              src={user.avatarUrl} 
              alt={user.displayName || ''} 
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent)]/30 flex items-center justify-center text-xs font-medium text-[color:var(--accent)]">
              {user.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </button>
      ))}
      {userIds.length > maxDisplay && (
        <div 
          className="size-6 rounded-full bg-[color:var(--muted)]/60 border border-[color:var(--background)] flex items-center justify-center text-xs font-medium shadow-sm"
          style={{ 
            marginLeft: '-8px',
            zIndex: 6
          }}
        >
          +{userIds.length - maxDisplay}
        </div>
      )}
    </div>
  );
}

// Component to display larger interested user avatars in details sidebar
function InterestedUserAvatarsLarge({ 
  userIds, 
  maxDisplay = 8 
}: { 
  userIds: string[];
  maxDisplay?: number;
}) {
  const [users, setUsers] = useState<Array<{id: string, displayName?: string, avatarUrl?: string}>>([]);
  
  useEffect(() => {
    if (userIds.length === 0) return;
    
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, username, data')
          .in('user_id', userIds.slice(0, maxDisplay));
          
        if (error) throw error;
        
        const userData = (data || []).map(profile => ({
          id: profile.user_id as string,
          displayName: ((profile.data as Record<string, unknown>)?.displayName as string) || profile.username || '',
          avatarUrl: (profile.data as Record<string, unknown>)?.avatarUrl as string | undefined,
        }));
        
        setUsers(userData);
      } catch (error) {
        console.error('Error fetching interested users:', error);
      }
    };
    
    fetchUsers();
  }, [userIds, maxDisplay]);
  
  if (userIds.length === 0) return null;
  
  return (
    <div className="flex -space-x-2">
      {users.map((user, i) => (
        <button
          key={user.id}
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/profiles/${user.id}`;
          }}
          className="size-10 rounded-full border-2 border-[color:var(--background)] shadow-sm overflow-hidden hover:scale-110 transition-transform cursor-pointer"
          style={{ zIndex: 10 - i }}
          title={`View ${user.displayName}'s profile`}
        >
          {user.avatarUrl ? (
            <Image 
              src={user.avatarUrl} 
              alt={user.displayName || ''} 
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent)]/30 flex items-center justify-center text-xs font-medium text-[color:var(--accent)]">
              {user.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </button>
      ))}
      {userIds.length > maxDisplay && (
        <div 
          className="size-10 rounded-full bg-[color:var(--muted)]/40 border-2 border-[color:var(--background)] flex items-center justify-center text-xs font-medium shadow-sm"
          style={{ zIndex: 6 }}
        >
          +{userIds.length - maxDisplay}
        </div>
      )}
    </div>
  );
}

// Mobile funding card component (simplified for mobile)
function MobileFundingCard({ 
  funding, 
  onClick
}: { 
  funding: FundingOpportunity;
  onClick: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className="card group cursor-pointer hover:shadow-lg transition-all duration-200 relative active:scale-[0.98]"
    >
      {/* Country Flag - Top Left Corner */}
      <div className="absolute top-4 left-4 text-2xl z-10">
        {getCountryFlag(funding.data.country_code)}
      </div>
      
      {/* Interested Users Count - Top Right */}
      {funding.interested_user_ids && funding.interested_user_ids.length > 0 && (
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-[color:var(--accent)]/10 text-[color:var(--accent)] px-2 py-1 rounded-full text-xs font-medium">
          <Users className="size-3" />
          <span>+{funding.interested_user_ids.length}</span>
        </div>
      )}
      
      <div className="pt-12 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-[color:var(--accent)]">
          {funding.data.title}
        </h3>
        
        {/* Amount and Deadline */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-[color:var(--accent)] font-medium">
            {formatAmount(funding.data.amount, funding.data.currency)}
          </div>
          
          <div className="flex items-center gap-1">
            <Calendar className="size-4" />
            <span className={`font-medium ${getDeadlineUrgency(funding.data.deadline)}`}>
              {formatDeadline(funding.data.deadline)}
            </span>
          </div>
        </div>

        {/* Description preview (mobile only) */}
        {funding.data.description && (
          <p className="text-sm text-[color:var(--muted-foreground)] line-clamp-2 leading-relaxed">
            {funding.data.description}
          </p>
        )}
      </div>
    </div>
  );
}

// FundingCard component
function FundingCard({ 
  funding, 
  onClick,
  isSelected = false
}: { 
  funding: FundingOpportunity;
  onClick: () => void;
  isSelected?: boolean;
}) {
  return (
    <div 
      onClick={onClick}
      className={`card group cursor-pointer hover:shadow-lg transition-all duration-200 relative ${
        isSelected 
          ? 'ring-2 ring-[color:var(--accent)] border-[color:var(--accent)] shadow-lg shadow-[color:var(--accent)]/20' 
          : 'hover:border-[color:var(--accent)]/30'
      }`}
    >
      {/* Country Flag - Top Left Corner */}
      <div className="absolute top-4 left-4 text-2xl z-10">
        {getCountryFlag(funding.data.country_code)}
      </div>
      
      {/* Interested Users Avatars - Top Right, Stacked */}
      {funding.interested_user_ids && funding.interested_user_ids.length > 0 && (
        <InterestedUserAvatars userIds={funding.interested_user_ids} maxDisplay={4} />
      )}
      
      <div className="pt-12 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-[color:var(--accent)]">
          {funding.data.title}
        </h3>
        
        {/* Amount and Deadline */}
        <div className="flex items-center gap-4 text-sm text-[color:var(--muted-foreground)]">
          <div className="text-[color:var(--accent)] font-medium">
            {formatAmount(funding.data.amount, funding.data.currency)}
          </div>
          
          <div className="flex items-center gap-1">
            <Calendar className="size-4" />
            <span className={`font-medium ${getDeadlineUrgency(funding.data.deadline)}`}>
              {formatDeadline(funding.data.deadline)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile Details Modal Component
function MobileDetailsModal({ 
  funding, 
  isOpen,
  onClose,
  onExpressInterest,
  onBookmark
}: { 
  funding: FundingOpportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onExpressInterest: (id: string) => void;
  onBookmark: (id: string) => void;
}) {
  if (!isOpen || !funding) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 lg:hidden">
      <div className="fixed inset-x-0 bottom-0 bg-[color:var(--background)] rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[color:var(--background)] border-b border-[color:var(--border)] p-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Funding Details</h2>
          <button 
            onClick={onClose}
            className="size-8 rounded-full bg-[color:var(--muted)]/20 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Title and Country */}
          <div className="flex items-start gap-4">
            <div className="text-4xl">{getCountryFlag(funding.data.country_code)}</div>
            <div className="flex-1">
              <h3 className="font-bold text-xl leading-tight">{funding.data.title}</h3>
            </div>
          </div>
          
          {/* Key Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl">
              <div className="text-sm text-[color:var(--muted-foreground)]">Amount</div>
              <div className="font-bold text-lg text-[color:var(--accent)]">
                {formatAmount(funding.data.amount, funding.data.currency)}
              </div>
            </div>
            
            <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl">
              <div className="text-sm text-[color:var(--muted-foreground)]">Deadline</div>
              <div className={`font-bold text-lg ${getDeadlineUrgency(funding.data.deadline)}`}>
                {formatDeadline(funding.data.deadline)}
              </div>
              <div className="text-xs text-[color:var(--muted-foreground)]">
                {new Date(funding.data.deadline).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
          
          {/* Description */}
          {funding.data.description && (
            <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl space-y-2">
              <h4 className="font-semibold">About</h4>
              <p className="text-[color:var(--muted-foreground)] leading-relaxed text-sm">
                {funding.data.description}
              </p>
            </div>
          )}
          
          {/* Eligibility */}
          {funding.data.eligibility && (
            <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl space-y-2">
              <h4 className="font-semibold">Eligibility</h4>
              <p className="text-[color:var(--muted-foreground)] leading-relaxed text-sm">
                {funding.data.eligibility}
              </p>
            </div>
          )}
          
          {/* Community Interest */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-[color:var(--accent)]" />
              <h4 className="font-semibold">Community Interest</h4>
            </div>
            
            {funding.interested_user_ids && funding.interested_user_ids.length > 0 ? (
              <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl">
                <InterestedUserAvatarsLarge userIds={funding.interested_user_ids} maxDisplay={6} />
              </div>
            ) : (
              <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl text-center">
                <div className="text-sm text-[color:var(--muted-foreground)]">
                  Be the first to express interest
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar - Fixed at bottom */}
        <div className="sticky bottom-0 bg-[color:var(--background)] border-t border-[color:var(--border)] p-4 space-y-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpressInterest(funding.id);
            }}
            className={`w-full h-12 px-4 inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors ${
              funding.user_is_interested
                ? 'bg-[color:var(--accent)]/10 text-[color:var(--accent)] border border-[color:var(--accent)]/20'
                : 'bg-[color:var(--accent)] text-[color:var(--background)] hover:bg-[color:var(--accent)]/90'
            }`}
          >
            <Heart className={`size-4 ${funding.user_is_interested ? 'fill-current' : ''}`} />
            {funding.user_is_interested ? 'Interested' : 'Express Interest'}
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onBookmark(funding.id);
              }}
              className={`flex-1 h-10 px-3 inline-flex items-center justify-center gap-2 rounded-full border transition-colors text-sm ${
                funding.user_has_bookmarked
                  ? 'border-[color:var(--accent)]/20 bg-[color:var(--accent)]/10 text-[color:var(--accent)]'
                  : 'border-[color:var(--border)] bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30'
              }`}
            >
              <Bookmark className={`size-4 ${funding.user_has_bookmarked ? 'fill-current' : ''}`} />
              {funding.user_has_bookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
            
            <a
              href={funding.data.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-10 px-3 inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium border border-[color:var(--border)] bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 transition-colors"
            >
              <Globe className="size-4" />
              Website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// FundingDetailsSidebar component
function FundingDetailsSidebar({ 
  funding, 
  onExpressInterest,
  onBookmark
}: { 
  funding: FundingOpportunity | null;
  onExpressInterest: (id: string) => void;
  onBookmark: (id: string) => void;
}) {
  if (!funding) return null;
  
  return (
    <div className="h-fit card space-y-6">
      <div className="flex items-center justify-between">
        {/* Express Interest - Top Left */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpressInterest(funding.id);
          }}
          className={`h-10 px-4 inline-flex items-center gap-2 rounded-full text-sm font-medium transition-colors ${
            funding.user_is_interested
              ? 'bg-[color:var(--accent)]/10 text-[color:var(--accent)] border border-[color:var(--accent)]/20'
              : 'bg-[color:var(--accent)] text-[color:var(--background)] hover:bg-[color:var(--accent)]/90'
          }`}
        >
          <Heart className={`size-4 ${funding.user_is_interested ? 'fill-current' : ''}`} />
          {funding.user_is_interested ? 'Interested' : 'Express Interest'}
        </button>
        
        {/* Bookmark and Website - Top Right */}
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(funding.id);
            }}
            className={`h-10 px-3 inline-flex items-center justify-center gap-2 rounded-full border transition-colors text-sm ${
              funding.user_has_bookmarked
                ? 'border-[color:var(--accent)]/20 bg-[color:var(--accent)]/10 text-[color:var(--accent)]'
                : 'border-[color:var(--border)] bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30'
            }`}
          >
            <Bookmark className={`size-4 ${funding.user_has_bookmarked ? 'fill-current' : ''}`} />
            <span>{funding.user_has_bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>
          
          <a
            href={funding.data.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-3 inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium border border-[color:var(--border)] bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 transition-colors"
          >
            <span>Website</span>
            <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Title and Country */}
        <div className="flex items-start gap-4">
          <div className="text-4xl">{getCountryFlag(funding.data.country_code)}</div>
          <div className="flex-1">
            <h3 className="font-bold text-2xl leading-tight mb-2">{funding.data.title}</h3>
          </div>
        </div>
        
        {/* Key Details - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl">
            <div>
              <div className="text-sm text-[color:var(--muted-foreground)]">Funding Amount</div>
              <div className="font-bold text-xl text-[color:var(--accent)]">
                {formatAmount(funding.data.amount, funding.data.currency)}
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl">
            <div>
              <div className="text-sm text-[color:var(--muted-foreground)]">Application Deadline</div>
              <div className={`font-bold text-lg ${getDeadlineUrgency(funding.data.deadline)}`}>
                {formatDeadline(funding.data.deadline)}
              </div>
              <div className="text-xs text-[color:var(--muted-foreground)]">
                {new Date(funding.data.deadline).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* About and Eligibility - Side by Side with Backgrounds */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {funding.data.description && (
            <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl space-y-2">
              <h4 className="font-semibold text-lg">About</h4>
              <p className="text-[color:var(--muted-foreground)] leading-relaxed text-sm">
                {funding.data.description}
              </p>
            </div>
          )}
          
          {funding.data.eligibility && (
            <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl space-y-2">
              <h4 className="font-semibold text-lg">Eligibility</h4>
              <p className="text-[color:var(--muted-foreground)] leading-relaxed text-sm">
                {funding.data.eligibility}
              </p>
            </div>
          )}
        </div>
        
        {/* Creator Info */}
        {funding.creator && (
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Added by</h4>
            <div className="flex items-center gap-3 p-3 bg-[color:var(--muted)]/10 rounded-xl">
              <div className="size-12 rounded-full overflow-hidden bg-[color:var(--muted)]/40 border border-[color:var(--border)]">
                {funding.creator.avatarUrl ? (
                  <Image 
                    src={funding.creator.avatarUrl} 
                    alt="" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent)]/30 flex items-center justify-center text-lg font-medium text-[color:var(--accent)]">
                    {(funding.creator.displayName || funding.creator.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium">{funding.creator.displayName || funding.creator.username}</div>
                <div className="text-xs text-[color:var(--muted-foreground)]">
                  Added {new Date(funding.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Community Interest */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Users className="size-5 text-[color:var(--accent)]" />
              Community Interest
            </h4>
            <span className="text-sm text-[color:var(--muted-foreground)]">
              Connect with others pursuing this opportunity
            </span>
          </div>
          
          {funding.interested_user_ids && funding.interested_user_ids.length > 0 ? (
            <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl">
              <InterestedUserAvatarsLarge userIds={funding.interested_user_ids} maxDisplay={8} />
            </div>
          ) : (
            <div className="p-4 bg-[color:var(--muted)]/10 rounded-xl text-center">
              <div className="text-sm text-[color:var(--muted-foreground)]">
                Be the first to express interest in this opportunity
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main funding page
export default function FundingPage() {
  const { status } = useAuth();
  
  // Add custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .funding-scroll {
        scrollbar-width: none;
      }
      .funding-scroll::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFunding, setSelectedFunding] = useState<FundingOpportunity | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  // const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FundingFilters>({
    search: '',
    countries: [],
    deadlineRange: 'all',
    amountRange: 'all',
    sortBy: 'deadline-asc',
    bookmarked: false
  });

  // Note: Bookmarks will be fetched along with interests in the main query
  // No separate bookmark fetch needed

  // Fetch funding opportunities
  useEffect(() => {
    if (status !== "authenticated") return;
    
    const fetchFunding = async () => {
      setLoading(true);
      // Only reset animation on initial load, not on filter changes
      if (!hasInitiallyLoaded) {
        setAnimateIn(false);
      }
      try {
        const { data: currentUser } = await supabase.auth.getUser();
        const currentUserId = currentUser?.user?.id;

        let query = supabase
          .from('funding_opportunities')
          .select(`
            id,
            created_by,
            created_at,
            updated_at,
            data,
            funding_interests(user_id, data)
          `);

        // Apply filters
        if (filters.search) {
          // Search in title and description
          query = query.or(`data->>title.ilike.%${filters.search}%,data->>description.ilike.%${filters.search}%`);
        }

        if (filters.countries.length > 0) {
          query = query.in('data->>country_code', filters.countries);
        }

        if (filters.deadlineRange !== 'all') {
          const now = new Date();
          const deadlineAfter = (() => {
            const date = new Date();
            switch (filters.deadlineRange) {
              case 'next-30-days':
                date.setDate(now.getDate() + 30);
                break;
              case 'next-3-months':
                date.setMonth(now.getMonth() + 3);
                break;
              case 'next-6-months':
                date.setMonth(now.getMonth() + 6);
                break;
            }
            return date;
          })();
          
          query = query.gte('data->>deadline', now.toISOString());
          query = query.lte('data->>deadline', deadlineAfter.toISOString());
        }

        if (filters.amountRange !== 'all') {
          switch (filters.amountRange) {
            case 'under-50k':
              query = query.lt('data->>amount', 5000000); // $50K in cents
              break;
            case '50k-500k':
              query = query.gte('data->>amount', 5000000);
              query = query.lt('data->>amount', 50000000); // $500K in cents
              break;
            case '500k-plus':
              query = query.gte('data->>amount', 50000000);
              break;
          }
        }

        // Apply sorting
        switch (filters.sortBy) {
          case 'deadline-asc':
            query = query.order('data->>deadline', { ascending: true });
            break;
          case 'deadline-desc':
            query = query.order('data->>deadline', { ascending: false });
            break;
          case 'amount-desc':
            query = query.order('data->>amount', { ascending: false });
            break;
          case 'created-desc':
            query = query.order('created_at', { ascending: false });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }

        query = query.limit(100); // Increase limit for better grouping

        const { data, error } = await query;
        if (error) throw error;

        // Transform data to match interface
        let transformedData: FundingOpportunity[] = (data || []).map(row => {
          const interests = (row as Record<string, unknown>).funding_interests as Array<{user_id: string, data?: {is_bookmarked?: boolean}}> || [];
          
          // Check if user is interested (has any interest record)
          const userIsInterested = currentUserId ? interests.some((interest) => interest.user_id === currentUserId) : false;
          
          // Check if user has bookmarked (has interest record with is_bookmarked: true)
          const userHasBookmarked = currentUserId ? interests.some((interest) => 
            interest.user_id === currentUserId && interest.data?.is_bookmarked === true
          ) : false;
          
          return {
            id: row.id,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_at: row.updated_at,
            data: row.data as FundingOpportunity['data'],
            interest_count: interests.length,
            user_is_interested: userIsInterested,
            interested_user_ids: interests.map((interest) => interest.user_id),
            user_has_bookmarked: userHasBookmarked,
          };
        });

        // Apply bookmarked filter if enabled
        if (filters.bookmarked) {
          transformedData = transformedData.filter(opportunity => opportunity.user_has_bookmarked);
        }

        setOpportunities(transformedData);
        
        // Auto-select first opportunity for details sidebar
        if (transformedData.length > 0) {
          setSelectedFunding(transformedData[0]);
        }
        
        // Trigger animation only on initial load
        if (!hasInitiallyLoaded) {
          setHasInitiallyLoaded(true);
          setTimeout(() => setAnimateIn(true), 100);
        }
      } catch (error) {
        console.error('Error fetching funding opportunities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFunding();
  }, [status, filters, hasInitiallyLoaded]);

  const handleBookmark = async (fundingId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const opportunity = opportunities.find(o => o.id === fundingId);
      const isBookmarked = opportunity?.user_has_bookmarked || false;

      // Check if user already has an interest record
      const { data: existingInterest } = await supabase
        .from('funding_interests')
        .select('id, data')
        .eq('funding_opportunity_id', fundingId)
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (existingInterest) {
        // Update existing interest record
        const updatedData = {
          ...existingInterest.data,
          is_bookmarked: !isBookmarked,
          bookmarked_at: !isBookmarked ? new Date().toISOString() : null,
        };

        await supabase
          .from('funding_interests')
          .update({ data: updatedData })
          .eq('id', existingInterest.id);
      } else {
        // Create new interest record with bookmark
        await supabase
          .from('funding_interests')
          .insert({
            funding_opportunity_id: fundingId,
            user_id: user.user.id,
            data: {
              is_bookmarked: !isBookmarked,
              bookmarked_at: !isBookmarked ? new Date().toISOString() : null,
            }
          });
      }

      // Update local state optimistically
      setOpportunities(prev => prev.map(opp => 
        opp.id === fundingId 
          ? { ...opp, user_has_bookmarked: !isBookmarked }
          : opp
      ));

      // Update selected funding if it's the same one
      if (selectedFunding?.id === fundingId) {
        setSelectedFunding(prev => prev ? {
          ...prev,
          user_has_bookmarked: !isBookmarked
        } : null);
      }
    } catch (error) {
      console.error('Error bookmarking opportunity:', error);
    }
  };

  const handleExpressInterest = async (fundingId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Check if already interested
      const opportunity = opportunities.find(o => o.id === fundingId);
      if (opportunity?.user_is_interested) {
        // Remove interest
        await supabase
          .from('funding_interests')
          .delete()
          .eq('funding_opportunity_id', fundingId)
          .eq('user_id', user.user.id);
      } else {
        // Express interest
        await supabase
          .from('funding_interests')
          .insert({
            funding_opportunity_id: fundingId,
            user_id: user.user.id,
            data: {}
          });
      }

      // Update local state optimistically
      setOpportunities(prev => prev.map(opp => 
        opp.id === fundingId 
          ? { 
              ...opp, 
              user_is_interested: !opp.user_is_interested,
              interest_count: (opp.interest_count || 0) + (opp.user_is_interested ? -1 : 1)
            }
          : opp
      ));

      // Update selected funding if it's the same one
      if (selectedFunding?.id === fundingId) {
        setSelectedFunding(prev => prev ? {
          ...prev,
          user_is_interested: !prev.user_is_interested,
          interest_count: (prev.interest_count || 0) + (prev.user_is_interested ? -1 : 1)
        } : null);
      }
    } catch (error) {
      console.error('Error expressing interest:', error);
    }
  };

  const handleFundingAdded = () => {
    // Refresh the funding list when a new opportunity is added (no animation)
    if (status === "authenticated") {
      const fetchFunding = async () => {
        try {
          const { data, error } = await supabase
            .from('funding_opportunities')
            .select(`
              id,
              created_by,
              created_at,
              updated_at,
              data,
              funding_interests(user_id, data)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

          if (error) throw error;

          const { data: currentUser } = await supabase.auth.getUser();
          const currentUserId = currentUser?.user?.id;

          const transformedData: FundingOpportunity[] = (data || []).map(row => {
            const interests = (row as Record<string, unknown>).funding_interests as Array<{user_id: string, data?: {is_bookmarked?: boolean}}> || [];
            const userIsInterested = currentUserId ? interests.some((interest) => interest.user_id === currentUserId) : false;
            const userHasBookmarked = currentUserId ? interests.some((interest) => 
              interest.user_id === currentUserId && interest.data?.is_bookmarked === true
            ) : false;
            
            return {
              id: row.id,
              created_by: row.created_by,
              created_at: row.created_at,
              updated_at: row.updated_at,
              data: row.data as FundingOpportunity['data'],
              interest_count: interests.length,
              user_is_interested: userIsInterested,
              interested_user_ids: interests.map((interest) => interest.user_id),
              user_has_bookmarked: userHasBookmarked,
            };
          });

          setOpportunities(transformedData);
          
          // Auto-select first opportunity if none selected
          if (transformedData.length > 0 && !selectedFunding) {
            setSelectedFunding(transformedData[0]);
          }
        } catch (error) {
          console.error('Error refreshing funding opportunities:', error);
        }
      };
      
      fetchFunding();
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="size-8 border-2 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[color:var(--muted-foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Euro className="size-12 text-[color:var(--muted-foreground)] mx-auto" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Sign in to view funding opportunities</h1>
            <p className="text-[color:var(--muted-foreground)]">
              Discover grants, competitions, and funding programs with the CivicMatch community.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--muted)]/5">
      <div className="w-full px-4 md:px-6 lg:px-8 py-6">
        {/* Header with Search, Filters, and Add Button inline */}
        <div className={`mb-6 transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Search, Filters, and Add Button Row */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-[color:var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search funding opportunities..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full h-10 pl-10 pr-4 rounded-full border border-[color:var(--border)] bg-[color:var(--background)] text-sm placeholder:text-[color:var(--muted-foreground)] placeholder:opacity-5 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)]"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 md:pb-0">
              <div className="flex items-center gap-2 overflow-x-auto">
              {/* Bookmarked Filter */}
              <button
                onClick={() => setFilters(prev => ({ ...prev, bookmarked: !prev.bookmarked }))}
                className={`h-10 w-10 md:w-auto md:px-4 inline-flex items-center justify-center md:gap-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  filters.bookmarked
                    ? 'bg-[color:var(--accent)] text-[color:var(--background)]'
                    : 'border border-[color:var(--border)] bg-[color:var(--background)] hover:bg-[color:var(--muted)]/20'
                }`}
                title="Bookmarked"
              >
                <Bookmark className="size-4" />
                <span className="hidden md:inline ml-2">Bookmarked</span>
              </button>
              
              {/* Country Filter */}
              <div className="relative flex-shrink-0">
                <Globe className={`absolute left-3 top-1/2 transform -translate-y-1/2 size-4 pointer-events-none ${filters.countries.length > 0 ? 'text-[color:var(--accent)]' : 'text-[color:var(--muted-foreground)]'}`} />
                <select
                  value={filters.countries[0] || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    countries: e.target.value ? [e.target.value] : [] 
                  }))}
                  className={`h-10 pl-10 pr-1 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)] appearance-none w-10 md:w-40 text-transparent md:text-current ${
                    filters.countries.length > 0 
                      ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/10' 
                      : 'border-[color:var(--border)] bg-[color:var(--background)]'
                  }`}
                  title="Filter by country"
                >
                  <option value="">Countries</option>
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Deadline Filter */}
              <div className="relative flex-shrink-0">
                <Clock className={`absolute left-3 top-1/2 transform -translate-y-1/2 size-4 pointer-events-none ${filters.deadlineRange !== 'all' ? 'text-[color:var(--accent)]' : 'text-[color:var(--muted-foreground)]'}`} />
                <select
                  value={filters.deadlineRange}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    deadlineRange: e.target.value as FundingFilters['deadlineRange']
                  }))}
                  className={`h-10 pl-10 pr-1 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)] appearance-none w-10 md:w-36 text-transparent md:text-current ${
                    filters.deadlineRange !== 'all'
                      ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/10'
                      : 'border-[color:var(--border)] bg-[color:var(--background)]'
                  }`}
                  title="Filter by deadline"
                >
                  <option value="all">Deadlines</option>
                  <option value="next-30-days">30 days</option>
                  <option value="next-3-months">3 months</option>
                  <option value="next-6-months">6 months</option>
                </select>
              </div>
              
              {/* Amount Filter */}
              <div className="relative flex-shrink-0">
                <DollarSign className={`absolute left-3 top-1/2 transform -translate-y-1/2 size-4 pointer-events-none ${filters.amountRange !== 'all' ? 'text-[color:var(--accent)]' : 'text-[color:var(--muted-foreground)]'}`} />
                <select
                  value={filters.amountRange}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    amountRange: e.target.value as FundingFilters['amountRange']
                  }))}
                  className={`h-10 pl-10 pr-1 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)] appearance-none w-10 md:w-32 text-transparent md:text-current ${
                    filters.amountRange !== 'all'
                      ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/10'
                      : 'border-[color:var(--border)] bg-[color:var(--background)]'
                  }`}
                  title="Filter by amount"
                >
                  <option value="all">Amounts</option>
                  <option value="under-50k">&lt;$50K</option>
                  <option value="50k-500k">$50K-500K</option>
                  <option value="500k-plus">$500K+</option>
                </select>
              </div>
              
              {/* Sort Filter */}
              <div className="relative flex-shrink-0">
                <TrendingUp className={`absolute left-3 top-1/2 transform -translate-y-1/2 size-4 pointer-events-none ${filters.sortBy !== 'deadline-asc' ? 'text-[color:var(--accent)]' : 'text-[color:var(--muted-foreground)]'}`} />
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    sortBy: e.target.value as FundingFilters['sortBy']
                  }))}
                  className={`h-10 pl-10 pr-1 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)] appearance-none w-10 md:w-40 text-transparent md:text-current ${
                    filters.sortBy !== 'deadline-asc'
                      ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/10'
                      : 'border-[color:var(--border)] bg-[color:var(--background)]'
                  }`}
                  title="Sort by"
                >
                  <option value="deadline-asc">Soonest</option>
                  <option value="deadline-desc">Latest</option>
                  <option value="amount-desc">Highest $</option>
                  <option value="interest-desc">Popular</option>
                  <option value="created-desc">Recent</option>
                </select>
              </div>
              </div>
              
              {/* Total Opportunities - Mobile Only */}
              <div className="lg:hidden flex items-center gap-1 text-sm text-[color:var(--muted-foreground)] bg-[color:var(--muted)]/30 px-3 py-2 rounded-full flex-shrink-0">
                <span className="font-medium">{opportunities.length}</span>
              </div>
            </div>
            
            {/* Add New Funding Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="h-10 px-4 md:px-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] hover:bg-[color:var(--accent)]/90 transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add New Funding</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Main Content - Responsive Layout */}
        <div className="lg:flex lg:gap-6 lg:h-[calc(100vh-180px)]">
          {/* Desktop: Three Panel Layout */}
          <div className={`hidden lg:block transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '50ms' }}>
            <CalendarSidebar 
              opportunities={opportunities}
              onMonthSelect={(year, month) => {
                // Filter opportunities for selected month/year
                console.log(`Selected ${month} ${year}`);
                // TODO: Implement month filtering
              }}
            />
          </div>
          
          {/* Funding List - Center on Desktop, Full Width on Mobile */}
          <div className={`lg:flex-1 lg:space-y-4 lg:overflow-y-auto lg:pr-3 funding-scroll transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="h-6 bg-[color:var(--muted)]/40 rounded mb-3" />
                    <div className="h-4 bg-[color:var(--muted)]/40 rounded mb-2 w-3/4" />
                    <div className="h-4 bg-[color:var(--muted)]/40 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : opportunities.length === 0 ? (
              <div className={`text-center py-12 transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '350ms' }}>
                <Euro className="size-12 text-[color:var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No funding opportunities yet</h3>
                <p className="text-[color:var(--muted-foreground)] mb-6">
                  Be the first to add a funding opportunity for the community.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="h-10 px-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] hover:bg-[color:var(--accent)]/90 transition-colors text-sm font-medium"
                >
                  <Plus className="size-4" />
                  Add First Opportunity
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Time-grouped layout for both desktop and mobile */}
                {(() => {
                  let globalCardIndex = 0;
                  return Object.entries(groupOpportunitiesByTime(opportunities)).map(([timeGroup, groupedOpportunities]) => (
                    <div key={timeGroup} className="space-y-3">
                      {/* Time Group Header */}
                      <div className={`flex items-center gap-2 pb-2 border-b border-[color:var(--border)] transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${250 + Math.floor(globalCardIndex / 3) * 50}ms` }}>
                        <h3 className="font-semibold text-lg">{timeGroup}</h3>
                        <span className="text-sm text-[color:var(--muted-foreground)]">
                          ({groupedOpportunities.length} {groupedOpportunities.length === 1 ? 'opportunity' : 'opportunities'})
                        </span>
                      </div>
                      
                      {/* Opportunities in this time group */}
                      <div className="space-y-3">
                      {/* Desktop: Use FundingCard */}
                      <div className="hidden lg:block space-y-4">
                          {groupedOpportunities.map((funding) => {
                            const currentIndex = globalCardIndex++;
                            return (
                              <div
                                key={funding.id}
                                className={`transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} mx-0.5`}
                                style={{ transitionDelay: `${350 + currentIndex * 120}ms` }}
                              >
                                <FundingCard
                                  funding={funding}
                                  onClick={() => setSelectedFunding(funding)}
                                  isSelected={selectedFunding?.id === funding.id}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Mobile: Use MobileFundingCard */}
                        <div className="lg:hidden space-y-3">
                          {groupedOpportunities.map((funding) => {
                            const currentIndex = globalCardIndex - groupedOpportunities.length + groupedOpportunities.indexOf(funding);
                            return (
                              <div
                                key={funding.id}
                                className={`transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                                style={{ transitionDelay: `${350 + currentIndex * 120}ms` }}
                              >
                                <MobileFundingCard
                                  funding={funding}
                                  onClick={() => {
                                    setSelectedFunding(funding);
                                    setShowMobileDetails(true);
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Desktop: Details Sidebar - Right Side */}
          <div className={`hidden lg:block lg:flex-1 lg:overflow-y-auto funding-scroll transition-all duration-600 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '150ms' }}>
            {selectedFunding ? (
              <FundingDetailsSidebar
                funding={selectedFunding}
                onExpressInterest={handleExpressInterest}
                onBookmark={handleBookmark}
              />
            ) : (
              <div className="h-full card flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Euro className="size-12 text-[color:var(--muted-foreground)] mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Select a funding opportunity</h3>
                    <p className="text-[color:var(--muted-foreground)]">
                      Click on any opportunity to view details and see interested collaborators.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Funding Modal */}
      <AddFundingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleFundingAdded}
      />

      {/* Mobile Details Modal */}
      <MobileDetailsModal
        funding={selectedFunding}
        isOpen={showMobileDetails}
        onClose={() => setShowMobileDetails(false)}
        onExpressInterest={handleExpressInterest}
        onBookmark={handleBookmark}
      />
    </div>
  );
}
