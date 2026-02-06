"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AddResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; description: string; url?: string }) => Promise<void>;
}

export default function AddResearchModal({ isOpen, onClose, onAdd }: AddResearchModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim(),
        url: url.trim() || undefined,
      });
      
      // Reset form and close
      setTitle("");
      setDescription("");
      setUrl("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add research");
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
      <div className="bg-[color:var(--background)] rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-divider">
          <h2 className="text-lg font-medium">Add Research</h2>
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
              Title <span className="text-[color:var(--accent)]">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Research title"
              className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50"
              disabled={submitting}
              maxLength={200}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium">
              Description <span className="text-[color:var(--accent)]">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this research..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50 resize-none"
              disabled={submitting}
              maxLength={1000}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="url" className="block text-sm font-medium">
              Link <span className="text-[color:var(--foreground)]/50">(optional)</span>
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50"
              disabled={submitting}
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
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add Research"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
