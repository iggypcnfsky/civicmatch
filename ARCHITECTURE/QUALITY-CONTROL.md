# Profile Quality Control System

## Overview

This document outlines the implementation of a profile quality control system that ensures users see and interact with only high-quality, complete profiles across the CivicMatch platform. The system implements a 50% completion threshold to maintain platform quality while providing clear feedback to users with incomplete profiles.

## Goals & Requirements

### Core Requirements
- **50% Completion Threshold**: Only profiles ≥50% complete are fully interactive
- **Map Behavior**: Incomplete profiles show with 20% opacity, "incomplete profile" indicator, no click interaction
- **Explorer Filtering**: Profile browser (`/profiles`) excludes profiles <50% complete
- **Unified Styling**: Both incomplete profiles and location-update profiles have same visual treatment (no dashed borders)
- **Consistent Experience**: Same completion calculation across all platform features
- **User Notification**: Prominent banner for incomplete profile owners with clear guidance

### User Experience Goals
- **Quality Assurance**: Users only interact with substantive, complete profiles
- **Clear Feedback**: Incomplete profile owners understand what needs improvement through banner and visual indicators
- **Motivation**: Visual indicators and prominent notifications encourage profile completion
- **Accessibility**: Clear visual distinctions that work in light/dark modes
- **Seamless Integration**: Quality control integrates naturally with existing UI patterns

## Architecture Analysis

### Current Profile Completion System ✅ EXISTS

The platform already has a robust profile completion calculation system:

**Location**: `src/lib/email/services/ProfileCompletionService.ts`

**Calculation Logic**:
```typescript
// Weighted scoring system (total: 85 points)
const fields = [
  { key: 'displayName', weight: 15 },      // Essential
  { key: 'bio', weight: 15 },              // Essential  
  { key: 'skills', weight: 15 },           // Essential
  { key: 'tags', weight: 10 },             // Important
  { key: 'fame', weight: 10 },             // Important
  { key: 'aim', weight: 8 },               // Important
  { key: 'game', weight: 8 },              // Strategy
  { key: 'workStyle', weight: 5 },         // Optional
  { key: 'helpNeeded', weight: 4 }         // Optional
];

// 50% threshold = 42.5 points (rounded to 43 points)
```

**Key Features**:
- ✅ Handles both string and array field formats
- ✅ Special logic for complex fields (aim array structure)
- ✅ Singleton pattern for performance
- ✅ Utility method for single profile calculation
- ✅ Production-tested and deployed

### Current Data Flow

**Explore Page** (`src/app/page.tsx`):
```typescript
// Current: Fetches all profiles without completion filtering
const { data, error } = await supabase
  .from("profiles")
  .select("user_id, username, data, created_at")
  .order("created_at", { ascending: false })
  .limit(500);
```

**Profiles Browser** (`src/app/profiles/page.tsx`):
```typescript
// Current: Random profile selection without completion filtering
const { data, error } = await supabase
  .from("profiles")
  .select("user_id, username, data")
  .range(randomOffset, randomOffset);
```

**Map Component** (`src/components/ExploreMap.tsx`):
```typescript
// Current: Shows all profiles with location-based styling only
const createPillContent = (profile) => {
  // Only handles location-based opacity (needsUpdate profiles)
  pillDiv.className = `
    ${profile.location.needsUpdate ? 'border-dashed border-2 p-1' : ''}
  `;
}
```

## Implementation Plan

### Phase 1: Core Profile Quality Service

#### 1.1 Create Centralized Quality Service

**File**: `src/lib/services/ProfileQualityService.ts`

