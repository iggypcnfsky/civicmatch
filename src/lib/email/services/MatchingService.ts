import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { googleCalendarService } from '@/lib/google/calendar';
import type { MeetingDetails } from '@/lib/google/types';

export interface MatchProfile {
  user_id: string;
  username: string;
  data: {
    displayName?: string;
    bio?: string;
    location?: {
      city: string;
      country: string;
    };
    tags?: string[];
    skills?: string[];
    causes?: string[];
    values?: string[];
    fame?: string;
    aim?: Array<{ title: string; summary: string }>;
    game?: string;
    workStyle?: string;
    helpNeeded?: string;
    avatarUrl?: string;
    emailPreferences?: {
      weeklyMatchingEnabled?: boolean;
    };
    weeklyMatchHistory?: {
      sentMatches?: {
        [yearMonth: string]: string[]; // e.g., "2024-01": ["uuid1", "uuid2"]
      };
      lastSentWeek?: string;
      totalSent?: number;
    };
  };
  created_at: string;
}

interface MatchResult {
  currentUser: MatchProfile;
  matchedUser: MatchProfile;
  matchScore: number;
  matchReasons: string[];
  meetingDetails?: MeetingDetails;
}

interface MatchingOptions {
  excludeRecentMatches?: boolean; // Default: true
  minDaysSinceLastMatch?: number; // Default: 7 days
  maxMatchesPerWeek?: number; // Default: 1
}

/**
 * MatchingService handles user matching for weekly email campaigns
 * 
 * Current Implementation: Random matching (MVP)
 * Future Enhancements:
 * - AI-powered matching using OpenAI/LLM to analyze profile compatibility
 * - Machine learning based on connection success rates
 * - Collaborative filtering based on user behavior
 * - Weighted scoring algorithm (values + skills + causes + geo-affinity)
 */
