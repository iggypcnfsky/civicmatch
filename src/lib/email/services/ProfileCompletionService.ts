import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { MissingField } from './EmailService';

export interface ProfileCompletionResult {
  userId: string;
  email: string;
  displayName: string;
  completionPercentage: number;
  missingFields: MissingField[];
  shouldSendReminder: boolean;
}

export class ProfileCompletionService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase configuration for ProfileCompletionService');
    }

    this.supabase = createClient<Database>(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Get all profiles that need completion reminders
   * Based on completion percentage and email preferences
   */
  async getProfilesNeedingReminders(): Promise<ProfileCompletionResult[]> {
    try {
      // Get all profiles with their data
      const { data: profiles, error } = await this.supabase
        .from('profiles')
        .select('user_id, username, data, created_at')
        .not('data->email', 'is', null); // Must have email

      if (error) {
        console.error('Failed to fetch profiles:', error);
        return [];
      }

      const results: ProfileCompletionResult[] = [];

      for (const profile of profiles) {
        const profileData = (profile.data as Record<string, unknown>) || {};
        
        // Skip if profile reminders are disabled
        const emailPrefs = profileData.emailPreferences as Record<string, unknown> || {};
        if (emailPrefs.profileRemindersEnabled === false) {
          continue;
        }

        // Extract email
        const email = String(profileData.email || profile.username || '');
        if (!email || !email.includes('@')) {
          continue; // Skip profiles without valid email
        }

        // Calculate completion
        const completion = this.calculateProfileCompletion(profileData);
        
        // Only send reminders for profiles that are 0-90% complete
        // Include all incomplete profiles
        // Too high: profile is already mostly complete
        const shouldSendReminder = completion.completionPercentage >= 0 && 
                                  completion.completionPercentage < 90;

        if (!shouldSendReminder) {
          continue;
        }

        // Check if we've sent a reminder recently (within last 7 days)
        const hasRecentReminder = await this.hasRecentReminder(profile.user_id);
        if (hasRecentReminder) {
          continue;
        }

        const displayName = String(profileData.displayName || profile.username || 'there');

        results.push({
          userId: profile.user_id,
          email,
          displayName,
          completionPercentage: completion.completionPercentage,
          missingFields: completion.missingFields,
          shouldSendReminder: true
        });
      }

      return results;
    } catch (error) {
      console.error('ProfileCompletionService.getProfilesNeedingReminders error:', error);
      return [];
    }
  }

  /**
   * Calculate profile completion percentage and missing fields
   */
  private calculateProfileCompletion(profileData: Record<string, unknown>): {
    completionPercentage: number;
    missingFields: MissingField[];
  } {
    const missingFields: MissingField[] = [];
    const fields = [
      {
        key: 'displayName',
        name: 'Display Name',
        description: 'Your name helps others know who you are',
        importance: 'Essential for making connections',
        weight: 15 // Higher weight for essential fields
      },
      {
        key: 'bio',
        name: 'Bio & Background',
        description: 'Tell your story and what drives your passion for change',
        importance: 'Builds trust and connection',
        weight: 15
      },
      {
        key: 'skills',
        name: 'Skills & Expertise',
        description: 'Help others understand what you bring to collaborations',
        importance: 'Increases matches by 40%',
        weight: 15
      },
      {
        key: 'tags',
        name: 'Focus Areas',
        description: 'Share what you\'re passionate about or working on',
        importance: 'Helps others find common interests',
        weight: 10
      },
      {
        key: 'location',
        name: 'Location',
        description: 'Connect with local changemakers in your area',
        importance: 'Enables local collaboration',
        weight: 8
      },
      {
        key: 'fame',
        name: 'What You\'re Known For',
        description: 'Highlight your achievements and reputation',
        importance: 'Builds credibility and attracts collaborators',
        weight: 10
      },
      {
        key: 'aim',
        name: 'Current Focus',
        description: 'Share what projects or causes you\'re currently working on',
        importance: 'Shows you\'re actively engaged',
        weight: 10
      },
      {
        key: 'game',
        name: 'Long-term Strategy',
        description: 'Your vision for creating lasting impact',
        importance: 'Attracts like-minded long-term collaborators',
        weight: 8
      },
      {
        key: 'workStyle',
        name: 'Work Style',
        description: 'How you prefer to collaborate and work with others',
        importance: 'Improves collaboration compatibility',
        weight: 5
      },
      {
        key: 'helpNeeded',
        name: 'Help Needed',
        description: 'What kind of support or expertise you\'re looking for',
        importance: 'Helps others know how they can contribute',
        weight: 4
      }
    ];

    let totalWeight = 0;
    let completedWeight = 0;

    for (const field of fields) {
      totalWeight += field.weight;
      
      const value = profileData[field.key];
      let isComplete = false;

      if (field.key === 'aim') {
        // Special handling for aim array
        isComplete = Array.isArray(value) && value.length > 0 && 
                    value.some((item: unknown) => 
                      typeof item === 'object' && item !== null && 
                      (item as Record<string, unknown>).title
                    );
      } else if (field.key === 'tags' || field.key === 'skills') {
        // Handle both string and array formats
        if (typeof value === 'string') {
          isComplete = value.trim().length > 0;
        } else if (Array.isArray(value)) {
          isComplete = value.length > 0;
        }
      } else {
        // Standard string fields
        isComplete = typeof value === 'string' && value.trim().length > 0;
      }

      if (isComplete) {
        completedWeight += field.weight;
      } else {
        missingFields.push({
          field: field.name,
          description: field.description,
          importance: field.importance
        });
      }
    }

    const completionPercentage = Math.round((completedWeight / totalWeight) * 100);

    return {
      completionPercentage,
      missingFields
    };
  }

  /**
   * Check if user has received a profile reminder in the last 7 days
   */
  private async hasRecentReminder(userId: string): Promise<boolean> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await this.supabase
        .from('email_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('email_type', 'profile_reminder')
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1);

      if (error) {
        console.error('Failed to check recent reminders:', error);
        return false; // If we can't check, allow sending to be safe
      }

      return data.length > 0;
    } catch (error) {
      console.error('ProfileCompletionService.hasRecentReminder error:', error);
      return false;
    }
  }

  /**
   * Calculate completion for a single profile (utility method)
   */
  calculateSingleProfileCompletion(profileData: Record<string, unknown>): {
    completionPercentage: number;
    missingFields: MissingField[];
  } {
    return this.calculateProfileCompletion(profileData);
  }
}

// Export singleton instance with lazy initialization
let _profileCompletionService: ProfileCompletionService | null = null;

export const profileCompletionService = {
  getInstance(): ProfileCompletionService {
    if (!_profileCompletionService) {
      _profileCompletionService = new ProfileCompletionService();
    }
    return _profileCompletionService;
  },
  
  // Delegate methods for convenience
  async getProfilesNeedingReminders() {
    return this.getInstance().getProfilesNeedingReminders();
  },
  
  calculateSingleProfileCompletion(profileData: Record<string, unknown>) {
    return this.getInstance().calculateSingleProfileCompletion(profileData);
  }
};