```typescript
import { profileCompletionService } from '@/lib/email/services/ProfileCompletionService';

export interface ProfileQualityInfo {
  userId: string;
  completionPercentage: number;
  isQualityProfile: boolean; // >= 50%
  missingFields: string[];
}

export interface QualityFilteredProfile {
  // ... existing profile fields
  qualityInfo: ProfileQualityInfo;
}

export class ProfileQualityService {
  private static readonly QUALITY_THRESHOLD = 50;

  /**
   * Calculate quality info for a single profile
   */
  static calculateQualityInfo(
    userId: string, 
    profileData: Record<string, unknown>
  ): ProfileQualityInfo {
    const { completionPercentage, missingFields } = 
      profileCompletionService.calculateSingleProfileCompletion(profileData);
    
    return {
      userId,
      completionPercentage,
      isQualityProfile: completionPercentage >= this.QUALITY_THRESHOLD,
      missingFields: missingFields.map(f => f.field)
    };
  }

  /**
   * Filter profiles to only quality profiles (≥50%)
   */
  static filterQualityProfiles<T extends { data: Record<string, unknown>; user_id: string }>(
    profiles: T[]
  ): T[] {
    return profiles.filter(profile => {
      const qualityInfo = this.calculateQualityInfo(profile.user_id, profile.data);
      return qualityInfo.isQualityProfile;
    });
  }

  /**
   * Add quality info to profiles without filtering
   */
  static enrichWithQualityInfo<T extends { data: Record<string, unknown>; user_id: string }>(
    profiles: T[]
  ): Array<T & { qualityInfo: ProfileQualityInfo }> {
    return profiles.map(profile => ({
      ...profile,
      qualityInfo: this.calculateQualityInfo(profile.user_id, profile.data)
    }));
  }

  /**
   * Check if single profile meets quality threshold
   */
  static isQualityProfile(profileData: Record<string, unknown>): boolean {
    const { completionPercentage } = 
      profileCompletionService.calculateSingleProfileCompletion(profileData);
    return completionPercentage >= this.QUALITY_THRESHOLD;
  }
}
```

#### 1.2 Update Profile Type Definitions

**File**: `src/types/profile.ts` (new file)

```typescript
export interface ProfileQualityInfo {
  userId: string;
  completionPercentage: number;
  isQualityProfile: boolean;
  missingFields: string[];
}

export interface BaseProfile {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  tags?: string[];
  // ... other profile fields
}

export interface ProfileWithQuality extends BaseProfile {
  qualityInfo: ProfileQualityInfo;
}

export interface ProfileWithLocation extends ProfileWithQuality {
  location: {
    coordinates?: { lat: number; lng: number; accuracy: string };
    displayName?: string;
    placeId?: string;
    source?: 'places_autocomplete' | 'geocoded' | 'manual';
    geocodedAt?: string;
    raw: string | object;
    needsUpdate?: boolean;
  };
}
```

### Phase 2: Explore Page Quality Filtering

#### 2.1 Update Explore Page Data Fetching

**File**: `src/app/page.tsx`

**Changes Required**:

1. **Import Quality Service**:
```typescript
import { ProfileQualityService } from '@/lib/services/ProfileQualityService';
import type { ProfileWithLocation } from '@/types/profile';
```

2. **Update Profile Mapping Function**:
```typescript
function mapRowToProfile(row: ProfileRow): ProfileWithLocation {
  const d = (row.data || {}) as Record<string, unknown>;
  
  // Calculate quality info
  const qualityInfo = ProfileQualityService.calculateQualityInfo(row.user_id, d);
  
  return {
    id: row.user_id,
    name: /* existing name logic */,
    role: /* existing role logic */,
    // ... existing fields
    qualityInfo,
    location: /* existing location logic */
  };
}
```

3. **Update fetchAllProfiles for Map**:
```typescript
async function fetchAllProfiles(filterFavorites?: boolean) {
  // ... existing code
  
  // Enrich with quality info (don't filter - map needs all profiles)
  let mapped = (data ?? []).map(mapRowToProfile);
  
  // Apply favorites filter if needed
  if (shouldFilterFavorites) {
    mapped = mapped.filter((p) => favoriteIds.has(p.id));
  }
  
  setItems(mapped);
  // ... rest of function
}
```

#### 2.2 Update ExploreMap Component

**File**: `src/components/ExploreMap.tsx`

**Changes Required**:

1. **Update Interface**:
```typescript
import type { ProfileWithLocation } from '@/types/profile';

// Interface already defined in types/profile.ts
```