export class MatchingService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    // Use anonymous client for read operations (with RLS)
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Get users eligible for weekly matching
   * Current: Minimal requirements + email preferences respected
   * - Must have displayName or username
   * - Must have emailPreferences.weeklyMatchingEnabled !== false
   * Future: Will require complete profiles and richer matching criteria
   */
  async getEligibleUsers(options: MatchingOptions = {}): Promise<MatchProfile[]> {
    const {
      excludeRecentMatches = true,
      minDaysSinceLastMatch = 7
    } = options;

    try {
      // Fetch all profiles with email preferences enabled
      const { data: profiles, error } = await this.supabase
        .from('profiles')
        .select('user_id, username, data, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching profiles:', error);
        throw error;
      }

      if (!profiles) return [];

      // Filter for eligible users
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - (minDaysSinceLastMatch * 24 * 60 * 60 * 1000));

      const eligibleUsers = profiles.filter(profile => {
        const data = profile.data as MatchProfile['data'];
        
        // Respect user's weekly matching email preference
        if (data.emailPreferences?.weeklyMatchingEnabled === false) {
          return false;
        }

        // TODO: Future - Require complete profiles when user adoption is higher
        // For now, only require displayName to have basic user info
        // Must have at least displayName (basic requirement)
        if (!data.displayName) {
          // Fallback to username if no displayName
          return profile.username && profile.username.length > 0;
        }

        // TODO: Future - Require bio and skills/values/causes for better matching
        // Currently commented out to include users with minimal profiles
        // if (!data.bio) {
        //   return false;
        // }
        // 
        // const hasAnyFacet = (data.skills?.length ?? 0) > 0 || 
        //                    (data.values?.length ?? 0) > 0 || 
        //                    (data.causes?.length ?? 0) > 0;
        // 
        // if (!hasAnyFacet) {
        //   return false;
        // }

        // Check if user was recently matched (if enabled)
        if (excludeRecentMatches && data.weeklyMatchHistory?.lastSentWeek) {
          const lastMatchDate = new Date(data.weeklyMatchHistory.lastSentWeek);
          if (lastMatchDate > cutoffDate) {
            return false;
          }
        }

        return true;
      });

      console.log(`Found ${eligibleUsers.length} eligible users for matching`);
      return eligibleUsers as MatchProfile[];

    } catch (error) {
      console.error('Error in getEligibleUsers:', error);
      throw error;
    }
  }

  /**
   * Generate matches for weekly emails
   * Current: Random matching algorithm
   * 
   * Future Algorithm Ideas:
   * 1. AI-Powered Matching:
   *    - Use OpenAI/Claude to analyze profile text and find semantic similarities
   *    - Score compatibility based on bio, goals, work style descriptions
   *    - Consider personality type indicators and communication preferences
   * 
   * 2. Weighted Jaccard Similarity:
   *    score(A,B) = w_v × overlap(values) + w_s × overlap(skills) + w_c × overlap(causes) + w_l × geoAffinity
   *    where overlap = |A ∩ B| / |A ∪ B| (Jaccard similarity)
   * 
   * 3. Machine Learning Approach:
   *    - Train model on connection success rates (accept/decline/message responses)
   *    - Features: profile similarity, geographic distance, complementary skills
   *    - Use collaborative filtering based on successful connections
   * 
   * 4. Temporal Matching:
   *    - Consider availability patterns and time zone compatibility
   *    - Factor in project timelines and urgency from "helpNeeded" field
   */
  async generateMatches(options: MatchingOptions = {}): Promise<MatchResult[]> {
    const { maxMatchesPerWeek = 1 } = options;
    
    try {
      const eligibleUsers = await this.getEligibleUsers(options);
      
      if (eligibleUsers.length < 2) {
        console.log('Not enough eligible users for matching');
        return [];
      }

      const matches: MatchResult[] = [];
      const usedUserIds = new Set<string>();

      // Random matching algorithm (MVP)
      // TODO: Replace with AI-powered matching algorithm
      for (const currentUser of eligibleUsers) {
        if (usedUserIds.has(currentUser.user_id)) continue;
        if (matches.length >= Math.floor(eligibleUsers.length / 2)) break;

        // Find potential matches (exclude self and already used users)
        const potentialMatches = eligibleUsers.filter(user => 
          user.user_id !== currentUser.user_id && 
          !usedUserIds.has(user.user_id) &&
          !this.hasRecentMatch(currentUser, user.user_id)
        );

        if (potentialMatches.length === 0) continue;

        // Random selection (MVP approach)
        const randomIndex = Math.floor(Math.random() * potentialMatches.length);
        const matchedUser = potentialMatches[randomIndex];

        // Generate match reasoning (for now, find any overlaps)
        const matchReasons = this.generateMatchReasons(currentUser, matchedUser);
        
        const match: MatchResult = {
          currentUser,
          matchedUser,
          matchScore: this.calculateMatchScore(), // Random score 70-100 for MVP
          matchReasons
        };

        matches.push(match);
        usedUserIds.add(currentUser.user_id);
        usedUserIds.add(matchedUser.user_id);

        if (matches.length >= maxMatchesPerWeek) break;
      }

      console.log(`Generated ${matches.length} matches`);
      return matches;

    } catch (error) {
      console.error('Error generating matches:', error);
      throw error;
    }
  }

  /**
   * Check if two users have been matched recently
   */
  private hasRecentMatch(currentUser: MatchProfile, targetUserId: string): boolean {
    const matchHistory = currentUser.data.weeklyMatchHistory?.sentMatches;
    if (!matchHistory) return false;

    // Check last 3 months for previous matches
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const checkDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (matchHistory[yearMonth]?.includes(targetUserId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate human-readable reasons for why two users match
   * Current: Simple overlap detection with fallbacks for minimal profiles
   * Future: AI-generated explanations based on deep profile analysis
   */
  private generateMatchReasons(user1: MatchProfile, user2: MatchProfile): string[] {
    const reasons: string[] = [];
    
    // Check shared values
    const sharedValues = this.findArrayOverlap(user1.data.values, user2.data.values);
    if (sharedValues.length > 0) {
      reasons.push(`You both value: ${sharedValues.slice(0, 2).join(' and ')}`);
    }

    // Check shared skills
    const sharedSkills = this.findArrayOverlap(user1.data.skills, user2.data.skills);
    if (sharedSkills.length > 0) {
      reasons.push(`Shared expertise in: ${sharedSkills.slice(0, 2).join(' and ')}`);
    }

    // Check shared causes
    const sharedCauses = this.findArrayOverlap(user1.data.causes, user2.data.causes);
    if (sharedCauses.length > 0) {
      reasons.push(`Both passionate about: ${sharedCauses.slice(0, 2).join(' and ')}`);
    }

    // Location proximity
    if (user1.data.location && user2.data.location) {
      if (user1.data.location.country === user2.data.location.country) {
        reasons.push(`Both based in ${user1.data.location.country}`);
      }
    }

    // Generic reasons for early-stage users with minimal profiles
    if (reasons.length === 0) {
      const genericReasons = [
        'Both changemakers ready to connect and collaborate',
        'Complementary backgrounds for potential synergies',
        'Perfect opportunity to expand your impact network',
        'Both seeking meaningful collaboration opportunities',
        'Great potential for mutual learning and growth',
        'Similar timing for connecting with fellow innovators'
      ];
      
      // Randomly select 2-3 generic reasons
      const shuffled = genericReasons.sort(() => 0.5 - Math.random());
      reasons.push(...shuffled.slice(0, Math.random() > 0.5 ? 3 : 2));
    }

    return reasons.slice(0, 3); // Limit to 3 reasons for email readability
  }

  /**
   * Find overlapping elements between two arrays
   */
  private findArrayOverlap(arr1?: string[], arr2?: string[]): string[] {
    if (!arr1 || !arr2) return [];
    return arr1.filter(item => arr2.includes(item));
  }

  /**
   * Update user's weekly match history
   */
  async updateMatchHistory(userId: string, matchedUserId: string): Promise<void> {
    try {
      // Get current profile
      const { data: profile, error: fetchError } = await this.supabase
        .from('profiles')
        .select('data')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching profile for match history update:', fetchError);
        return;
      }

      const currentData = profile.data as MatchProfile['data'];
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Update match history
      const updatedHistory = {
        ...currentData.weeklyMatchHistory,
        sentMatches: {
          ...currentData.weeklyMatchHistory?.sentMatches,
          [yearMonth]: [
            ...(currentData.weeklyMatchHistory?.sentMatches?.[yearMonth] || []),
            matchedUserId
          ]
        },
        lastSentWeek: now.toISOString(),
        totalSent: (currentData.weeklyMatchHistory?.totalSent || 0) + 1
      };

      // Update profile
      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({
          data: {
            ...currentData,
            weeklyMatchHistory: updatedHistory
          }
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating match history:', updateError);
      }

    } catch (error) {
      console.error('Error in updateMatchHistory:', error);
    }
  }

  /**
   * Create a Google Calendar meeting for matched users
   */
  async createMeetingForMatch(user1: MatchProfile, user2: MatchProfile): Promise<MeetingDetails | null> {
    try {
      // Extract user emails and names
      // Note: For now using username as email fallback - in production, get from auth.users table
      const user1Email = (user1.data as { email?: string }).email || `${user1.username}@example.com`; // Fallback for testing
      const user2Email = (user2.data as { email?: string }).email || `${user2.username}@example.com`; // Fallback for testing
      const user1Name = user1.data.displayName || user1.username;
      const user2Name = user2.data.displayName || user2.username;

      console.log('Creating meeting for match:', {
        user1: { name: user1Name, email: user1Email },
        user2: { name: user2Name, email: user2Email }
      });

      // Create calendar event
      const calendarEvent = await googleCalendarService.createWeeklyMatchMeeting(
        user1Name,
        user2Name,
        user1Email,
        user2Email
      );

      // Generate ICS download URL
      const icsDownloadUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://civicmatch.app'}/api/calendar/download/${calendarEvent.id}.ics`;

      const meetingDetails: MeetingDetails = {
        eventId: calendarEvent.id,
        googleMeetUrl: calendarEvent.googleMeetUrl,
        scheduledTime: calendarEvent.startTime,
        timezone: 'Europe/Berlin', // CET
        calendarEventUrl: calendarEvent.calendarEventUrl,
        icsDownloadUrl
      };

      console.log('Meeting created successfully:', {
        eventId: calendarEvent.id,
        googleMeetUrl: calendarEvent.googleMeetUrl
      });

      return meetingDetails;

    } catch (error) {
      console.error('Failed to create meeting for match:', error);
      // Don't fail the entire match if calendar creation fails
      return null;
    }
  }

  /**
   * Generate matches with optional Google Calendar integration
   */
  async generateMatchesWithMeetings(options: MatchingOptions & { createMeetings?: boolean } = {}): Promise<MatchResult[]> {
    const { createMeetings = false, ...matchingOptions } = options;
    
    // Generate basic matches first
    const matches = await this.generateMatches(matchingOptions);

    if (!createMeetings) {
      return matches;
    }

    // Add meeting details to each match
    const matchesWithMeetings: MatchResult[] = [];

    for (const match of matches) {
      try {
        const meetingDetails = await this.createMeetingForMatch(match.currentUser, match.matchedUser);
        
        matchesWithMeetings.push({
          ...match,
          meetingDetails: meetingDetails || undefined
        });

        // Small delay between calendar API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error('Error creating meeting for match:', error);
        // Include match without meeting details if calendar creation fails
        matchesWithMeetings.push(match);
      }
    }

    return matchesWithMeetings;
  }

  /**
   * Calculate match score using future algorithm
   * 
   * Future Implementation Ideas:
   * 1. Weighted Jaccard Similarity:
   *    - Values overlap: 30% weight
   *    - Skills complementarity: 25% weight  
   *    - Causes alignment: 25% weight
   *    - Geographic proximity: 10% weight
   *    - Profile completeness: 10% weight
   * 
   * 2. AI Semantic Similarity:
   *    - Embed profile text using OpenAI/Sentence Transformers
   *    - Calculate cosine similarity between embeddings
   *    - Factor in goal compatibility and work style alignment
   * 
   * 3. Collaborative Filtering:
   *    - "Users who connected with X also connected with Y"
   *    - Learn from successful connection patterns
   *    - Factor in message response rates and meeting acceptance
   */
  private calculateMatchScore(): number {
    // Placeholder for future sophisticated scoring
    // Current: Random score for MVP
    return Math.floor(Math.random() * 30) + 70; // 70-100 range
  }
}

// Singleton instance
export const matchingService = new MatchingService();
