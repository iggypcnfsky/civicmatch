"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { JobType } from "@/types/project";
import { JOB_TYPE_LABELS } from "@/types/project";

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { 
    title: string; 
    description: string;
    location: string;
    type: JobType;
    requirements?: string;
  }) => Promise<void>;
}

export default function AddJobModal({ 
  isOpen, 
  onClose, 
  onAdd,
}: AddJobModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<JobType>("full_time");
  const [requirements, setRequirements] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError("Job title is required");
      return;
    }
    if (!description.trim()) {
      setError("Job description is required");
      return;
    }
    if (!location.trim()) {
      setError("Location is required");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        type,
        requirements: requirements.trim() || undefined,
      });
      
      // Reset form and close
      setTitle("");
      setDescription("");
      setLocation("");
      setType("full_time");
      setRequirements("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[color:var(--background)] rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-divider sticky top-0 bg-[color:var(--background)]">
          <h2 className="text-lg font-medium">Add Job Listing</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[color:var(--muted)]/30 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium">
              Job Title <span className="text-[color:var(--accent)]">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Product Designer"
              className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50"
              disabled={submitting}
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="type" className="block text-sm font-medium">
                Type <span className="text-[color:var(--accent)]">*</span>
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as JobType)}
                className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50"
                disabled={submitting}
              >
                {(Object.keys(JOB_TYPE_LABELS) as JobType[]).map((jobType) => (
                  <option key={jobType} value={jobType}>
                    {JOB_TYPE_LABELS[jobType]}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="location" className="block text-sm font-medium">
                Location <span className="text-[color:var(--accent)]">*</span>
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Remote, NYC"
                className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50"
                disabled={submitting}
                maxLength={100}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium">
              Description <span className="text-[color:var(--accent)]">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50 resize-none"
              disabled={submitting}
              maxLength={2000}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="requirements" className="block text-sm font-medium">
              Requirements <span className="text-[color:var(--foreground)]/50">(optional)</span>
            </label>
            <textarea
              id="requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="List skills, experience, or qualifications needed..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50 resize-none"
              disabled={submitting}
              maxLength={1000}
            />
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-full border border-divider hover:bg-[color:var(--muted)]/20 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={submitting || !title.trim() || !description.trim() || !location.trim()}
            >
              {submitting ? "Adding..." : "Add Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
