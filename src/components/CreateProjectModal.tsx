"use client";

import { useState, useCallback } from "react";
import { X, Plus, Trash2, ArrowRight, ArrowLeft, ImageIcon, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { geocodeLocation } from "@/lib/services/GeocodingService";
import type { OnboardingSlide } from "@/types/project";

interface CreateProjectModalProps {
  onClose: () => void;
  onProjectCreated: () => void;
}

const MIN_SLIDES = 1;
const MAX_SLIDES = 10;

export default function CreateProjectModal({ onClose, onProjectCreated }: CreateProjectModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"details" | "onboarding" | "creating">("details");
  const [error, setError] = useState<string | null>(null);
  
  // Project details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [location, setLocation] = useState({ city: "", country: "", coordinates: { lat: 0, lng: 0 } });
  
  // Onboarding slides
  const [slides, setSlides] = useState<OnboardingSlide[]>([
    { id: crypto.randomUUID(), title: "", content: "" },
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  const currentSlide = slides[currentSlideIndex];

  const generateSlug = (title: string) => {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 40);
    // Add random suffix to ensure uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${randomSuffix}`;
  };

  const validateDetails = () => {
    if (!title.trim()) return "Project title is required";
    if (!description.trim()) return "Project description is required";
    return null;
  };

  const validateSlides = () => {
    for (let i = 0; i < slides.length; i++) {
      if (!slides[i].title.trim()) return `Slide ${i + 1} needs a title`;
      if (!slides[i].content.trim()) return `Slide ${i + 1} needs content`;
    }
    return null;
  };

  const handleNext = () => {
    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep("onboarding");
  };

  const handleBack = () => {
    setStep("details");
    setError(null);
  };

  const addSlide = () => {
    if (slides.length >= MAX_SLIDES) return;
    const newSlide: OnboardingSlide = { id: crypto.randomUUID(), title: "", content: "" };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const removeSlide = (index: number) => {
    if (slides.length <= MIN_SLIDES) return;
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };

  const updateSlide = (index: number, updates: Partial<OnboardingSlide>) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], ...updates };
    setSlides(newSlides);
  };

  const handleCreate = async () => {
    const validationError = validateSlides();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (!user) {
      setError("You must be logged in to create a project");
      return;
    }

    setStep("creating");
    setError(null);

    try {
      const slug = generateSlug(title);
      console.log("Creating project with slug:", slug);
      console.log("User:", user.id);
      
      // Geocode location if provided
      let coordinates = { lat: 0, lng: 0 };
      if (location.city) {
        try {
          console.log("Geocoding location:", { city: location.city, country: location.country });
          const geocodeResult = await geocodeLocation({ 
            city: location.city, 
            country: location.country 
          });
          coordinates = { lat: geocodeResult.lat, lng: geocodeResult.lng };
          console.log("Geocoded coordinates:", coordinates);
        } catch (geoErr) {
          console.warn("Failed to geocode location:", geoErr);
          // Continue with default coordinates if geocoding fails
        }
      }
      
      const projectData = {
        slug,
        creator_id: user.id,
        data: {
          title,
          description,
          logoUrl: logoUrl || undefined,
          location: location.city ? { 
            city: location.city, 
            country: location.country,
            coordinates 
          } : undefined,
          onboardingSlides: slides,
          stats: { memberCount: 1 },
        },
      };
      console.log("Project data:", JSON.stringify(projectData, null, 2));
      
      // Create project
      const { data: createdProject, error: projectError } = await supabase
        .from("projects")
        .insert(projectData)
        .select()
        .single();

      if (projectError) {
        console.error("Project creation error:", projectError);
        throw projectError;
      }
      
      console.log("Project created:", createdProject);

      // Add creator as founder member
      const { error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: createdProject.id,
          user_id: user.id,
          role: "founder",
          data: {},
        });

      if (memberError) {
        console.error("Member creation error:", memberError);
        throw memberError;
      }

      console.log("Member added, calling onProjectCreated");
      onProjectCreated();
    } catch (err) {
      console.error("Error creating project:", err);
      // Handle Supabase error format
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err && 'message' in err 
          ? String(err.message) 
          : "Failed to create project";
      setError(errorMessage);
      setStep("onboarding");
    }
  };

  const renderDetailsStep = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Project Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter your project name"
          className="w-full rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Briefly describe your project"
          rows={3}
          className="w-full rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Logo URL (optional)</label>
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
          className="w-full rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">City (optional)</label>
          <input
            type="text"
            value={location.city}
            onChange={(e) => setLocation({ ...location, city: e.target.value })}
            placeholder="City"
            className="w-full rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Country (optional)</label>
          <input
            type="text"
            value={location.country}
            onChange={(e) => setLocation({ ...location, country: e.target.value })}
            placeholder="Country"
            className="w-full rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:brightness-110 transition-all"
        >
          Next: Design Onboarding
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );

  const renderOnboardingStep = () => (
    <div className="space-y-4">
      <p className="text-sm opacity-70">
        Design an onboarding presentation that new members will see when they join your project.
      </p>

      {/* Slide Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-transparent">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => setCurrentSlideIndex(index)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              index === currentSlideIndex
                ? "bg-[color:var(--accent)] text-[color:var(--background)]"
                : "bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30"
            }`}
          >
            Slide {index + 1}
            {slides.length > MIN_SLIDES && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSlide(index);
                }}
                className="opacity-60 hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            )}
          </button>
        ))}
        {slides.length < MAX_SLIDES && (
          <button
            onClick={addSlide}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-dashed border-divider hover:border-[color:var(--accent)]/50 hover:bg-[color:var(--accent)]/5 transition-all"
          >
            <Plus className="size-4" />
            Add Slide
          </button>
        )}
      </div>

      {/* Slide Editor */}
      <div className="space-y-4 p-4 rounded-xl border border-divider bg-[color:var(--muted)]/5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Slide Title *</label>
          <input
            type="text"
            value={currentSlide.title}
            onChange={(e) => updateSlide(currentSlideIndex, { title: e.target.value })}
            placeholder={`Slide ${currentSlideIndex + 1} title`}
            className="w-full rounded-lg border border-divider bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Content *</label>
          <textarea
            value={currentSlide.content}
            onChange={(e) => updateSlide(currentSlideIndex, { content: e.target.value })}
            placeholder="What should people know on this slide?"
            rows={5}
            className="w-full rounded-lg border border-divider bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Image URL (optional)</label>
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 opacity-40" />
            <input
              type="url"
              value={currentSlide.imageUrl || ""}
              onChange={(e) => updateSlide(currentSlideIndex, { imageUrl: e.target.value })}
              placeholder="https://example.com/image.png"
              className="flex-1 rounded-lg border border-divider bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Background Color (optional)</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentSlide.backgroundColor || "#111827"}
              onChange={(e) => updateSlide(currentSlideIndex, { backgroundColor: e.target.value })}
              className="w-10 h-10 rounded-lg border border-divider cursor-pointer"
            />
            <input
              type="text"
              value={currentSlide.backgroundColor || ""}
              onChange={(e) => updateSlide(currentSlideIndex, { backgroundColor: e.target.value })}
              placeholder="#111827"
              className="flex-1 rounded-lg border border-divider bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
            />
            <button
              onClick={() => updateSlide(currentSlideIndex, { backgroundColor: undefined })}
              className="px-3 py-2 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleBack}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm font-medium transition-all"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <button
          onClick={handleCreate}
          className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:brightness-110 transition-all"
        >
          <Check className="size-4" />
          Create Project
        </button>
      </div>
    </div>
  );

  const renderCreatingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[color:var(--accent)]"></div>
      <p className="text-sm opacity-70">Creating your project...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[color:var(--background)] rounded-2xl border border-divider shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-divider">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">
              {step === "details" && "Create New Project"}
              {step === "onboarding" && "Design Onboarding"}
              {step === "creating" && "Creating Project..."}
            </h2>
          </div>
          {step !== "creating" && (
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full border border-divider flex items-center justify-center hover:bg-[color:var(--muted)]/20 transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
              {error}
            </div>
          )}

          {step === "details" && renderDetailsStep()}
          {step === "onboarding" && renderOnboardingStep()}
          {step === "creating" && renderCreatingStep()}
        </div>
      </div>
    </div>
  );
}
