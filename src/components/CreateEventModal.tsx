"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, MapPin, Video, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import LocationAutocomplete, { LocationData } from "@/components/LocationAutocomplete";
import { loadGoogleMaps } from "@/lib/google/maps-loader";

interface CreateEventModalProps {
  onClose: () => void;
  onEventCreated: () => void;
}

export default function CreateEventModal({ onClose, onEventCreated }: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState<string | LocationData>("");
  const [isOnline, setIsOnline] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps API
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch(error => {
        console.warn('Failed to load Google Maps:', error);
        setMapsLoaded(false);
      });
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }
    if (!startTime) {
      setError("Start time is required");
      return;
    }
    if (!isOnline && !location) {
      setError("Location is required for in-person events");
      return;
    }
    if (isOnline && !meetingUrl.trim()) {
      setError("Meeting URL is required for online events");
      return;
    }

    // Build location data
    let locationData: { displayName: string; coordinates: { lat: number; lng: number }; placeId?: string };
    
    if (isOnline) {
      // For online events, we still need a location for the map
      // Use a default or the creator's location - for now, use a central location
      locationData = {
        displayName: "Online Event",
        coordinates: { lat: 0, lng: 0 }, // Won't be shown on map for online events or use a default
      };
    } else if (typeof location === "object" && location.coordinates) {
      locationData = {
        displayName: location.displayName,
        coordinates: location.coordinates,
        placeId: location.placeId,
      };
    } else {
      setError("Please select a valid location from the suggestions");
      return;
    }

    // Build datetime strings
    const startDateTime = new Date(`${date}T${startTime}`).toISOString();
    const endDateTime = endTime ? new Date(`${date}T${endTime}`).toISOString() : undefined;

    setIsSubmitting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setError("You must be logged in to create an event");
        return;
      }

      const eventData = {
        title: title.trim(),
        description: description.trim(),
        location: locationData,
        isOnline,
        meetingUrl: isOnline ? meetingUrl.trim() : undefined,
        startDateTime,
        endDateTime,
        imageUrl: imageUrl.trim() || undefined,
      };

      const { error: insertError } = await supabase
        .from("events")
        .insert({
          creator_id: session.session.user.id,
          data: eventData,
        });

      if (insertError) throw insertError;

      onEventCreated();
    } catch (err) {
      console.error("Error creating event:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[color:var(--background)] rounded-2xl border border-divider shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-divider bg-[color:var(--background)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[color:var(--accent)]/10 flex items-center justify-center">
              <Calendar className="size-5 text-[color:var(--accent)]" />
            </div>
            <h2 className="text-xl font-semibold">Create Event</h2>
          </div>
          <button
            className="h-8 w-8 rounded-full border border-divider flex items-center justify-center hover:bg-[color:var(--muted)]/20 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Community Hackathon"
              className="w-full h-10 rounded-xl border bg-transparent px-4 text-sm"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this event about?"
              className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm resize-none"
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Calendar className="size-3.5" /> Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-10 rounded-xl border bg-transparent px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Clock className="size-3.5" /> Start *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-10 rounded-xl border bg-transparent px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Clock className="size-3.5" /> End
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-10 rounded-xl border bg-transparent px-3 text-sm"
              />
            </div>
          </div>

          {/* Online/Offline Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-divider bg-[color:var(--muted)]/10">
            <div className="flex items-center gap-3">
              <Video className={`size-5 ${isOnline ? 'text-blue-500' : 'opacity-50'}`} />
              <div>
                <div className="text-sm font-medium">Online Event</div>
                <div className="text-xs text-[color:var(--muted-foreground)]">
                  {isOnline ? "Attendees will join virtually" : "Toggle to make this an online event"}
                </div>
              </div>
            </div>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isOnline ? 'bg-blue-500' : 'bg-[color:var(--muted)]/60'
              }`}
              onClick={() => setIsOnline(!isOnline)}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isOnline ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Location or Meeting URL */}
          {isOnline ? (
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Video className="size-3.5" /> Meeting URL *
              </label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="w-full h-10 rounded-xl border bg-transparent px-4 text-sm"
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <MapPin className="size-3.5" /> Location *
              </label>
              {mapsLoaded ? (
                <LocationAutocomplete
                  value={location}
                  onChange={setLocation}
                  placeholder="Search for a location"
                />
              ) : (
                <input
                  type="text"
                  value={typeof location === 'string' ? location : location?.displayName || ''}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter location"
                  className="w-full h-10 rounded-xl border bg-transparent px-4 text-sm"
                />
              )}
            </div>
          )}

          {/* Image URL (optional) */}
          <div>
            <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="size-3.5" /> Cover Image URL
              <span className="text-xs text-[color:var(--muted-foreground)] font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full h-10 rounded-xl border bg-transparent px-4 text-sm"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:brightness-110 transition-all disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
