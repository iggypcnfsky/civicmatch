"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AddIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { description: string }) => Promise<void>;
}

export default function AddIdeaModal({ isOpen, onClose, onAdd }: AddIdeaModalProps) {
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setError("Please describe your idea");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      await onAdd({
        description: description.trim(),
      });
      
      // Reset form and close
      setDescription("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add idea");
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
          <h2 className="text-lg font-medium">Share an Idea</h2>
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
            <label htmlFor="description" className="block text-sm font-medium">
              What&apos;s your idea?
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share your idea, suggestion, or thought for the project..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50 resize-none"
              disabled={submitting}
              maxLength={2000}
              autoFocus
            />
            <p className="text-xs text-[color:var(--foreground)]/50 text-right">
              {description.length}/2000
            </p>
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
              disabled={submitting || !description.trim()}
            >
              {submitting ? "Sharing..." : "Share Idea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
