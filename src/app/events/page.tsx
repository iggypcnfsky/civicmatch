// Events Page - Displays both user-submitted and discovered events
// Features: List view with filters, map integration, create event modal

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Calendar, 
  MapPin, 
  Plus, 
  Filter, 
  Globe, 
  Sparkles,
  Loader2,
  ChevronDown,
  ExternalLink,
  Clock,
  Tag
} from 'lucide-react';
import { useEvents, useDiscoveredEvents } from '@/lib/hooks/useEvents';
import type { CombinedEvent, DiscoveredEvent } from '@/types/discoveredEvent';
import { getEventTypeInfo, formatEventDates, getCostLabel, getRelevanceLabel } from '@/types/discoveredEvent';
import CreateEventModal from '@/components/CreateEventModal';

// Loading fallback
function EventsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="size-8 animate-spin text-[color:var(--accent)]" />
    </div>
  );
}

// Main component wrapped in Suspense
function EventsContent() {
  const searchParams = useSearchParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'user' | 'discovered'>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  // Get initial tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'user') setViewMode('user');
    if (tab === 'discovered') setViewMode('discovered');
  }, [searchParams]);

  // Fetch events based on view mode
  const allEvents = useEvents({ upcoming: true, limit: 20 });
  const discoveredOnly = useDiscoveredEvents({ 
    upcoming: true, 
    type: selectedType ? [selectedType] : undefined,
    limit: 20 
  });

  const { events, isLoading, error, hasMore, loadMore, stats } = 
    viewMode === 'discovered' ? 
      { ...discoveredOnly, events: discoveredOnly.events as unknown as CombinedEvent[], stats: null } : 
      allEvents;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-divider bg-[color:var(--background)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Events</h1>
              <p className="text-[color:var(--muted-foreground)]">
                Discover civic tech conferences, hackathons, meetups, and workshops
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:brightness-110 transition-all"
            >
              <Plus className="size-5" />
              Create Event
            </button>
          </div>

          {/* Stats Bar */}
          {stats && (
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--muted)]/10">
                <Sparkles className="size-4 text-[color:var(--accent)]" />
                <span className="font-medium">{stats.active_count}</span>
                <span className="text-[color:var(--muted-foreground)]">discovered events</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--muted)]/10">
                <Calendar className="size-4 text-green-500" />
                <span className="font-medium">{stats.this_month}</span>
                <span className="text-[color:var(--muted-foreground)]">this month</span>
              </div>
              {stats.new_24h > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600">
                  <span className="font-medium">{stats.new_24h} new</span>
                  <span className="text-blue-500/70">in last 24h</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-divider bg-[color:var(--muted)]/5">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-divider bg-[color:var(--background)]">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'all' 
                    ? 'bg-[color:var(--accent)] text-[color:var(--background)]' 
                    : 'hover:bg-[color:var(--muted)]/20'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setViewMode('user')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'user' 
                    ? 'bg-[color:var(--accent)] text-[color:var(--background)]' 
                    : 'hover:bg-[color:var(--muted)]/20'
                }`}
              >
                Community
              </button>
              <button
                onClick={() => setViewMode('discovered')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'discovered' 
                    ? 'bg-[color:var(--accent)] text-[color:var(--background)]' 
                    : 'hover:bg-[color:var(--muted)]/20'
                }`}
              >
                Discovered
              </button>
            </div>

            {/* Filter Button */}
            {viewMode === 'discovered' && (
              <div className="relative">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-divider bg-[color:var(--background)] text-sm font-medium hover:bg-[color:var(--muted)]/10 transition-colors"
                >
                  <Filter className="size-4" />
                  Filter
                  {selectedType && <span className="ml-1 w-2 h-2 rounded-full bg-[color:var(--accent)]" />}
                </button>

                {filterOpen && (
                  <div className="absolute top-full mt-2 left-0 w-56 p-2 rounded-xl border border-divider bg-[color:var(--background)] shadow-xl z-10">
                    <div className="text-xs font-medium text-[color:var(--muted-foreground)] px-3 py-2 uppercase tracking-wide">
                      Event Type
                    </div>
                    <button
                      onClick={() => { setSelectedType(null); setFilterOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                        !selectedType ? 'bg-[color:var(--accent)]/10 text-[color:var(--accent)]' : 'hover:bg-[color:var(--muted)]/10'
                      }`}
                    >
                      All Types
                    </button>
                    {['conference', 'hackathon', 'meetup', 'workshop', 'summit', 'webinar'].map((type) => (
                      <button
                        key={type}
                        onClick={() => { setSelectedType(type); setFilterOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm capitalize ${
                          selectedType === type ? 'bg-[color:var(--accent)]/10 text-[color:var(--accent)]' : 'hover:bg-[color:var(--muted)]/10'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Clear filters */}
            {selectedType && (
              <button
                onClick={() => setSelectedType(null)}
                className="text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading && events.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-[color:var(--accent)]" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-red-500 mb-2">Failed to load events</div>
            <div className="text-sm text-[color:var(--muted-foreground)]">{error}</div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="size-12 mx-auto mb-4 text-[color:var(--muted)]" />
            <h3 className="text-lg font-medium mb-2">No events found</h3>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {viewMode === 'discovered' 
                ? 'No discovered events match your criteria. Check back later!' 
                : 'No upcoming events. Be the first to create one!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-8">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-divider font-medium hover:bg-[color:var(--muted)]/10 transition-colors disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Load More
                      <ChevronDown className="size-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onEventCreated={() => {
            setShowCreateModal(false);
            allEvents.refetch();
          }}
        />
      )}
    </div>
  );
}

// Type guard functions
function isCombinedEvent(event: CombinedEvent | DiscoveredEvent): event is CombinedEvent {
  return 'source' in event;
}

function isDiscoveredEventType(event: CombinedEvent | DiscoveredEvent): event is DiscoveredEvent {
  return 'source' in event && event.source === 'discovered';
}

// Event Card Component
interface EventCardProps {
  event: CombinedEvent | DiscoveredEvent;
}

function EventCard({ event }: EventCardProps) {
  const isDiscovered = isDiscoveredEventType(event);
  const isUserSubmitted = isCombinedEvent(event) && event.source === 'user_submitted';

  // Format dates
  let dateDisplay: string;
  if (isUserSubmitted && event.start_datetime) {
    dateDisplay = new Date(event.start_datetime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } else if (isDiscovered && event.start_date) {
    dateDisplay = formatEventDates(
      event.start_date,
      event.end_date,
      event.start_time,
      event.end_time
    );
  } else {
    dateDisplay = 'Date TBD';
  }

  // Location display
  const locationDisplay = event.is_online 
    ? 'Online'
    : event.location_city 
      ? `${event.location_city}${event.location_country ? `, ${event.location_country}` : ''}`
      : 'Location TBD';

  // Event URL - use registration URL if available, otherwise use event URL
  // For discovered events: prefer registration_url, fallback to event_url
  // For user events: use registration_url if available
  const eventUrl = isDiscovered 
    ? (event.registration_url || event.event_url || event.source_url)
    : isUserSubmitted 
      ? (event.registration_url || event.event_url)
      : null;

  return (
    <div className="group p-6 rounded-2xl border border-divider bg-[color:var(--background)] hover:border-[color:var(--accent)]/30 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Date Badge */}
        <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-[color:var(--muted)]/10 flex flex-col items-center justify-center">
          <span className="text-xs font-medium text-[color:var(--muted-foreground)] uppercase">
            {isUserSubmitted && event.start_datetime
              ? new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'short' })
              : isDiscovered && event.start_date
                ? new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' })
                : 'TBD'}
          </span>
          <span className="text-2xl font-bold">
            {isUserSubmitted && event.start_datetime
              ? new Date(event.start_datetime).getDate()
              : isDiscovered && event.start_date
                ? new Date(event.start_date).getDate()
                : '?'}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 className="text-lg font-semibold group-hover:text-[color:var(--accent)] transition-colors">
                {event.name}
              </h3>
              {isDiscovered && event.organizer && (
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Organized by {event.organizer}
                </p>
              )}
            </div>
            {isDiscovered && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[color:var(--accent)]/10 text-[color:var(--accent)] text-xs font-medium">
                <Sparkles className="size-3" />
                Discovered
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-[color:var(--muted-foreground)] mb-3">
            <div className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {dateDisplay}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {locationDisplay}
              {event.is_hybrid && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-[color:var(--muted)]/20">
                  Hybrid
                </span>
              )}
            </div>
            {isDiscovered && event.event_type && (
              <div className="flex items-center gap-1.5">
                <Tag className="size-4" />
                <span className="capitalize">{event.event_type}</span>
              </div>
            )}
            {isDiscovered && event.cost && event.cost !== 'unknown' && (
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  event.cost === 'free' ? 'bg-green-500' : 'bg-amber-500'
                }`} />
                {getCostLabel(event.cost)}
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-[color:var(--muted-foreground)] line-clamp-2 mb-4">
              {event.description}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3">
            {/* Single View Event button - works for all event types */}
            {eventUrl && (
              <a
                href={eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:brightness-110 transition-all"
              >
                View Event
                <ExternalLink className="size-3.5" />
              </a>
            )}
            {/* Show source badge for discovered events without a direct URL */}
            {isDiscovered && !eventUrl && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[color:var(--muted)]/10 text-sm text-[color:var(--muted-foreground)]">
                <Sparkles className="size-3.5" />
                Discovered from {event.source_type === 'eventseye' ? 'EventsEye' : 'Web'}
              </span>
            )}
            {isDiscovered && event.relevance_score && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
                <div className={`w-2 h-2 rounded-full ${
                  event.relevance_score >= 90 ? 'bg-green-500' :
                  event.relevance_score >= 70 ? 'bg-blue-500' :
                  'bg-yellow-500'
                }`} />
                {getRelevanceLabel(event.relevance_score)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component
export default function EventsPage() {
  return (
    <Suspense fallback={<EventsLoading />}>
      <EventsContent />
    </Suspense>
  );
}