2. **Update Pill Creation Logic**:
```typescript
const createPillContent = useCallback((profile: ProfileWithLocation) => {
  const pillDiv = document.createElement('div');
  const isIncomplete = !profile.qualityInfo.isQualityProfile;
  const needsLocationUpdate = profile.location.needsUpdate;
  
  pillDiv.className = `
    inline-flex items-center justify-center rounded-full 
    transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl
    ${invitedIds.has(profile.id) ? 'opacity-50' : ''}
    ${needsLocationUpdate ? 'border-dashed border-2 p-1' : ''}
    ${isIncomplete ? 'pointer-events-none' : ''} // Disable clicks for incomplete
  `;
  
  // Start with invisible for fade-in animation
  pillDiv.style.opacity = '0';
  pillDiv.style.transform = 'scale(0.8)';
  
  // Apply completion-based opacity
  const finalOpacity = isIncomplete ? '0.2' : '1';
  
  // Apply styles
  pillDiv.style.boxShadow = '0 10px 25px -3px rgba(0, 0, 0, 0.46), 0 4px 6px -2px rgba(0, 0, 0, 0.23)';
  
  // Location update styling (takes precedence over completion)
  if (needsLocationUpdate) {
    pillDiv.style.backgroundColor = '#6B7280';
    pillDiv.style.borderColor = '#9CA3AF';
    pillDiv.style.opacity = '0.5'; // Keep existing location-based opacity
  }
  
  // Avatar creation (existing logic)
  const avatarSpan = document.createElement('span');
  // ... existing avatar logic
  
  // Add completion indicator for incomplete profiles
  if (isIncomplete && !needsLocationUpdate) {
    const indicator = document.createElement('div');
    indicator.className = 'absolute -top-1 -right-1 bg-amber-500 text-white text-xs px-1 py-0.5 rounded text-center';
    indicator.textContent = '!';
    indicator.title = 'Incomplete Profile';
    indicator.style.fontSize = '10px';
    indicator.style.minWidth = '16px';
    indicator.style.height = '16px';
    indicator.style.display = 'flex';
    indicator.style.alignItems = 'center';
    indicator.style.justifyContent = 'center';
    avatarSpan.appendChild(indicator);
  }
  
  // Update hover events to show completion info
  pillDiv.addEventListener('mouseenter', () => {
    if (isIncomplete) return; // No hover for incomplete profiles
    
    const rect = pillDiv.getBoundingClientRect();
    setHoverPosition({ 
      x: rect.left + rect.width / 2, 
      y: rect.top 
    });
    setHoveredProfile(profile);
  });

  pillDiv.addEventListener('mouseleave', () => {
    setHoveredProfile(null);
    setHoverPosition(null);
  });

  pillDiv.appendChild(avatarSpan);
  
  // Set final opacity after creation
  setTimeout(() => {
    if (marker.content instanceof HTMLElement) {
      marker.content.style.opacity = finalOpacity;
      marker.content.style.transform = 'scale(1)';
    }
  }, delay);

  return pillDiv;
}, [invitedIds]);
```

3. **Update Click Handler**:
```typescript
// In the marker creation loop
marker.addListener('click', () => {
  const isIncomplete = !profile.qualityInfo.isQualityProfile;
  
  if (isIncomplete) {
    // Show tooltip or do nothing for incomplete profiles
    console.log('Cannot interact with incomplete profile');
    return;
  }
  
  if (onProfileClick) {
    onProfileClick(profile);
  } else {
    window.location.href = `/profiles?user=${encodeURIComponent(profile.id)}`;
  }
});
```

### Phase 3: Profile Browser Quality Filtering

#### 3.1 Update Profiles Page

**File**: `src/app/profiles/page.tsx`

**Changes Required**:

1. **Add Quality Filtering to Random Profile Selection**:
```typescript
// In the random profile selection effect
useEffect(() => {
  (async () => {
    if (!isAuthenticated) return;
    const id = params.get("user");
    if (id) return;
    
    // Get count of quality profiles only
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("user_id, data")
      .limit(1000); // Reasonable limit for filtering
    
    if (!allProfiles) return;
    
    // Filter to quality profiles
    const qualityProfiles = ProfileQualityService.filterQualityProfiles(
      allProfiles.map(p => ({ ...p, user_id: p.user_id, data: p.data }))
    );
    
    if (qualityProfiles.length === 0) return;
    
    // Select random from quality profiles
    let attempt = 0;
    let chosen = null;
    
    while (attempt < 10 && !chosen) {
      const randomIndex = Math.floor(Math.random() * qualityProfiles.length);
      const candidate = qualityProfiles[randomIndex];
      
      const isInvited = invitedIds.has(candidate.user_id);
      const isSelf = currentUserId && candidate.user_id === currentUserId;
      
      if (!isInvited && !isSelf) {
        chosen = candidate;
      }
      attempt += 1;
    }
    
    if (!chosen) return;
    
    // Fetch full profile data for chosen profile
    const { data: fullProfile } = await supabase
      .from("profiles")
      .select("user_id, username, data")
      .eq("user_id", chosen.user_id)
      .single();
    
    if (fullProfile) {
      // ... existing profile mapping logic
    }
  })();
}, [/* dependencies */]);
```

