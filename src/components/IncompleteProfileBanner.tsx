"use client";

import { useState, useEffect } from "react";
import { AlertCircle, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { ProfileQualityService } from "@/lib/services/ProfileQualityService";
import { useRouter } from "next/navigation";

export default function IncompleteProfileBanner() {
  const { status, user } = useAuth();
  const router = useRouter();
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check profile completion status
  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (status !== "authenticated" || !user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if banner was dismissed in this session
        const dismissedKey = `incomplete-banner-dismissed-${user.id}`;
        const wasDismissed = sessionStorage.getItem(dismissedKey) === 'true';
        if (wasDismissed) {
          setIsDismissed(true);
          setIsLoading(false);
          return;
        }

        // Fetch current user's profile
        const { data, error } = await supabase
          .from("profiles")
          .select("data")
          .eq("user_id", user.id)
          .single();

        if (error || !data) {
          setIsLoading(false);
          return;
        }

        // Calculate profile quality
        const profileData = data.data as Record<string, unknown>;
        const qualityInfo = ProfileQualityService.calculateQualityInfo(user.id, profileData);
        
        setIsIncomplete(!qualityInfo.isQualityProfile);
        setCompletionPercentage(qualityInfo.completionPercentage);
        setIsLoading(false);

      } catch (error) {
        console.error('Error checking profile completion:', error);
        setIsLoading(false);
      }
    };

    checkProfileCompletion();
  }, [status, user?.id]);

  // Handle banner dismissal
  const handleDismiss = () => {
    if (user?.id) {
      const dismissedKey = `incomplete-banner-dismissed-${user.id}`;
      sessionStorage.setItem(dismissedKey, 'true');
    }
    setIsDismissed(true);
  };

  // Handle click to complete profile - disabled since profile page is removed
  const handleCompleteProfile = () => {
    // Profile page removed - profile viewing/editing now done in sidebar
    // TODO: Implement alternative profile completion flow
  };

  // Don't show banner if:
  // - Still loading
  // - User not authenticated
  // - Profile is complete (≥50%)
  // - Banner was dismissed
  if (isLoading || status !== "authenticated" || !isIncomplete || isDismissed) {
    return null;
  }

  return (
    <div className="w-full bg-[color:var(--background)] border-b border-divider relative z-50 opacity-100">
      <div className="flex items-center py-3 px-4 sm:px-6 lg:px-8">
        {/* Left: Icon and message - aligned with logo */}
        <div className="flex items-center gap-3 flex-1">
          <AlertCircle className="size-5 text-[color:var(--accent)] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-[color:var(--foreground)] leading-5">
              <span className="font-medium">Your profile is {completionPercentage}% complete.</span>
              {' '}You&apos;re not visible to other users yet. Complete your profile to start connecting!
            </p>
          </div>
        </div>

        {/* Right: Action buttons - aligned with user avatar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            disabled
            onClick={handleCompleteProfile}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--muted)] text-[color:var(--foreground)]/50 text-sm font-medium rounded-full transition-colors whitespace-nowrap cursor-not-allowed"
            title="Profile editing temporarily unavailable"
          >
            Complete Profile
            <ArrowRight className="size-4" />
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-1.5 text-[color:var(--foreground)] hover:text-[color:var(--foreground)]/80 transition-colors flex-shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
