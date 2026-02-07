"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, X, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import type { Project, OnboardingSlide } from "@/types/project";

interface ProjectOnboardingProps {
  project: Project;
  onComplete: () => void;
  onClose?: () => void;
}

export default function ProjectOnboarding({ project, onComplete, onClose }: ProjectOnboardingProps) {
  const router = useRouter();
  const { user, status } = useAuth();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  
  const slides = project.onboardingSlides && project.onboardingSlides.length > 0 
    ? project.onboardingSlides 
    : getDefaultSlides(project);
  
  const currentSlide = slides[currentSlideIndex];
  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex === slides.length - 1;

  // Check if user has already completed the onboarding/game
  useEffect(() => {
    async function checkCompletion() {
      if (status !== "authenticated" || !user || !project) return;
      
      try {
        const { data: completion } = await supabase
          .from("game_completions")
          .select("id")
          .eq("project_id", project.id)
          .eq("user_id", user.id)
          .single();
        
        if (completion) {
          setHasCompleted(true);
        }
      } catch {
        // No completion found - user hasn't completed yet
      }
    }
    
    checkCompletion();
  }, [project, user, status]);

  const goToNext = useCallback(() => {
    if (isLastSlide) {
      handleComplete();
    } else {
      setCurrentSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
    }
  }, [isLastSlide, slides.length]);

  const goToPrevious = () => {
    setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleComplete = async () => {
    if (isCompleting) return;
    
    // If user is not authenticated, redirect to login
    if (status !== "authenticated" || !user) {
      router.push(`/explore?returnUrl=${encodeURIComponent(`/projects/${project.slug}`)}`);
      return;
    }

    // If user has already completed, just go to dashboard
    if (hasCompleted) {
      onComplete();
      return;
    }

    setIsCompleting(true);

    try {
      // Record completion
      const { error } = await supabase
        .from("game_completions")
        .insert({
          project_id: project.id,
          user_id: user.id,
          data: {
            completedViaOnboarding: true,
            completedAt: new Date().toISOString(),
            slidesViewed: slides.length,
          },
        });

      if (error) {
        // If already completed (unique constraint), that's fine
        if (error.code !== "23505") {
          throw error;
        }
      }

      onComplete();
    } catch (err) {
      console.error("Error completing onboarding:", err);
      setIsCompleting(false);
    }
  };

  const handleSkip = () => {
    if (onClose) {
      onClose();
    } else {
      router.push("/explore");
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext]);

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: currentSlide.backgroundColor || "var(--background)" }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          {project.logoUrl ? (
            <img src={project.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[color:var(--accent)]/20" />
          )}
          <span className="font-medium text-sm md:text-base">{project.name}</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Progress indicator */}
          <div className="hidden md:flex items-center gap-1.5">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlideIndex(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index <= currentSlideIndex 
                    ? "w-6 bg-[color:var(--accent)]" 
                    : "w-1.5 bg-[color:var(--muted)]/40"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
          
          <button
            onClick={handleSkip}
            className="p-2 rounded-full hover:bg-[color:var(--muted)]/20 transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 lg:px-24 py-8 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto">
          {/* Slide Content */}
          <div className="text-center space-y-6 md:space-y-8">
            {currentSlide.imageUrl && (
              <div className="flex justify-center">
                <img 
                  src={currentSlide.imageUrl} 
                  alt=""
                  className="max-w-full max-h-[40vh] object-contain rounded-2xl shadow-lg"
                />
              </div>
            )}
            
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold leading-tight">
              {currentSlide.title}
            </h1>
            
            <p className="text-lg md:text-xl lg:text-2xl opacity-70 max-w-2xl mx-auto leading-relaxed whitespace-pre-wrap">
              {currentSlide.content}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between p-4 md:p-6">
        {/* Previous Button */}
        <button
          onClick={goToPrevious}
          disabled={isFirstSlide}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            isFirstSlide 
              ? "opacity-0 pointer-events-none" 
              : "hover:bg-[color:var(--muted)]/20"
          }`}
        >
          <ChevronLeft className="size-5" />
          <span className="hidden md:inline">Previous</span>
        </button>

        {/* Mobile Progress */}
        <div className="md:hidden flex items-center gap-1.5">
          <span className="text-sm opacity-60">
            {currentSlideIndex + 1} / {slides.length}
          </span>
        </div>

        {/* Next/Complete Button */}
        <button
          onClick={goToNext}
          disabled={isCompleting}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
        >
          <span>
            {isLastSlide 
              ? hasCompleted ? "Enter Dashboard" : "Complete & Join" 
              : "Next"
            }
          </span>
          {isLastSlide ? (
            <ArrowRight className="size-5" />
          ) : (
            <ChevronRight className="size-5" />
          )}
        </button>
      </div>
    </div>
  );
}

// Default slides for projects without custom onboarding
function getDefaultSlides(project: Project): OnboardingSlide[] {
  return [
    {
      id: "1",
      title: project.name,
      content: project.description || "Welcome to this project.",
    },
    {
      id: "2",
      title: "The Mission",
      content: project.manifesto || "This project is dedicated to creating positive impact.",
    },
    {
      id: "3",
      title: "Join Us",
      content: "Complete this onboarding to access the project dashboard and collaborate with the team.",
    },
  ];
}
