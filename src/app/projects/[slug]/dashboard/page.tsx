"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Settings, Trash2, AlertTriangle, X, Save, ArrowLeft, ImageIcon, MapPin, ExternalLink, Presentation, Plus, ChevronRight, ChevronLeft } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { VisionContent, ResearchGrid, IdeasGrid, KanbanBoard, JobsPanel, PeoplePanel } from "@/components/project";
import { geocodeLocation } from "@/lib/services/GeocodingService";
import type { Project, ProjectRow, DashboardTab, OnboardingSlide } from "@/types/project";

const VALID_TABS: DashboardTab[] = ['about', 'presentation', 'plan', 'research', 'ideas', 'jobs', 'people'];

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const { status, user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('about');
  const [organizerIds, setOrganizerIds] = useState<string[]>([]);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    logoUrl: '',
    videoUrl: '',
    founderName: '',
    manifesto: '',
    city: '',
    country: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Onboarding edit state
  const [isEditingOnboarding, setIsEditingOnboarding] = useState(false);
  const [editingSlides, setEditingSlides] = useState<OnboardingSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  // Get tab from URL or default
  useEffect(() => {
    const tab = searchParams.get('tab') as DashboardTab;
    if (tab && VALID_TABS.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("slug", slug)
          .single();
        
        if (projectError) throw projectError;
        
        const row = projectData as unknown as ProjectRow;
        const projectObj: Project = {
          id: row.id,
          slug: row.slug,
          creatorId: row.creator_id,
          name: row.data.title || "Untitled",
          description: row.data.description || "",
          manifesto: row.data.manifesto,
          founderName: row.data.founderName,
          logoUrl: row.data.logoUrl,
          videoUrl: row.data.videoUrl,
          backgroundImageUrl: row.data.backgroundImageUrl,
          tags: row.data.tags,
          location: row.data.location,
          createdAt: row.created_at,
          onboardingSlides: row.data.onboardingSlides,
        };
        setProject(projectObj);
        
        // Initialize edit form
        setEditForm({
          title: row.data.title || '',
          description: row.data.description || '',
          logoUrl: row.data.logoUrl || '',
          videoUrl: row.data.videoUrl || '',
          founderName: row.data.founderName || '',
          manifesto: row.data.manifesto || '',
          city: row.data.location?.city || '',
          country: row.data.location?.country || '',
        });
        
        // Check if user is admin/creator
        const isCreator = row.creator_id === user.id;
        const organizers = row.data.organizers || [];
        const isOrganizer = organizers.includes(user.id);
        setIsAdmin(isCreator || isOrganizer);
        
        // Set organizer IDs (includes creator by default)
        if (!organizers.includes(row.creator_id)) {
          organizers.unshift(row.creator_id);
        }
        setOrganizerIds(organizers);
        
        // Check if user has completed the game
        const { data: completion } = await supabase
          .from("game_completions")
          .select("id")
          .eq("project_id", row.id)
          .eq("user_id", user.id)
          .single();
        
        if (!completion) {
          // Redirect to project page for onboarding if not completed
          router.push(`/projects/${slug}`);
          return;
        }
        
        setHasAccess(true);
        
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (slug && status === "authenticated" && user) {
      fetchData();
    } else if (status === "unauthenticated") {
      router.push(`/explore?returnUrl=${encodeURIComponent(`/projects/${slug}/dashboard`)}`);
    }
  }, [slug, user, status, router]);
  
  const handleSave = async () => {
    if (!project || !user) return;
    
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      // Check if location changed and geocode if needed
      let coordinates = project.location?.coordinates;
      const cityChanged = editForm.city !== (project.location?.city || '');
      const countryChanged = editForm.country !== (project.location?.country || '');
      
      if ((cityChanged || countryChanged) && (editForm.city || editForm.country)) {
        try {
          console.log("Geocoding location:", { city: editForm.city, country: editForm.country });
          const geocodeResult = await geocodeLocation({ 
            city: editForm.city, 
            country: editForm.country 
          });
          coordinates = { lat: geocodeResult.lat, lng: geocodeResult.lng };
          console.log("Geocoded coordinates:", coordinates);
        } catch (geoErr) {
          console.warn("Failed to geocode location:", geoErr);
          // Continue with old coordinates if geocoding fails
        }
      }
      
      const updatedData = {
        title: editForm.title,
        description: editForm.description,
        logoUrl: editForm.logoUrl || undefined,
        videoUrl: editForm.videoUrl || undefined,
        founderName: editForm.founderName || undefined,
        manifesto: editForm.manifesto || undefined,
        location: (editForm.city || editForm.country) ? {
          city: editForm.city || undefined,
          country: editForm.country || undefined,
          coordinates,
        } : undefined,
        tags: project.tags,
        stats: { memberCount: 1 },
        organizers: organizerIds.filter(id => id !== project.creatorId),
        onboardingSlides: project.onboardingSlides,
      };
      
      const { error } = await supabase
        .from("projects")
        .update({ data: updatedData })
        .eq("id", project.id);
      
      if (error) throw error;
      
      // Update local state
      setProject({
        ...project,
        name: editForm.title,
        description: editForm.description,
        logoUrl: editForm.logoUrl || undefined,
        videoUrl: editForm.videoUrl || undefined,
        founderName: editForm.founderName || undefined,
        manifesto: editForm.manifesto || undefined,
        location: updatedData.location,
      });
      
      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
      }, 1500);
      
    } catch (err) {
      console.error("Error saving project:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!project || !user) return;
    
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);
      
      if (error) throw error;
      
      // Redirect to explore after deletion
      router.push("/explore");
      
    } catch (err) {
      console.error("Error deleting project:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to delete");
    }
  };
  
  // Onboarding slide editing functions
  const startEditingOnboarding = () => {
    if (!project) return;
    setEditingSlides(project.onboardingSlides && project.onboardingSlides.length > 0 
      ? [...project.onboardingSlides] 
      : [{ id: crypto.randomUUID(), title: project.name, content: project.description }]
    );
    setCurrentSlideIndex(0);
    setIsEditingOnboarding(true);
  };
  
  const addSlide = () => {
    if (editingSlides.length >= 10) return;
    const newSlide: OnboardingSlide = { 
      id: crypto.randomUUID(), 
      title: "", 
      content: "" 
    };
    setEditingSlides([...editingSlides, newSlide]);
    setCurrentSlideIndex(editingSlides.length);
  };
  
  const removeSlide = (index: number) => {
    if (editingSlides.length <= 1) return;
    const newSlides = editingSlides.filter((_, i) => i !== index);
    setEditingSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };
  
  const updateSlide = (index: number, updates: Partial<OnboardingSlide>) => {
    const newSlides = [...editingSlides];
    newSlides[index] = { ...newSlides[index], ...updates };
    setEditingSlides(newSlides);
  };
  
  const saveOnboardingChanges = async () => {
    if (!project) return;
    
    setSaving(true);
    setSaveError(null);
    
    try {
      const updatedData = {
        title: project.name,
        description: project.description,
        logoUrl: project.logoUrl,
        videoUrl: project.videoUrl,
        founderName: project.founderName,
        manifesto: project.manifesto,
        location: project.location,
        tags: project.tags,
        stats: { memberCount: 1 },
        organizers: organizerIds.filter(id => id !== project.creatorId),
        onboardingSlides: editingSlides,
      };
      
      const { error } = await supabase
        .from("projects")
        .update({ data: updatedData })
        .eq("id", project.id);
      
      if (error) throw error;
      
      setProject({
        ...project,
        onboardingSlides: editingSlides,
      });
      
      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditingOnboarding(false);
        setSaveSuccess(false);
      }, 1500);
      
    } catch (err) {
      console.error("Error saving onboarding:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };
  
  const currentEditingSlide = editingSlides[currentSlideIndex];
  
  if (status === "loading" || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[color:var(--foreground)]"></div>
      </div>
    );
  }
  
  if (!hasAccess || !project) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-dvh flex flex-col pt-12">
      {/* Project Header with Admin Controls */}
      <div className="border-b border-divider bg-[color:var(--background)]">
        <div className="page-container py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/explore"
                className="p-2 rounded-full hover:bg-[color:var(--muted)]/20 transition-colors"
                aria-label="Back to explore"
              >
                <ArrowLeft className="size-5" />
              </Link>
              
              {project.logoUrl ? (
                <img 
                  src={project.logoUrl} 
                  alt="" 
                  className="w-12 h-12 rounded-xl object-cover border border-divider"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[color:var(--accent)]/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-[color:var(--accent)]">
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div>
                <h1 className="text-xl font-semibold">{project.name}</h1>
                <p className="text-sm opacity-60 line-clamp-1">{project.description}</p>
              </div>
            </div>
            
            {/* Admin Actions */}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-divider hover:bg-[color:var(--muted)]/20 transition-colors"
                >
                  <Settings className="size-4" />
                  <span className="hidden sm:inline">Settings</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <main className="flex-1 page-container py-6">
        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="w-full">
            <VisionContent project={project} compact />
          </div>
        )}
        
        {/* Presentation Tab */}
        {activeTab === 'presentation' && (
          <PresentationView project={project} />
        )}
        
        {/* Plan Tab (Kanban Roadmap) */}
        {activeTab === 'plan' && (
          <KanbanBoard projectId={project.id} />
        )}
        
        {/* Research Tab */}
        {activeTab === 'research' && (
          <ResearchGrid projectId={project.id} />
        )}
        
        {/* Ideas Tab */}
        {activeTab === 'ideas' && (
          <IdeasGrid projectId={project.id} />
        )}
        
        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <JobsPanel projectId={project.id} />
        )}
        
        {/* People Tab */}
        {activeTab === 'people' && (
          <PeoplePanel projectId={project.id} organizerIds={organizerIds} />
        )}
      </main>
      
      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-[color:var(--background)] rounded-2xl border border-divider shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-divider">
              <h2 className="text-xl font-semibold">Project Settings</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="h-8 w-8 rounded-full border border-divider flex items-center justify-center hover:bg-[color:var(--muted)]/20 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            
            {/* Form */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-4">
              {saveError && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  {saveError}
                </div>
              )}
              
              {saveSuccess && (
                <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
                  Changes saved successfully!
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Project Name *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Description *</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Logo URL</label>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="size-4 opacity-40" />
                    <input
                      type="url"
                      value={editForm.logoUrl}
                      onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">Video URL</label>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="size-4 opacity-40" />
                    <input
                      type="url"
                      value={editForm.videoUrl}
                      onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Founder Name</label>
                <input
                  type="text"
                  value={editForm.founderName}
                  onChange={(e) => setEditForm({ ...editForm, founderName: e.target.value })}
                  className="w-full rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    <MapPin className="size-3.5 inline mr-1" />
                    City
                  </label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">Country</label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Manifesto</label>
                <textarea
                  value={editForm.manifesto}
                  onChange={(e) => setEditForm({ ...editForm, manifesto: e.target.value })}
                  rows={4}
                  placeholder="Your project's mission statement..."
                  className="w-full rounded-lg border border-divider bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50 resize-none"
                />
              </div>
              
              {/* Onboarding Section */}
              <div className="pt-4 border-t border-divider">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Presentation className="size-4" />
                      Onboarding Presentation
                    </h3>
                    <p className="text-xs opacity-60 mt-0.5">
                      {project.onboardingSlides?.length || 0} slides
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      startEditingOnboarding();
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm border border-divider hover:bg-[color:var(--muted)]/20 transition-colors"
                  >
                    Edit Slides
                  </button>
                </div>
              </div>
              
              {/* Danger Zone */}
              <div className="pt-6 border-t border-divider">
                <h3 className="text-sm font-medium text-red-500 flex items-center gap-2 mb-3">
                  <AlertTriangle className="size-4" />
                  Danger Zone
                </h3>
                
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-500 text-sm hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="size-4" />
                    Delete Project
                  </button>
                ) : (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-500 mb-3">
                      Are you sure? This action cannot be undone. All project data will be permanently deleted.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleDelete}
                        className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                      >
                        Yes, Delete Project
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 rounded-lg border border-divider text-sm hover:bg-[color:var(--muted)]/20 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-divider">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-lg border border-divider text-sm hover:bg-[color:var(--muted)]/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Onboarding Edit Modal */}
      {isEditingOnboarding && currentEditingSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-[color:var(--background)] rounded-2xl border border-divider shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-divider">
              <div>
                <h2 className="text-xl font-semibold">Edit Onboarding</h2>
                <p className="text-sm opacity-60">
                  Slide {currentSlideIndex + 1} of {editingSlides.length}
                </p>
              </div>
              <button
                onClick={() => setIsEditingOnboarding(false)}
                className="h-8 w-8 rounded-full border border-divider flex items-center justify-center hover:bg-[color:var(--muted)]/20 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)] space-y-4">
              {saveError && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  {saveError}
                </div>
              )}
              
              {saveSuccess && (
                <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
                  Changes saved successfully!
                </div>
              )}
              
              {/* Slide Navigation */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-transparent">
                {editingSlides.map((slide, index) => (
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
                    {editingSlides.length > 1 && (
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
                {editingSlides.length < 10 && (
                  <button
                    onClick={addSlide}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-dashed border-divider hover:border-[color:var(--accent)]/50 hover:bg-[color:var(--accent)]/5 transition-all"
                  >
                    <Plus className="size-4" />
                    Add
                  </button>
                )}
              </div>
              
              {/* Slide Editor */}
              <div className="space-y-4 p-4 rounded-xl border border-divider bg-[color:var(--muted)]/5">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Slide Title *</label>
                  <input
                    type="text"
                    value={currentEditingSlide.title}
                    onChange={(e) => updateSlide(currentSlideIndex, { title: e.target.value })}
                    placeholder="Slide title"
                    className="w-full rounded-lg border border-divider bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">Content *</label>
                  <textarea
                    value={currentEditingSlide.content}
                    onChange={(e) => updateSlide(currentSlideIndex, { content: e.target.value })}
                    placeholder="Slide content"
                    rows={5}
                    className="w-full rounded-lg border border-divider bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50 resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">Image URL (optional)</label>
                  <input
                    type="url"
                    value={currentEditingSlide.imageUrl || ""}
                    onChange={(e) => updateSlide(currentSlideIndex, { imageUrl: e.target.value || undefined })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-divider bg-[color:var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--accent)]/50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">Background Color (optional)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentEditingSlide.backgroundColor || "#111827"}
                      onChange={(e) => updateSlide(currentSlideIndex, { backgroundColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-divider cursor-pointer"
                    />
                    <input
                      type="text"
                      value={currentEditingSlide.backgroundColor || ""}
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
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-divider">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                  disabled={currentSlideIndex === 0}
                  className="p-2 rounded-lg border border-divider hover:bg-[color:var(--muted)]/20 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => setCurrentSlideIndex(Math.min(editingSlides.length - 1, currentSlideIndex + 1))}
                  disabled={currentSlideIndex === editingSlides.length - 1}
                  className="p-2 rounded-lg border border-divider hover:bg-[color:var(--muted)]/20 transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEditingOnboarding(false)}
                  className="px-4 py-2 rounded-lg border border-divider text-sm hover:bg-[color:var(--muted)]/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveOnboardingChanges}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save Slides
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Presentation View Component
function PresentationView({ project }: { project: Project }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  const slides = project.onboardingSlides && project.onboardingSlides.length > 0 
    ? project.onboardingSlides 
    : getDefaultSlides(project);
  
  const currentSlide = slides[currentSlideIndex];
  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex === slides.length - 1;
  
  const goToNext = () => {
    if (!isLastSlide) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };
  
  const goToPrevious = () => {
    if (!isFirstSlide) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Slide Display */}
      <div 
        className="relative rounded-2xl overflow-hidden min-h-[400px] md:min-h-[500px] flex flex-col"
        style={{ backgroundColor: currentSlide.backgroundColor || 'var(--muted)' }}
      >
        {/* Slide Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center">
          {currentSlide.imageUrl && (
            <div className="mb-6">
              <img 
                src={currentSlide.imageUrl} 
                alt=""
                className="max-w-full max-h-[200px] md:max-h-[250px] object-contain rounded-xl"
              />
            </div>
          )}
          
          <h2 className="text-2xl md:text-4xl font-semibold mb-4">
            {currentSlide.title}
          </h2>
          
          <p className="text-base md:text-lg opacity-80 max-w-2xl whitespace-pre-wrap">
            {currentSlide.content}
          </p>
        </div>
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between p-4 md:p-6 bg-[color:var(--background)]/80 backdrop-blur-sm border-t border-divider">
          <button
            onClick={goToPrevious}
            disabled={isFirstSlide}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isFirstSlide 
                ? 'opacity-30 cursor-not-allowed' 
                : 'hover:bg-[color:var(--muted)]/20'
            }`}
          >
            <ChevronLeft className="size-4" />
            Previous
          </button>
          
          {/* Slide Indicators */}
          <div className="flex items-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlideIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlideIndex 
                    ? 'w-6 bg-[color:var(--accent)]' 
                    : 'bg-[color:var(--muted)]/40 hover:bg-[color:var(--muted)]/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
          
          <button
            onClick={goToNext}
            disabled={isLastSlide}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isLastSlide 
                ? 'opacity-30 cursor-not-allowed' 
                : 'hover:bg-[color:var(--muted)]/20'
            }`}
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      
      {/* Slide Counter */}
      <div className="text-center mt-4 text-sm opacity-60">
        Slide {currentSlideIndex + 1} of {slides.length}
      </div>
    </div>
  );
}

// Default slides for projects without custom onboarding
function getDefaultSlides(project: Project): OnboardingSlide[] {
  return [
    {
      id: '1',
      title: project.name,
      content: project.description || 'Welcome to this project.',
    },
    {
      id: '2',
      title: 'The Mission',
      content: project.manifesto || 'This project is dedicated to creating positive impact.',
    },
  ];
}
