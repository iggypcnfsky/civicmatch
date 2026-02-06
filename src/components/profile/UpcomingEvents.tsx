"use client";

import { Calendar } from "lucide-react";

interface UpcomingEventsProps {
  userId: string;
  limit?: number;
}

/**
 * Placeholder component for upcoming events
 * Events feature is not yet implemented in the database
 */
export function UpcomingEvents({ userId, limit = 3 }: UpcomingEventsProps) {
  // Events not yet implemented - show placeholder
  void userId;
  void limit;
  
  return (
    <div className="text-center py-6 text-[color:var(--muted-foreground)]">
      <Calendar className="size-6 mx-auto mb-2 opacity-40" />
      <p className="text-sm">No upcoming events</p>
    </div>
  );
}
