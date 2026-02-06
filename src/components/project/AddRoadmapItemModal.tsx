"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { RoadmapStatus } from "@/types/project";

interface AddRoadmapItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { 
    title: string; 
    description?: string; 
    status: RoadmapStatus;
    priority?: 'low' | 'medium' | 'high';
  }) => Promise<void>;
  defaultStatus?: RoadmapStatus;
}

export default function AddRoadmapItemModal({ 
  isOpen, 
  onClose, 
  onAdd,
  defaultStatus = 'backlog' 
}: AddRoadmapItemModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<RoadmapStatus>(defaultStatus);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority: priority || undefined,
      });
      
      // Reset form and close
      setTitle("");
      setDescription("");
      setStatus(defaultStatus);
      setPriority('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
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
          <h2 className="text-lg font-medium">Add to Roadmap</h2>
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
              placeholder="What needs to be done?"
              className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50"
              disabled={submitting}
              maxLength={200}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium">
              Description <span className="text-[color:var(--foreground)]/50">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50 resize-none"
              disabled={submitting}
              maxLength={500}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RoadmapStatus)}
                className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50"
                disabled={submitting}
              >
                <option value="backlog">Backlog</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="priority" className="block text-sm font-medium">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | '')}
                className="w-full px-4 py-3 rounded-xl border border-divider bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50"
                disabled={submitting}
              >
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
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
              disabled={submitting || !title.trim()}
            >
              {submitting ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
