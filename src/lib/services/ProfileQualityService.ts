/**
 * Profile Quality Control Service
 * 
 * Centralized service for assessing profile completion and quality across
 * the CivicMatch platform. Integrates with existing ProfileCompletionService
 * to provide consistent quality filtering and assessment.
 */

import { profileCompletionService } from '@/lib/email/services/ProfileCompletionService';
import type { 
  ProfileQualityInfo, 
  ProfileRow, 
  QualityFilterOptions 
} from '@/types/profile';

export class ProfileQualityService {
  private static readonly DEFAULT_QUALITY_THRESHOLD = 50;

  /**
   * Calculate quality information for a single profile
   * 
   * @param userId - User ID for the profile
   * @param profileData - Profile data object from database
   * @param threshold - Custom quality threshold (default: 50)
   * @returns ProfileQualityInfo with completion status and missing fields
   */
  static calculateQualityInfo(
    userId: string, 
    profileData: Record<string, unknown>,
    threshold: number = ProfileQualityService.DEFAULT_QUALITY_THRESHOLD
  ): ProfileQualityInfo {
    const { completionPercentage, missingFields } = 
      profileCompletionService.calculateSingleProfileCompletion(profileData);
    
    return {
      userId,
      completionPercentage,
      isQualityProfile: completionPercentage >= threshold,
      missingFields: missingFields.map(f => f.field)
    };
  }

  /**
   * Filter profiles to only include quality profiles (≥threshold%)
   * 
   * @param profiles - Array of profile rows from database
   * @param threshold - Quality threshold percentage (default: 50)
   * @returns Filtered array containing only quality profiles
   */
  static filterQualityProfiles<T extends ProfileRow>(
    profiles: T[],
    threshold: number = ProfileQualityService.DEFAULT_QUALITY_THRESHOLD
  ): T[] {
    return profiles.filter(profile => {
      const qualityInfo = this.calculateQualityInfo(
        profile.user_id, 
        profile.data, 
        threshold
      );
      return qualityInfo.isQualityProfile;
    });
  }

  /**
   * Add quality information to profiles without filtering
   * Useful for map view where all profiles need to be shown with quality info
   * 
   * @param profiles - Array of profile rows from database
   * @param threshold - Quality threshold percentage (default: 50)
   * @returns Array of profiles enriched with quality information
   */
  static enrichWithQualityInfo<T extends ProfileRow>(
    profiles: T[],
    threshold: number = ProfileQualityService.DEFAULT_QUALITY_THRESHOLD
  ): Array<T & { qualityInfo: ProfileQualityInfo }> {
    return profiles.map(profile => ({
      ...profile,
      qualityInfo: this.calculateQualityInfo(
        profile.user_id, 
        profile.data, 
        threshold
      )
    }));
  }

  /**
   * Check if a single profile meets the quality threshold
   * Quick utility method for boolean quality checks
   * 
   * @param profileData - Profile data object
   * @param threshold - Quality threshold percentage (default: 50)
   * @returns Boolean indicating if profile meets quality standards
   */
  static isQualityProfile(
    profileData: Record<string, unknown>,
    threshold: number = ProfileQualityService.DEFAULT_QUALITY_THRESHOLD
  ): boolean {
    const { completionPercentage } = 
      profileCompletionService.calculateSingleProfileCompletion(profileData);
    return completionPercentage >= threshold;
  }

  /**
   * Get quality statistics for a set of profiles
   * Useful for analytics and monitoring
   * 
   * @param profiles - Array of profile rows
   * @param threshold - Quality threshold percentage (default: 50)
   * @returns Object with quality statistics
   */
  static getQualityStats<T extends ProfileRow>(
    profiles: T[],
    threshold: number = ProfileQualityService.DEFAULT_QUALITY_THRESHOLD
  ): {
    total: number;
    qualityCount: number;
    qualityPercentage: number;
    averageCompletion: number;
    incompleteCount: number;
  } {
    if (profiles.length === 0) {
      return {
        total: 0,
        qualityCount: 0,
        qualityPercentage: 0,
        averageCompletion: 0,
        incompleteCount: 0
      };
    }

    let qualityCount = 0;
    let totalCompletion = 0;

    profiles.forEach(profile => {
      const qualityInfo = this.calculateQualityInfo(
        profile.user_id, 
        profile.data, 
        threshold
      );
      
      if (qualityInfo.isQualityProfile) {
        qualityCount++;
      }
      
      totalCompletion += qualityInfo.completionPercentage;
    });

    return {
      total: profiles.length,
      qualityCount,
      qualityPercentage: Math.round((qualityCount / profiles.length) * 100),
      averageCompletion: Math.round(totalCompletion / profiles.length),
      incompleteCount: profiles.length - qualityCount
    };
  }

  /**
   * Process profiles with flexible quality options
   * Unified method that can filter, enrich, or just analyze profiles
   * 
   * @param profiles - Array of profile rows
   * @param options - Quality processing options
   * @returns Processed profiles based on options
   */
  static processProfiles<T extends ProfileRow>(
    profiles: T[],
    options: QualityFilterOptions = {}
  ): Array<T & { qualityInfo?: ProfileQualityInfo }> {
    const {
      qualityOnly = false,
      includeQualityInfo = true,
      threshold = ProfileQualityService.DEFAULT_QUALITY_THRESHOLD
    } = options;

    let processedProfiles = [...profiles];

    // Apply quality filtering if requested
    if (qualityOnly) {
      processedProfiles = this.filterQualityProfiles(processedProfiles, threshold);
    }

    // Add quality info if requested
    if (includeQualityInfo) {
      return this.enrichWithQualityInfo(processedProfiles, threshold);
    }

    return processedProfiles;
  }

  /**
   * Validate profile data structure for quality assessment
   * Ensures the profile data has the expected structure
   * 
   * @param profileData - Profile data to validate
   * @returns Boolean indicating if data structure is valid
   */
  static isValidProfileData(profileData: unknown): profileData is Record<string, unknown> {
    return profileData !== null && 
           typeof profileData === 'object' && 
           !Array.isArray(profileData);
  }

  /**
   * Get the current quality threshold
   * Useful for UI components that need to display the threshold
   * 
   * @returns The default quality threshold percentage
   */
  static getQualityThreshold(): number {
    return ProfileQualityService.DEFAULT_QUALITY_THRESHOLD;
  }
}

// Export singleton pattern for consistency with other services
let _profileQualityService: ProfileQualityService | null = null;

export const profileQualityService = {
  getInstance(): ProfileQualityService {
    if (!_profileQualityService) {
      _profileQualityService = new ProfileQualityService();
    }
    return _profileQualityService;
  },
  
  // Delegate static methods for convenience
  calculateQualityInfo: ProfileQualityService.calculateQualityInfo,
  filterQualityProfiles: ProfileQualityService.filterQualityProfiles,
  enrichWithQualityInfo: ProfileQualityService.enrichWithQualityInfo,
  isQualityProfile: ProfileQualityService.isQualityProfile,
  getQualityStats: ProfileQualityService.getQualityStats,
  processProfiles: ProfileQualityService.processProfiles,
  isValidProfileData: ProfileQualityService.isValidProfileData,
  getQualityThreshold: ProfileQualityService.getQualityThreshold
};

export default ProfileQualityService;