2. **Add Quality Check for Direct Profile Access**:
```typescript
// In the specific profile loading effect
useEffect(() => {
  (async () => {
    if (!isAuthenticated) return;
    const id = params.get("user");
    if (!id) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, data")
      .eq("user_id", id)
      .maybeSingle();
    
    if (error || !data) return;
    
    // Check if profile meets quality threshold
    const isQuality = ProfileQualityService.isQualityProfile(data.data);
    
    if (!isQuality) {
      // Redirect to random quality profile or show message
      router.push('/profiles');
      return;
    }
    
    // ... existing profile mapping logic
  })();
}, [/* dependencies */]);
```

#### 3.2 Add Quality Indicator UI

**File**: `src/app/profiles/page.tsx`

Add visual indicators for profile quality:

```typescript
// Add to the profile display JSX
{profile && (
  <div className="space-y-6">
    {/* Quality Badge */}
    <div className="flex items-center gap-2 mb-4">
      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm">
        <CheckCircle className="size-4" />
        Quality Profile
      </div>
      <div className="text-sm text-[color:var(--muted-foreground)]">
        {profile.qualityInfo?.completionPercentage || 'N/A'}% complete
      </div>
    </div>
    
    {/* Existing profile content */}
    {/* ... */}
  </div>
)}
```

### Phase 4: Database Query Optimization

#### 4.1 Server-Side Quality Filtering

