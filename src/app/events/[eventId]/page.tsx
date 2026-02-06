"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Users, 
  ArrowLeft, 
  Check, 
  UserRound,
  ExternalLink,
  CalendarPlus,
  Share2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import type { Event, EventData, EventRSVP } from "@/types/event";
import { formatEventDate, isEventPast } from "@/types/event";
import type { DiscoveredEvent } from "@/types/discoveredEvent";
import { formatEventDates, getCostLabel, getRelevanceLabel } from "@/types/discoveredEvent";

interface AttendeeProfile {
  id: string;
  name: string;
  avatarUrl?: string;
}

// Unified event type that can be either user-submitted or discovered
type UnifiedEvent = 
  | { type: 'user'; data: Event }
  | { type: 'discovered'; data: DiscoveredEvent };

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";
  
  const [event, setEvent] = useState<Event | null>(null);
  const [creator, setCreator] = useState<AttendeeProfile | null>(null);
  const [attendees, setAttendees] = useState<AttendeeProfile[]>([]);
  const [userHasRsvpd, setUserHasRsvpd] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

  const fetchEvent = useCallback(async () => {
    try {
      // Get current user
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id || null;
      setCurrentUserId(userId);

      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      if (!eventData) throw new Error("Event not found");

      const data = eventData.data as EventData;
      const mappedEvent: Event = {
        id: eventData.id,
        creatorId: eventData.creator_id,
        title: data.title,
        description: data.description,
        location: data.location,
        isOnline: data.isOnline,
        meetingUrl: data.meetingUrl,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        imageUrl: data.imageUrl,
        createdAt: eventData.created_at,
        updatedAt: eventData.updated_at,
      };
      setEvent(mappedEvent);

      // Fetch creator profile
      const { data: creatorData } = await supabase
        .from("profiles")
        .select("user_id, username, data")
        .eq("user_id", eventData.creator_id)
        .single();

      if (creatorData) {
        const profileData = (creatorData.data || {}) as Record<string, unknown>;
        setCreator({
          id: creatorData.user_id,
          name: asString(profileData.displayName) || creatorData.username || "Member",
          avatarUrl: asString(profileData.avatarUrl),
        });
      }

      // Fetch RSVPs
      const { data: rsvps, error: rsvpError } = await supabase
        .from("event_rsvps")
        .select("user_id")
        .eq("event_id", eventId);

      if (!rsvpError && rsvps) {
        // Check if current user has RSVP'd
        if (userId) {
          setUserHasRsvpd(rsvps.some(r => r.user_id === userId));
        }

        // Fetch attendee profiles
        const userIds = rsvps.map(r => r.user_id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, username, data")
            .in("user_id", userIds);

          if (profiles) {
            const mappedAttendees: AttendeeProfile[] = profiles.map(p => {
              const d = (p.data || {}) as Record<string, unknown>;
              return {
                id: p.user_id,
                name: asString(d.displayName) || p.username || "Member",
                avatarUrl: asString(d.avatarUrl),
              };
            });
            setAttendees(mappedAttendees);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching event:", err);
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId, fetchEvent]);

  const handleRsvp = async () => {
    if (!isAuthenticated || !currentUserId || !event) return;

    setIsRsvpLoading(true);
    try {
      if (userHasRsvpd) {
        // Remove RSVP
        const { error } = await supabase
          .from("event_rsvps")
          .delete()
          .eq("event_id", event.id)
          .eq("user_id", currentUserId);

        if (error) throw error;
        setUserHasRsvpd(false);
        setAttendees(prev => prev.filter(a => a.id !== currentUserId));
      } else {
        // Add RSVP
        const { error } = await supabase
          .from("event_rsvps")
          .insert({
            event_id: event.id,
            user_id: currentUserId,
          });

        if (error) throw error;
        setUserHasRsvpd(true);
        
        // Fetch current user's profile for attendee list
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, username, data")
          .eq("user_id", currentUserId)
          .single();

        if (profile) {
          const d = (profile.data || {}) as Record<string, unknown>;
          setAttendees(prev => [...prev, {
            id: profile.user_id,
            name: asString(d.displayName) || profile.username || "Member",
            avatarUrl: asString(d.avatarUrl),
          }]);
        }
      }
    } catch (err) {
      console.error("Error updating RSVP:", err);
    } finally {
      setIsRsvpLoading(false);
    }
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    
    const startDate = new Date(event.startDateTime);
    const endDate = event.endDateTime ? new Date(event.endDateTime) : new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const formatDateForGCal = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const location = event.isOnline ? event.meetingUrl || 'Online' : event.location.displayName;
    
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDateForGCal(startDate)}/${formatDateForGCal(endDate)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(location || '')}`;
    
    window.open(gcalUrl, '_blank');
  };

  const handleShare = async () => {
    if (!event) return;
    
    const url = window.location.href;
    const text = `Check out this event: ${event.title}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text, url });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="size-8 animate-spin opacity-50" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Event not found</p>
          <p className="text-sm opacity-70 mb-4">{error}</p>
          <button
            onClick={() => router.push('/explore')}
            className="h-10 px-6 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const isPast = isEventPast(event.startDateTime);

  return (
    <div className="min-h-dvh page-container pb-28 lg:pb-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100 transition-opacity"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Event Header Card */}
          <div className="card">
            {/* Cover Image */}
            {event.imageUrl && (
              <div className="relative w-full h-48 -mt-6 -mx-6 mb-6 rounded-t-2xl overflow-hidden">
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  className="object-cover"
                />
                {isPast && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">Past Event</span>
                  </div>
                )}
              </div>
            )}

            {/* Title and Status */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
                
                {/* Online/Offline Badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  {event.isOnline ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                      <Video className="size-3.5" />
                      Online Event
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
                      <MapPin className="size-3.5" />
                      In Person
                    </span>
                  )}
                  
                  {isPast && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium">
                      Past Event
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddToCalendar}
                  className="h-9 w-9 rounded-full border border-divider flex items-center justify-center hover:bg-[color:var(--muted)]/20 transition-colors"
                  title="Add to Calendar"
                >
                  <CalendarPlus className="size-4" />
                </button>
                <button
                  onClick={handleShare}
                  className="h-9 w-9 rounded-full border border-divider flex items-center justify-center hover:bg-[color:var(--muted)]/20 transition-colors"
                  title="Share Event"
                >
                  <Share2 className="size-4" />
                </button>
              </div>
            </div>

            {/* Date & Time */}
            <div className="mt-6 pt-6 border-t border-divider">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-10 w-10 rounded-xl bg-[color:var(--accent)]/10 flex items-center justify-center">
                  <Calendar className="size-5 text-[color:var(--accent)]" />
                </div>
                <div>
                  <div className="font-medium">{formatEventDate(event.startDateTime, event.endDateTime)}</div>
                  <div className="text-xs opacity-70">
                    {new Date(event.startDateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Location or Meeting Link */}
            <div className="mt-4">
              {event.isOnline ? (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Video className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Online Meeting</div>
                    {event.meetingUrl && (userHasRsvpd || currentUserId === event.creatorId) ? (
                      <a
                        href={event.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1 truncate"
                      >
                        {event.meetingUrl}
                        <ExternalLink className="size-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <div className="text-xs opacity-70">RSVP to see meeting link</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <MapPin className="size-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">{event.location.displayName}</div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.displayName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                    >
                      View on map
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Organizer */}
            {creator && (
              <div className="mt-6 pt-6 border-t border-divider">
                <div className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] mb-3">Organized by</div>
                <button
                  onClick={() => router.push(`/profiles/${creator.id}`)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  {creator.avatarUrl ? (
                    <Image
                      src={creator.avatarUrl}
                      alt={creator.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-[color:var(--muted)]/40 flex items-center justify-center">
                      <UserRound className="size-5 opacity-70" />
                    </div>
                  )}
                  <div className="text-left">
                    <div className="font-medium text-sm">{creator.name}</div>
                    <div className="text-xs opacity-70">Event Organizer</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Description Card */}
          <div className="card">
            <h2 className="font-semibold mb-4">About this event</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-20">
          {/* RSVP Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[color:var(--accent)]/10 flex items-center justify-center">
                <Users className="size-5 text-[color:var(--accent)]" />
              </div>
              <div>
                <div className="font-semibold">{attendees.length} {attendees.length === 1 ? 'person' : 'people'} going</div>
                <div className="text-xs opacity-70">
                  {isPast ? 'attended this event' : 'will attend this event'}
                </div>
              </div>
            </div>

            {/* RSVP Button */}
            {isAuthenticated && !isPast && (
              <button
                onClick={handleRsvp}
                disabled={isRsvpLoading}
                className={`h-12 w-full rounded-full font-medium transition-all flex items-center justify-center gap-2 ${
                  userHasRsvpd
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-2 border-green-500'
                    : 'bg-[color:var(--accent)] text-[color:var(--background)] hover:brightness-110'
                }`}
              >
                {isRsvpLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : userHasRsvpd ? (
                  <>
                    <Check className="size-4" />
                    You&apos;re going!
                  </>
                ) : (
                  "RSVP to this event"
                )}
              </button>
            )}

            {!isAuthenticated && !isPast && (
              <button
                onClick={() => router.push('/explore')}
                className="h-12 w-full rounded-full bg-[color:var(--muted)]/30 text-sm font-medium"
              >
                Sign in to RSVP
              </button>
            )}

            {userHasRsvpd && !isPast && (
              <button
                onClick={handleRsvp}
                disabled={isRsvpLoading}
                className="mt-2 text-xs text-center w-full opacity-70 hover:opacity-100 transition-opacity"
              >
                Cancel RSVP
              </button>
            )}
          </div>

          {/* Attendees List */}
          {attendees.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-4">Attendees</h3>
              <div className="space-y-3">
                {attendees.slice(0, 10).map((attendee) => (
                  <button
                    key={attendee.id}
                    onClick={() => router.push(`/profiles/${attendee.id}`)}
                    className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity"
                  >
                    {attendee.avatarUrl ? (
                      <Image
                        src={attendee.avatarUrl}
                        alt={attendee.name}
                        width={36}
                        height={36}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-[color:var(--muted)]/40 flex items-center justify-center">
                        <UserRound className="size-4 opacity-70" />
                      </div>
                    )}
                    <span className="text-sm font-medium truncate">{attendee.name}</span>
                  </button>
                ))}
                {attendees.length > 10 && (
                  <div className="text-xs text-center opacity-70 pt-2">
                    +{attendees.length - 10} more attendees
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