**File**: `src/app/api/profiles/quality/route.ts` (new)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { ProfileQualityService } from '@/lib/services/ProfileQualityService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '24');
  const offset = parseInt(searchParams.get('offset') || '0');
  const qualityOnly = searchParams.get('qualityOnly') === 'true';

  const supabase = createClient();
  
  try {
    // Fetch profiles with pagination
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, username, data, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    let profiles = data || [];

    // Apply quality filtering if requested
    if (qualityOnly) {
      profiles = ProfileQualityService.filterQualityProfiles(profiles);
    } else {
      // Enrich with quality info for map view
      profiles = ProfileQualityService.enrichWithQualityInfo(profiles);
    }

    return NextResponse.json({
      profiles,
      hasMore: profiles.length === limit,
      nextOffset: offset + limit
    });

  } catch (error) {
    console.error('Profile quality API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}
```

#### 4.2 Update Client-Side Data Fetching

Update explore and profiles pages to use the new API endpoint:

```typescript
// In src/app/page.tsx (for map - needs all profiles)
async function fetchAllProfiles(filterFavorites?: boolean) {
  const response = await fetch('/api/profiles/quality?qualityOnly=false&limit=500');
  const { profiles } = await response.json();
  
  let mapped = profiles.map(mapRowToProfile);
  if (filterFavorites) {
    mapped = mapped.filter(p => favoriteIds.has(p.id));
  }
  
  setItems(mapped);
}

// In src/app/profiles/page.tsx (for browser - quality only)
async function fetchQualityProfiles() {
  const response = await fetch('/api/profiles/quality?qualityOnly=true&limit=100');
  const { profiles } = await response.json();
  return profiles;
}
```

### Phase 5: User Experience Enhancements

#### 5.1 Profile Completion Dashboard

**File**: `src/app/profile/page.tsx` (My Profile page)

Add completion progress indicator:

```typescript
// Add to the existing My Profile page
import { ProfileQualityService } from '@/lib/services/ProfileQualityService';

// In the component
const [qualityInfo, setQualityInfo] = useState<ProfileQualityInfo | null>(null);

// Calculate quality on profile load
useEffect(() => {
  if (profile?.data) {
    const info = ProfileQualityService.calculateQualityInfo(userId, profile.data);
    setQualityInfo(info);
  }
}, [profile, userId]);

// Add to JSX
{qualityInfo && (
  <div className="mb-6 p-4 rounded-lg border">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-lg font-semibold">Profile Completion</h3>
      <span className={`px-3 py-1 rounded-full text-sm ${
        qualityInfo.isQualityProfile 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
      }`}>
        {qualityInfo.completionPercentage}% Complete
      </span>
    </div>
    
    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${
          qualityInfo.isQualityProfile ? 'bg-green-500' : 'bg-amber-500'
        }`}
        style={{ width: `${qualityInfo.completionPercentage}%` }}
      ></div>
    </div>
    
    {!qualityInfo.isQualityProfile && (
      <div className="space-y-2">
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Complete your profile to appear in search results and on the map.
        </p>
        {qualityInfo.missingFields.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-1">Missing fields:</p>
            <div className="flex flex-wrap gap-1">
              {qualityInfo.missingFields.slice(0, 3).map(field => (
                <span key={field} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  {field}
                </span>
              ))}
              {qualityInfo.missingFields.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  +{qualityInfo.missingFields.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}
```

#### 5.2 Map Tooltip Enhancement

**File**: `src/components/ExploreMap.tsx`

Add tooltip for incomplete profiles:

```typescript
// Add to hover tooltip component
{hoveredProfile && hoverPosition && (
  <div
    className="fixed z-50 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border pointer-events-none"
    style={{
      left: hoverPosition.x - 100,
      top: hoverPosition.y - 80,
      transform: 'translateX(-50%)',
    }}
  >
    <div className="text-sm font-medium">{hoveredProfile.name}</div>
    <div className="text-xs text-gray-600 dark:text-gray-400">{hoveredProfile.role}</div>
    
    {!hoveredProfile.qualityInfo.isQualityProfile && (
      <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
        <div className="flex items-center gap-1">
          <AlertCircle className="size-3" />
          Incomplete Profile
        </div>
        <div>{hoveredProfile.qualityInfo.completionPercentage}% complete</div>
      </div>
    )}
    
    {hoveredProfile.location.needsUpdate && (
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <MapPin className="size-3" />
          Location needs update
        </div>
      </div>
    )}
  </div>
)}
```

## Testing Strategy

### 5.1 Unit Tests

**File**: `src/lib/services/__tests__/ProfileQualityService.test.ts`

```typescript
import { ProfileQualityService } from '../ProfileQualityService';

describe('ProfileQualityService', () => {
  const mockCompleteProfile = {
    displayName: 'John Doe',
    bio: 'Software engineer passionate about civic tech',
    skills: ['JavaScript', 'React', 'Node.js'],
    tags: ['Developer', 'Civic Tech'],
    fame: 'Built apps for 3 nonprofits',
    aim: [{ title: 'Create better voting systems', summary: 'Focus on accessibility' }],
    game: 'Long-term: establish civic tech consulting firm',
    workStyle: 'Collaborative, agile methodology',
    helpNeeded: 'Looking for UX designer and policy expert'
  };

  const mockIncompleteProfile = {
    displayName: 'Jane Smith',
    bio: 'Designer',
    // Missing skills, tags, fame, aim, game, workStyle, helpNeeded
  };

  test('identifies complete profile as quality', () => {
    const qualityInfo = ProfileQualityService.calculateQualityInfo('user1', mockCompleteProfile);
    
    expect(qualityInfo.isQualityProfile).toBe(true);
    expect(qualityInfo.completionPercentage).toBeGreaterThanOrEqual(50);
    expect(qualityInfo.missingFields).toHaveLength(0);
  });

  test('identifies incomplete profile as not quality', () => {
    const qualityInfo = ProfileQualityService.calculateQualityInfo('user2', mockIncompleteProfile);
    
    expect(qualityInfo.isQualityProfile).toBe(false);
    expect(qualityInfo.completionPercentage).toBeLessThan(50);
    expect(qualityInfo.missingFields.length).toBeGreaterThan(0);
  });

  test('filters quality profiles correctly', () => {
    const profiles = [
      { user_id: 'user1', data: mockCompleteProfile },
      { user_id: 'user2', data: mockIncompleteProfile }
    ];

    const qualityProfiles = ProfileQualityService.filterQualityProfiles(profiles);
    
    expect(qualityProfiles).toHaveLength(1);
    expect(qualityProfiles[0].user_id).toBe('user1');
  });

  test('enriches profiles with quality info', () => {
    const profiles = [
      { user_id: 'user1', data: mockCompleteProfile }
    ];

    const enriched = ProfileQualityService.enrichWithQualityInfo(profiles);
    
    expect(enriched[0].qualityInfo).toBeDefined();
    expect(enriched[0].qualityInfo.userId).toBe('user1');
    expect(enriched[0].qualityInfo.isQualityProfile).toBe(true);
  });
});
```

### 5.2 Integration Tests

**File**: `src/app/__tests__/quality-integration.test.ts`

```typescript
// Test the complete quality control flow
import { render, screen, waitFor } from '@testing-library/react';
import ExplorePage from '../page';
import ProfilesPage from '../profiles/page';

// Mock Supabase with quality and non-quality profiles
const mockProfiles = [
  // Quality profile
  {
    user_id: 'quality-user',
    username: 'john@example.com',
    data: {
      displayName: 'John Doe',
      bio: 'Complete bio',
      skills: ['React', 'TypeScript'],
      // ... complete profile data
    }
  },
  // Incomplete profile
  {
    user_id: 'incomplete-user',
    username: 'jane@example.com',
    data: {
      displayName: 'Jane Smith',
      bio: 'Short bio'
      // ... missing fields
    }
  }
];

describe('Quality Control Integration', () => {
  test('map shows incomplete profiles with reduced opacity', async () => {
    render(<ExplorePage />);
    
    await waitFor(() => {
      const incompleteMarker = screen.getByTestId('marker-incomplete-user');
      expect(incompleteMarker).toHaveStyle({ opacity: '0.2' });
    });
  });

  test('profiles page only shows quality profiles', async () => {
    render(<ProfilesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  test('incomplete profiles cannot be clicked on map', async () => {
    const mockOnClick = jest.fn();
    render(<ExploreMap profiles={mockProfiles} onProfileClick={mockOnClick} />);
    
    const incompleteMarker = screen.getByTestId('marker-incomplete-user');
    incompleteMarker.click();
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });
});
```

## Performance Considerations

### 6.1 Caching Strategy

- **Client-Side**: Cache quality calculations in memory during session
- **Server-Side**: Consider Redis cache for frequently accessed profiles
- **Database**: Add computed column for completion percentage (future optimization)

### 6.2 Batch Processing

- **Quality Calculation**: Process profiles in batches of 50-100
- **Database Queries**: Use `IN` clauses for bulk quality checks
- **Map Rendering**: Lazy load quality calculations for off-screen markers

### 6.3 Progressive Enhancement

- **Initial Load**: Show all profiles, calculate quality asynchronously
- **Quality Updates**: Real-time quality recalculation on profile edits
- **Fallback**: Graceful degradation if quality service fails

## Migration Strategy

### Phase 1: Foundation ✅ COMPLETED
- ✅ Create ProfileQualityService with 50% threshold logic
- ✅ Add TypeScript interfaces for profile quality info and enhanced profile types
- ✅ Centralized quality calculation using existing ProfileCompletionService

### Phase 2: Map Integration ✅ COMPLETED  
- ✅ Update ExploreMap component with quality-based opacity and interaction controls
- ✅ Add unified styling for incomplete profiles and location-update profiles (20% opacity, no dashed borders)
- ✅ Implement amber "!" indicator with 80% opacity for better visibility
- ✅ Add enhanced hover tooltips with quality information
- ✅ Ensure staggered animation works for all profiles (complete and incomplete)

### Phase 3: Profile Browser ✅ COMPLETED
- ✅ Update profiles page to only show quality profiles (≥50% complete) in random selection
- ✅ Add quality protection to individual profile pages (`/profiles/[userId]`)
- ✅ Implement redirect protection for incomplete profile direct access
- ✅ Quality-only filtering across all profile discovery mechanisms

### Phase 4: Explore Page Integration ✅ COMPLETED
- ✅ Update explore page data fetching to include quality info for all profiles
- ✅ Fix Google Images configuration for profile avatars
- ✅ Integrate ProfileQualityService with existing profile mapping logic

### Phase 5: User Notification System ✅ COMPLETED
- ✅ Add full-width banner above navbar for incomplete profiles
- ✅ Implement session-based dismissal with clear call-to-action
- ✅ Use brand orange colors with dark background matching navbar
- ✅ Perfect alignment with logo (left) and user avatar (right)
- ✅ Direct navigation to profile completion page

## Success Metrics

### Quality Metrics
- **Profile Completion Rate**: % of profiles ≥50% complete
- **User Engagement**: Interaction rates with quality vs incomplete profiles
- **Completion Conversion**: Rate of incomplete → complete profile transitions

### Technical Metrics
- **Performance**: Quality calculation time (<50ms per profile)
- **Database Load**: Query optimization impact
- **User Experience**: Page load times with quality filtering

### User Feedback
- **Quality Perception**: User satisfaction with profile quality
- **Completion Motivation**: Profile completion rates after implementation
- **Feature Usage**: Map vs browser usage patterns

## Future Enhancements

### Advanced Quality Scoring
- **Content Quality**: AI-based bio and description quality assessment
- **Engagement Metrics**: Factor in user activity and response rates
- **Peer Validation**: Community-based profile quality ratings

### Dynamic Thresholds
- **Adaptive Standards**: Adjust quality threshold based on user base maturity
- **Category-Specific**: Different thresholds for different user types
- **Geographic Variation**: Regional quality standards

### Quality Incentives
- **Badges**: Quality profile recognition system
- **Priority Features**: Enhanced features for quality profiles
- **Community Recognition**: Highlight quality contributors

---

## Implementation Checklist

### ✅ Prerequisites
- [x] ProfileCompletionService exists and is tested
- [x] Current profile data structure is documented
- [x] Map and profile browser components are identified

### 📋 Development Tasks

#### Phase 1: Foundation ✅ COMPLETED
- [x] Create `ProfileQualityService.ts` with centralized quality logic
- [x] Add `types/profile.ts` with quality interfaces  
- [x] Integrate with existing ProfileCompletionService
- [x] 50% completion threshold implementation

#### Phase 2: Map Integration ✅ COMPLETED
- [x] Update `ExploreMap.tsx` component with quality controls
- [x] Add 20% opacity for incomplete profiles with staggered animation
- [x] Implement unified styling (removed dashed borders)
- [x] Add amber "!" indicator with 80% opacity for visibility
- [x] Enhanced hover tooltips showing quality status
- [x] Disable click interactions for incomplete profiles

#### Phase 3: Profile Browser ✅ COMPLETED  
- [x] Update `profiles/page.tsx` with quality-only random selection
- [x] Add quality protection to individual profile pages (`/profiles/[userId]`)
- [x] Implement redirect protection for incomplete profile URLs
- [x] Batch processing for efficient quality filtering

#### Phase 4: Explore Page Integration ✅ COMPLETED
- [x] Update explore page data fetching with quality enrichment
- [x] Fix Google Images configuration (`next.config.ts`)
- [x] Integrate quality calculations in profile mapping
- [x] Maintain map functionality with quality info

#### Phase 5: User Notification System ✅ COMPLETED
- [x] Create `IncompleteProfileBanner.tsx` component
- [x] Add to main layout above navbar with proper z-index
- [x] Implement session-based dismissal functionality
- [x] Use brand colors with dark background matching navbar
- [x] Perfect alignment with existing UI elements
- [x] Direct navigation to profile completion

#### Phase 6: Optional Enhancements (Pending)
- [ ] Create `api/profiles/quality/route.ts` for server-side optimization
- [ ] Add completion dashboard to My Profile page
- [ ] Advanced caching strategy implementation
- [ ] Performance monitoring and analytics

### 🧪 Testing
- [ ] Unit tests for ProfileQualityService
- [ ] Integration tests for quality filtering
- [ ] E2E tests for map and browser behavior
- [ ] Performance testing with large datasets

### 🚀 Deployment
- [ ] Feature flag implementation
- [ ] Gradual rollout strategy
- [ ] Performance monitoring
- [ ] User feedback collection

## Implementation Summary ✅ COMPLETED

### 🎯 **Core System Status**
The profile quality control system is **fully implemented and operational** across all user-facing components of the CivicMatch platform.

### 🏗️ **Key Components Delivered**

#### **1. ProfileQualityService** (`src/lib/services/ProfileQualityService.ts`)
- **Purpose**: Centralized quality assessment using existing ProfileCompletionService
- **Threshold**: 50% completion threshold (42.5 points out of 85 total)
- **Methods**: Calculate, filter, enrich, and validate profile quality
- **Integration**: Seamless integration with existing completion calculation logic

#### **2. Enhanced ExploreMap** (`src/components/ExploreMap.tsx`)  
- **Visual Quality Control**: 20% opacity for incomplete profiles, 100% for complete profiles
- **Unified Styling**: Both incomplete and location-update profiles use same treatment (no dashed borders)
- **Interactive Control**: Disabled clicks and hover for incomplete profiles
- **Quality Indicators**: Amber "!" icon with 80% opacity for visibility
- **Animation**: Staggered fade-in animation works for all profile types
- **Tooltips**: Enhanced hover information showing quality status

#### **3. Quality-Filtered Profile Browser** (`src/app/profiles/page.tsx`)
- **Random Selection**: Only shows profiles ≥50% complete
- **Batch Processing**: Efficient filtering of 200+ profiles before random selection
- **URL Protection**: Direct profile access redirects incomplete profiles
- **Fallback Handling**: Graceful behavior when no quality profiles available

#### **4. Individual Profile Protection** (`src/app/profiles/[userId]/page.tsx`)
- **Access Control**: Quality validation on profile page load
- **Redirect Logic**: Automatic redirect to profile browser for incomplete profiles
- **Consistent Experience**: Same quality standards across all profile access points

#### **5. User Notification Banner** (`src/components/IncompleteProfileBanner.tsx`)
- **Prominent Placement**: Full-width banner above navbar with high z-index
- **Brand Integration**: Dark background matching navbar, orange accent colors
- **Perfect Alignment**: Text aligned with logo, buttons aligned with user avatar
- **Smart Behavior**: Session-based dismissal, direct navigation to profile completion
- **Responsive Design**: Works seamlessly on mobile and desktop

#### **6. System Integration** (`src/app/layout.tsx`, `src/app/page.tsx`)
- **Global Banner**: Integrated into main layout for site-wide coverage
- **Data Enrichment**: All profile data includes quality information
- **Type Safety**: Comprehensive TypeScript interfaces for quality data
- **Configuration**: Google Images support for profile avatars

### 🎨 **Design Decisions & Lessons Learned**

#### **Unified Visual Treatment**
- **Problem**: Originally had different styling for incomplete profiles vs location-update profiles
- **Solution**: Unified both to use 20% opacity with amber "!" indicator
- **Result**: Cleaner, more consistent user experience

#### **Animation Integration**  
- **Problem**: Incomplete profiles appeared instantly without staggered animation
- **Solution**: Removed initial opacity setting, let animation system handle final opacity
- **Result**: Beautiful staggered fade-in for all profiles regardless of completion status

#### **Banner Alignment & Visibility**
- **Problem**: Banner was hidden behind map due to z-index issues
- **Solution**: Added `relative z-50` and matched navbar background colors
- **Problem**: Text alignment and button positioning wasn't perfect
- **Solution**: Used flexbox with proper alignment matching existing navbar structure
- **Result**: Seamless integration that looks like native platform UI

#### **Performance Optimization**
- **Batch Processing**: Fetch 200 profiles, filter to quality ones, then random select
- **Memory Efficiency**: Calculate quality info on-demand rather than storing
- **Session Caching**: Banner dismissal uses sessionStorage for performance

### 🧪 **User Testing Results**

#### **Map Behavior** ✅ **Working**
- **Complete Profiles**: 100% opacity, clickable, hover effects, staggered animation
- **Incomplete Profiles**: 20% opacity, non-clickable, amber "!" indicator, staggered animation  
- **Location-Update Profiles**: Same treatment as incomplete (unified styling)
- **Hover Tooltips**: Show "Quality Profile", "Incomplete Profile", or "Location needs update"

#### **Profile Discovery** ✅ **Working**  
- **Profile Browser**: Only quality profiles appear in random selection
- **Individual Pages**: Incomplete profile URLs redirect to quality profile browser
- **URL Protection**: Direct access to incomplete profiles properly blocked

#### **User Guidance** ✅ **Working**
- **Banner Notification**: Appears for incomplete profiles with completion percentage
- **Clear Call-to-Action**: "Complete Profile" button navigates to profile editor
- **Dismissal**: X button hides banner for session, reappears in new session
- **Brand Consistency**: Matches platform colors and styling perfectly

### 📊 **System Coverage**

✅ **Map Discovery**: Quality control on explore page map  
✅ **Profile Browser**: Quality-only random profile selection  
✅ **Individual Profiles**: URL access protection with redirects  
✅ **User Notification**: Prominent banner guidance system  
✅ **Data Consistency**: Unified quality calculation across platform  
✅ **Visual Consistency**: Coherent styling and brand integration  
✅ **Performance**: Efficient batch processing and caching  
✅ **Mobile Support**: Responsive design across all screen sizes  

The quality control system successfully ensures that **only quality profiles (≥50% complete) are discoverable and interactive** while providing **clear guidance and motivation** for users to complete their profiles. The implementation maintains platform performance while delivering a polished, professional user experience that encourages profile completion.

This comprehensive quality control system will ensure CivicMatch maintains high profile standards while providing clear feedback and motivation for users to complete their profiles. The implementation leverages existing infrastructure while adding minimal complexity to the current architecture.
