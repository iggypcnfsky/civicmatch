"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { UserRound, MapPin, Users, Calendar, Video } from "lucide-react";
import Image from "next/image";
import { loadGoogleMaps } from "@/lib/google/maps-loader";
import type { ProfileWithLocation } from "@/types/profile";
import type { ProjectForMap } from "@/types/project";
import type { EventForMap } from "@/types/event";
import type { ChallengeForMap } from "@/types/challenge";
import { formatEventDate } from "@/types/event";
import { createChallengeMarkerContent } from "./challenge/ChallengeMarker";
import { getCategoryInfo, getSeverityColor, getSeverityLabel } from "@/types/challenge";
// Note: Using CSS media queries for dark mode instead of next-themes



interface ExploreMapProps {
  profiles: ProfileWithLocation[];
  projects?: ProjectForMap[];
  events?: EventForMap[];
  challenges?: ChallengeForMap[];
  invitedIds: Set<string>;
  onProfileClick?: (profile: ProfileWithLocation) => void;
  onProjectClick?: (project: ProjectForMap) => void;
  onEventClick?: (event: { id: string; title: string; location: { coordinates: { lat: number; lng: number }; displayName?: string }; startDateTime: string; endDateTime?: string; isOnline: boolean; rsvpCount: number; creatorId: string }) => void;
  onChallengeClick?: (challenge: ChallengeForMap) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  centerOn?: { lat: number; lng: number } | null;
  className?: string;
}

export default function ExploreMap({ 
  profiles, 
  projects = [],
  events = [],
  challenges = [],
  invitedIds, 
  onProfileClick,
  onProjectClick,
  onEventClick,
  onChallengeClick,
  onBoundsChange,
  centerOn,
  className = "" 
}: ExploreMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentZoomRef = useRef<number>(3);
  // ID-keyed marker maps for diffing (add new, remove stale, keep existing)
  const profileMarkerMapRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const projectMarkerMapRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const eventMarkerMapRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const challengeMarkerMapRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  // Track whether the initial staggered animation has played per layer
  const profilesRenderedRef = useRef(false);
  const projectsRenderedRef = useRef(false);
  const eventsRenderedRef = useRef(false);
  const challengesRenderedRef = useRef(false);
  const onBoundsChangeRef = useRef(onBoundsChange);
  
  // Keep callback refs up to date (avoids including callbacks in effect deps)
  useEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);
  const onProfileClickRef = useRef(onProfileClick);
  const onProjectClickRef = useRef(onProjectClick);
  const onEventClickRef = useRef(onEventClick);
  const onChallengeClickRef = useRef(onChallengeClick);
  useEffect(() => { onProfileClickRef.current = onProfileClick; }, [onProfileClick]);
  useEffect(() => { onProjectClickRef.current = onProjectClick; }, [onProjectClick]);
  useEffect(() => { onEventClickRef.current = onEventClick; }, [onEventClick]);
  useEffect(() => { onChallengeClickRef.current = onChallengeClick; }, [onChallengeClick]);
  const [hoveredProfile, setHoveredProfile] = useState<ProfileWithLocation | null>(null);
  const [hoveredProject, setHoveredProject] = useState<ProjectForMap | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<EventForMap | null>(null);
  const [hoveredChallenge, setHoveredChallenge] = useState<ChallengeForMap | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);


  // Load Google Maps
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        setIsLoaded(true);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
        setError('Failed to load map. Please check your internet connection.');
      });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    try {
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
      console.log('Initializing map with Map ID:', mapId);
      
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: 20, lng: 0 }, // Global center
        zoom: 3, // Slightly more zoomed in for better initial view
        mapId: mapId,
        mapTypeId: 'roadmap',
        // Remove inline styles since we're using cloud-based styling
        restriction: {
          latLngBounds: {
            north: 85,
            south: -85,
            west: -180,
            east: 180,
          },
        },
        // Disable all default UI controls
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        // Allow keyboard shortcuts for accessibility
        keyboardShortcuts: true,
      });

      console.log('Map instance created successfully');
      
      // Add map event listeners for debugging
      google.maps.event.addListener(mapInstance, 'tilesloaded', () => {
        console.log('Map tiles loaded successfully');
      });
      
      google.maps.event.addListener(mapInstance, 'idle', () => {
        console.log('Map is idle and ready');
        
        // Report bounds to parent
        if (onBoundsChangeRef.current) {
          const bounds = mapInstance.getBounds();
          if (bounds) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            onBoundsChangeRef.current({
              north: ne.lat(),
              south: sw.lat(),
              east: ne.lng(),
              west: sw.lng(),
            });
          }
        }
      });

      // Track zoom level in ref (no state update = no marker re-creation on zoom)
      google.maps.event.addListener(mapInstance, 'zoom_changed', () => {
        currentZoomRef.current = mapInstance.getZoom() || 3;
      });
      
      setMap(mapInstance);
    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to initialize map.');
    }
  }, [isLoaded, map]);

  // Center map on specific location when centerOn prop changes with smooth animation
  useEffect(() => {
    if (!map || !centerOn) return;
    
    // Smooth pan to location
    map.panTo({ lat: centerOn.lat, lng: centerOn.lng });
    
    // Smooth zoom to a reasonable level if currently zoomed out too far
    const currentZoom = map.getZoom() || 3;
    if (currentZoom < 8) {
      // Use setZoom with a delay after pan starts for smooth transition
      // Longer delay (800ms) for a more gradual, visible animation
      // Wider zoom (9) to show more context around the entity
      setTimeout(() => {
        map.setZoom(9);
      }, 800);
    }
  }, [map, centerOn]);


  // Create pill content as HTML element (avatar only)
  const createPillContent = useCallback((profile: ProfileWithLocation) => {
    const pillDiv = document.createElement('div');
    
    pillDiv.className = `
      inline-flex items-center justify-center rounded-full 
      transition-all duration-300 hover:scale-105 hover:shadow-2xl
      cursor-pointer
    `;
    
    // Note: We don't disable pointer events here anymore - we handle clicks in the event listener instead
    
    // Start with invisible for fade-in animation
    pillDiv.style.opacity = '0';
    pillDiv.style.transform = 'scale(0.8)';
    
    // Apply styles directly with hex colors
    pillDiv.style.boxShadow = '0 10px 25px -3px rgba(0, 0, 0, 0.46), 0 4px 6px -2px rgba(0, 0, 0, 0.23)'; // 15% stronger shadow
    
    // Note: Don't set opacity here - let the animation handle it for staggered effect

    // Avatar only (no outline)
    const avatarSpan = document.createElement('span');
    avatarSpan.className = 'relative inline-flex';
    
    if (profile.avatarUrl) {
      const img = document.createElement('img');
      img.src = profile.avatarUrl;
      img.alt = profile.name;
      img.className = 'h-12 w-12 rounded-full object-cover';
      avatarSpan.appendChild(img);
    } else {
      // Use initials on dark background
      avatarSpan.className += ' h-12 w-12 rounded-full inline-flex items-center justify-center';
      avatarSpan.style.backgroundColor = '#252422'; // Dark background
      avatarSpan.style.color = '#FFFCF2'; // Light text
      avatarSpan.style.fontSize = '14px';
      avatarSpan.style.fontWeight = '600';
      
      // Get initials from name
      const initials = profile.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
      
      avatarSpan.textContent = initials || '?';
    }

    // Add hover event listeners (for all profiles to show information)
    pillDiv.addEventListener('mouseenter', () => {
      const rect = pillDiv.getBoundingClientRect();
      setHoverPosition({ 
        x: rect.left + rect.width / 2, 
        y: rect.top 
      });
      setHoveredProfile(profile);
    });

    pillDiv.addEventListener('mouseleave', () => {
      setHoveredProfile(null);
      setHoverPosition(null);
    });

    pillDiv.appendChild(avatarSpan);

    return pillDiv;
  }, []);

  // Create project marker content (circular with users-round icon)
  const createProjectMarkerContent = useCallback((project: ProjectForMap) => {
    const container = document.createElement('div');
    container.className = 'relative cursor-pointer';
    
    // Main marker circle - dark green background, no outline
    const projectDiv = document.createElement('div');
    projectDiv.className = `
      inline-flex items-center justify-center rounded-full 
      transition-all duration-300 hover:scale-110
    `;
    const size = 44;
    projectDiv.style.width = `${size}px`;
    projectDiv.style.height = `${size}px`;
    projectDiv.style.backgroundColor = '#16a34a'; // Darker green (green-600)
    projectDiv.style.opacity = '0';
    projectDiv.style.transform = 'scale(0.8)';
    projectDiv.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.4)';
    
    // Users-round icon (Lucide) - smaller, dark icon
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', '#1f2937');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    
    // Users-round paths
    const path1 = document.createElementNS(svgNS, 'path');
    path1.setAttribute('d', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2');
    svg.appendChild(path1);
    
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '9');
    circle.setAttribute('cy', '7');
    circle.setAttribute('r', '4');
    svg.appendChild(circle);
    
    const path2 = document.createElementNS(svgNS, 'path');
    path2.setAttribute('d', 'M22 21v-2a4 4 0 0 0-3-3.87');
    svg.appendChild(path2);
    
    const path3 = document.createElementNS(svgNS, 'path');
    path3.setAttribute('d', 'M16 3.13a4 4 0 0 1 0 7.75');
    svg.appendChild(path3);
    
    projectDiv.appendChild(svg);
    
    // Hover events
    container.addEventListener('mouseenter', () => {
      const rect = container.getBoundingClientRect();
      setHoverPosition({ 
        x: rect.left + rect.width / 2, 
        y: rect.top 
      });
      setHoveredProject(project);
      setHoveredProfile(null);
    });
    
    container.addEventListener('mouseleave', () => {
      setHoveredProject(null);
      setHoverPosition(null);
    });
    
    container.appendChild(projectDiv);
    
    return { container, projectDiv };
  }, []);

  // Create event marker content (circular with calendar icon)
  const createEventMarkerContent = useCallback((event: EventForMap) => {
    const container = document.createElement('div');
    container.className = 'relative cursor-pointer';
    
    // Main marker circle - darker blue background, no outline
    const eventDiv = document.createElement('div');
    eventDiv.className = `
      inline-flex items-center justify-center rounded-full 
      transition-all duration-300 hover:scale-110
    `;
    const size = 44;
    eventDiv.style.width = `${size}px`;
    eventDiv.style.height = `${size}px`;
    eventDiv.style.backgroundColor = '#2563eb'; // Darker blue (blue-600)
    eventDiv.style.opacity = '0';
    eventDiv.style.transform = 'scale(0.8)';
    eventDiv.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.4)';
    
    // Calendar icon (Lucide) - smaller, dark icon
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', '#1f2937');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    
    // Calendar paths
    const path1 = document.createElementNS(svgNS, 'path');
    path1.setAttribute('d', 'M8 2v4');
    svg.appendChild(path1);
    
    const path2 = document.createElementNS(svgNS, 'path');
    path2.setAttribute('d', 'M16 2v4');
    svg.appendChild(path2);
    
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('width', '18');
    rect.setAttribute('height', '18');
    rect.setAttribute('x', '3');
    rect.setAttribute('y', '4');
    rect.setAttribute('rx', '2');
    svg.appendChild(rect);
    
    const path3 = document.createElementNS(svgNS, 'path');
    path3.setAttribute('d', 'M3 10h18');
    svg.appendChild(path3);
    
    eventDiv.appendChild(svg);
    
    // Hover events
    container.addEventListener('mouseenter', () => {
      const rect = container.getBoundingClientRect();
      setHoverPosition({ 
        x: rect.left + rect.width / 2, 
        y: rect.top 
      });
      setHoveredEvent(event);
      setHoveredProfile(null);
      setHoveredProject(null);
    });
    
    container.addEventListener('mouseleave', () => {
      setHoveredEvent(null);
      setHoverPosition(null);
    });
    
    container.appendChild(eventDiv);
    
    return { container, eventDiv };
  }, []);

  // Resolve overlapping coordinates within a set of items (reads zoom from ref, stable callback)
  const resolveOverlaps = useCallback((
    items: { id: string; lat: number; lng: number }[]
  ): Map<string, { lat: number; lng: number }> => {
    const resolved = new Map<string, { lat: number; lng: number }>();
    const groups = new Map<string, { id: string; lat: number; lng: number }[]>();
    const MAX_OFFSET = 0.002;
    const MIN_ZOOM = 8;
    const zoom = currentZoomRef.current;

    for (const item of items) {
      const key = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    for (const [, group] of groups) {
      if (group.length === 1) {
        resolved.set(group[0].id, { lat: group[0].lat, lng: group[0].lng });
      } else if (zoom < MIN_ZOOM) {
        for (const item of group) resolved.set(item.id, { lat: item.lat, lng: item.lng });
      } else {
        const base = group[0];
        const scale = Math.pow(2, 15 - zoom);
        const r = Math.min(MAX_OFFSET * scale, MAX_OFFSET);
        for (let i = 0; i < group.length; i++) {
          const a = (2 * Math.PI * i) / group.length;
          resolved.set(group[i].id, {
            lat: base.lat + r * Math.sin(a),
            lng: base.lng + r * Math.cos(a),
          });
        }
      }
    }

    return resolved;
  }, []);

  // --- Profile markers (diffed by ID) ---
  useEffect(() => {
    if (!map || !isLoaded) return;

    const markerMap = profileMarkerMapRef.current;
    const isInitial = !profilesRenderedRef.current;
    const currentIds = new Set(profiles.map(p => p.id));

    // Remove stale markers synchronously
    for (const [id, marker] of markerMap) {
      if (!currentIds.has(id)) { marker.map = null; markerMap.delete(id); }
    }

    // Find profiles that still need markers
    const newProfiles = profiles.filter(p => !markerMap.has(p.id));
    if (newProfiles.length === 0) {
      if (profiles.length > 0) profilesRenderedRef.current = true;
      return;
    }

    // Resolve intra-layer overlaps
    const coordItems = profiles
      .filter(p => p.location?.coordinates)
      .map(p => ({ id: p.id, lat: p.location.coordinates!.lat, lng: p.location.coordinates!.lng }));
    const resolved = resolveOverlaps(coordItems);

    let cancelled = false;
    (async () => {
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      if (cancelled) return;

      // Sort by distance from center for staggered ripple animation on first render
      const center = map.getCenter();
      const cLat = center?.lat() || 0;
      const cLng = center?.lng() || 0;
      const sorted = isInitial
        ? [...newProfiles].sort((a, b) => {
            const ca = resolved.get(a.id) || a.location.coordinates;
            const cb = resolved.get(b.id) || b.location.coordinates;
            if (!ca || !cb) return 0;
            return Math.hypot(ca.lat - cLat, ca.lng - cLng) - Math.hypot(cb.lat - cLat, cb.lng - cLng);
          })
        : newProfiles;

      let idx = 0;
      for (const profile of sorted) {
        if (cancelled) return;
        const coords = resolved.get(profile.id) || profile.location.coordinates;
        if (!coords) continue;
        try {
          const content = createPillContent(profile);
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: coords.lat, lng: coords.lng },
            content,
            title: profile.name,
          });
          marker.addListener('click', () => {
            if (onProfileClickRef.current) onProfileClickRef.current(profile);
          });
          markerMap.set(profile.id, marker);

          // Staggered fade-in on initial load, instant on subsequent diffs
          if (isInitial) {
            setTimeout(() => {
              if (marker.content instanceof HTMLElement) {
                marker.content.style.opacity = '1';
                marker.content.style.transform = 'scale(1)';
              }
            }, idx * 30);
          } else if (content instanceof HTMLElement) {
            content.style.opacity = '1';
            content.style.transform = 'scale(1)';
          }
          idx++;
        } catch (err) {
          console.error('Failed to create profile marker:', err);
        }
      }
      profilesRenderedRef.current = true;
    })();

    return () => { cancelled = true; };
  }, [map, profiles, isLoaded, createPillContent, resolveOverlaps]);

  // --- Project markers (diffed by ID) ---
  useEffect(() => {
    if (!map || !isLoaded) return;

    const markerMap = projectMarkerMapRef.current;
    const isInitial = !projectsRenderedRef.current;
    const currentIds = new Set(projects.map(p => p.id));

    for (const [id, marker] of markerMap) {
      if (!currentIds.has(id)) { marker.map = null; markerMap.delete(id); }
    }

    const newProjects = projects.filter(p => !markerMap.has(p.id));
    if (newProjects.length === 0) {
      if (projects.length > 0) projectsRenderedRef.current = true;
      return;
    }

    const coordItems = projects
      .filter(p => p.location?.coordinates)
      .map(p => ({ id: p.id, lat: p.location.coordinates.lat, lng: p.location.coordinates.lng }));
    const resolved = resolveOverlaps(coordItems);

    let cancelled = false;
    (async () => {
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      if (cancelled) return;

      let idx = 0;
      for (const project of newProjects) {
        if (cancelled) return;
        const coords = resolved.get(project.id) || project.location?.coordinates;
        if (!coords) continue;
        try {
          const { container, projectDiv } = createProjectMarkerContent(project);
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: coords.lat, lng: coords.lng },
            content: container,
            title: project.name,
            zIndex: 1000,
          });
          marker.addListener('click', () => {
            if (onProjectClickRef.current) onProjectClickRef.current(project);
          });
          markerMap.set(project.id, marker);

          if (isInitial) {
            setTimeout(() => { projectDiv.style.opacity = '1'; projectDiv.style.transform = 'scale(1)'; }, idx * 100 + 200);
          } else {
            projectDiv.style.opacity = '1';
            projectDiv.style.transform = 'scale(1)';
          }
          idx++;
        } catch (err) {
          console.error('Failed to create project marker:', err);
        }
      }
      projectsRenderedRef.current = true;
    })();

    return () => { cancelled = true; };
  }, [map, projects, isLoaded, createProjectMarkerContent, resolveOverlaps]);

  // --- Event markers (diffed by ID) ---
  useEffect(() => {
    if (!map || !isLoaded) return;

    const markerMap = eventMarkerMapRef.current;
    const isInitial = !eventsRenderedRef.current;
    const currentIds = new Set(events.map(e => e.id));

    for (const [id, marker] of markerMap) {
      if (!currentIds.has(id)) { marker.map = null; markerMap.delete(id); }
    }

    const newEvents = events.filter(e => !markerMap.has(e.id));
    if (newEvents.length === 0) {
      if (events.length > 0) eventsRenderedRef.current = true;
      return;
    }

    const coordItems = events
      .filter(e => e.location?.coordinates)
      .map(e => ({ id: e.id, lat: e.location.coordinates.lat, lng: e.location.coordinates.lng }));
    const resolved = resolveOverlaps(coordItems);

    let cancelled = false;
    (async () => {
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      if (cancelled) return;

      let idx = 0;
      for (const event of newEvents) {
        if (cancelled) return;
        const coords = resolved.get(event.id) || event.location?.coordinates;
        if (!coords) continue;
        try {
          const { container, eventDiv } = createEventMarkerContent(event);
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: coords.lat, lng: coords.lng },
            content: container,
            title: event.title,
            zIndex: 900,
          });
          marker.addListener('click', () => {
            if (onEventClickRef.current) onEventClickRef.current(event);
          });
          markerMap.set(event.id, marker);

          if (isInitial) {
            setTimeout(() => { eventDiv.style.opacity = '1'; eventDiv.style.transform = 'scale(1)'; }, idx * 80 + 300);
          } else {
            eventDiv.style.opacity = '1';
            eventDiv.style.transform = 'scale(1)';
          }
          idx++;
        } catch (err) {
          console.error('Failed to create event marker:', err);
        }
      }
      eventsRenderedRef.current = true;
    })();

    return () => { cancelled = true; };
  }, [map, events, isLoaded, createEventMarkerContent, resolveOverlaps]);

  // --- Challenge markers (diffed by ID) ---
  useEffect(() => {
    if (!map || !isLoaded) return;

    const markerMap = challengeMarkerMapRef.current;
    const isInitial = !challengesRenderedRef.current;
    const currentIds = new Set(challenges.map(c => c.id));

    for (const [id, marker] of markerMap) {
      if (!currentIds.has(id)) { marker.map = null; markerMap.delete(id); }
    }

    const newChallenges = challenges.filter(c => !markerMap.has(c.id));
    if (newChallenges.length === 0) {
      if (challenges.length > 0) challengesRenderedRef.current = true;
      return;
    }

    let cancelled = false;
    (async () => {
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      if (cancelled) return;

      let idx = 0;
      for (const challenge of newChallenges) {
        if (cancelled) return;
        const coords = { lat: challenge.latitude, lng: challenge.longitude };
        try {
          const { container, markerDiv } = createChallengeMarkerContent(
            challenge,
            (hovered) => {
              if (hovered) {
                const rect = container.getBoundingClientRect();
                setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
                setHoveredChallenge(hovered);
                setHoveredProfile(null);
                setHoveredProject(null);
                setHoveredEvent(null);
              } else {
                setHoveredChallenge(null);
                setHoverPosition(null);
              }
            }
          );
          const marker = new AdvancedMarkerElement({
            map,
            position: coords,
            content: container,
            title: challenge.title,
            zIndex: 1100,
          });
          marker.addListener('click', () => {
            if (onChallengeClickRef.current) onChallengeClickRef.current(challenge);
          });
          markerMap.set(challenge.id, marker);

          if (isInitial) {
            setTimeout(() => { markerDiv.style.opacity = '1'; markerDiv.style.transform = 'scale(1)'; }, idx * 60 + 400);
          } else {
            markerDiv.style.opacity = '1';
            markerDiv.style.transform = 'scale(1)';
          }
          idx++;
        } catch (err) {
          console.error('Failed to create challenge marker:', err);
        }
      }
      challengesRenderedRef.current = true;
    })();

    return () => { cancelled = true; };
  }, [map, challenges, isLoaded]);

  // Cleanup all markers on unmount
  useEffect(() => {
    return () => {
      for (const marker of profileMarkerMapRef.current.values()) marker.map = null;
      profileMarkerMapRef.current.clear();
      for (const marker of projectMarkerMapRef.current.values()) marker.map = null;
      projectMarkerMapRef.current.clear();
      for (const marker of eventMarkerMapRef.current.values()) marker.map = null;
      eventMarkerMapRef.current.clear();
      for (const marker of challengeMarkerMapRef.current.values()) marker.map = null;
      challengeMarkerMapRef.current.clear();
    };
  }, []);

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-500 mb-2">⚠️</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading world map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`} style={{ height: '100%' }}>
      <div ref={mapRef} className="w-full h-full" style={{ height: '100%' }} />
      
      {/* Profile Preview on Hover */}
      {hoveredProfile && hoverPosition && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y - 10,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          <div className="bg-[color:var(--background)] border border-divider rounded-2xl p-4 shadow-2xl max-w-xs animate-in fade-in duration-200">
            {/* Profile Picture and Name */}
            <div className="flex flex-col items-center text-center">
              {hoveredProfile.avatarUrl ? (
                <Image 
                  src={hoveredProfile.avatarUrl} 
                  alt={hoveredProfile.name} 
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover mb-2" 
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-[color:var(--muted)]/40 flex items-center justify-center mb-2">
                  <UserRound className="size-7 opacity-70" />
                </div>
              )}
              <div className="font-semibold text-sm">{hoveredProfile.name}</div>
            </div>
            
            {/* Bio */}
            {hoveredProfile.bio && (
              <div className="mt-3 text-xs opacity-80 leading-relaxed text-center">
                {hoveredProfile.bio.length > 150 
                  ? hoveredProfile.bio.substring(0, 150) + '...' 
                  : hoveredProfile.bio
                }
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Project Preview on Hover */}
      {hoveredProject && hoverPosition && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y - 10,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          <div className="bg-[color:var(--background)] border-2 border-[#EB5E28] rounded-2xl p-4 shadow-2xl max-w-xs animate-in fade-in duration-200">
            {/* Project Logo and Name */}
            <div className="flex items-center gap-3 mb-3">
              {hoveredProject.logoUrl ? (
                <Image 
                  src={hoveredProject.logoUrl} 
                  alt={hoveredProject.name} 
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover border-2 border-[#EB5E28]" 
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-[#252422] border-2 border-[#EB5E28] flex items-center justify-center">
                  <span className="text-[#FFFCF2] font-bold">
                    {hoveredProject.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="font-bold text-sm">{hoveredProject.name}</div>
                <div className="text-xs opacity-60 flex items-center gap-1">
                  <Users className="size-3" />
                  {hoveredProject.memberCount || 0} members
                </div>
              </div>
            </div>
            
            {/* Location */}
            {hoveredProject.location?.displayName && (
              <div className="text-xs opacity-70 flex items-center gap-1">
                <MapPin className="size-3" />
                {hoveredProject.location.displayName}
              </div>
            )}
            
            {/* Click hint */}
            <div className="mt-3 pt-2 border-t border-divider text-xs text-[#EB5E28] font-medium text-center">
              Click to view project
            </div>
          </div>
        </div>
      )}
      
      {/* Event Preview on Hover */}
      {hoveredEvent && hoverPosition && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y - 10,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          <div className="bg-[color:var(--background)] border-2 border-[color:var(--accent)] rounded-2xl p-4 shadow-2xl max-w-xs animate-in fade-in duration-200">
            {/* Event Title and Date */}
            <div className="mb-3">
              <div className="font-bold text-sm mb-1">{hoveredEvent.title}</div>
              <div className="text-xs opacity-70 flex items-center gap-1">
                <Calendar className="size-3" />
                {formatEventDate(hoveredEvent.startDateTime, hoveredEvent.endDateTime)}
              </div>
            </div>
            
            {/* Location / Online indicator */}
            <div className="flex items-center gap-2 text-xs">
              {hoveredEvent.isOnline ? (
                <div className="flex items-center gap-1 text-blue-500">
                  <Video className="size-3" />
                  <span>Online Event</span>
                </div>
              ) : hoveredEvent.location?.displayName ? (
                <div className="flex items-center gap-1 opacity-70">
                  <MapPin className="size-3" />
                  <span>{hoveredEvent.location.displayName}</span>
                </div>
              ) : null}
            </div>
            
            {/* RSVP count */}
            {hoveredEvent.rsvpCount > 0 && (
              <div className="mt-2 text-xs text-[color:var(--accent)] flex items-center gap-1">
                <Users className="size-3" />
                {hoveredEvent.rsvpCount} {hoveredEvent.rsvpCount === 1 ? 'person' : 'people'} going
              </div>
            )}
            
            {/* Click hint */}
            <div className="mt-3 pt-2 border-t border-divider text-xs text-[color:var(--accent)] font-medium text-center">
              Click to view event
            </div>
          </div>
        </div>
      )}
      
      {/* Challenge Preview on Hover */}
      {hoveredChallenge && hoverPosition && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y - 10,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          <div className="bg-[color:var(--background)] border-2 rounded-2xl p-4 shadow-2xl max-w-xs animate-in fade-in duration-200"
               style={{ borderColor: getCategoryInfo(hoveredChallenge.category).color }}
          >
            {/* Category Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${getCategoryInfo(hoveredChallenge.category).color}20`, 
                  color: getCategoryInfo(hoveredChallenge.category).color 
                }}
              >
                {getCategoryInfo(hoveredChallenge.category).label}
              </span>
              <span 
                className="text-xs font-medium"
                style={{ color: getSeverityColor(hoveredChallenge.severity) }}
              >
                {getSeverityLabel(hoveredChallenge.severity)}
              </span>
            </div>
            
            {/* Title */}
            <div className="font-bold text-sm mb-2">{hoveredChallenge.title}</div>
            
            {/* Summary */}
            <p className="text-xs opacity-80 leading-relaxed mb-2">
              {hoveredChallenge.summary.length > 120 
                ? hoveredChallenge.summary.substring(0, 120) + '...' 
                : hoveredChallenge.summary}
            </p>
            
            {/* Location */}
            <div className="flex items-center gap-1 text-xs opacity-60 mb-2">
              <MapPin className="w-3 h-3" />
              {hoveredChallenge.location_name}
            </div>
            
            {/* Skills */}
            {hoveredChallenge.skills_needed && hoveredChallenge.skills_needed.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {hoveredChallenge.skills_needed.slice(0, 3).map((skill, idx) => (
                  <span 
                    key={idx}
                    className="px-1.5 py-0.5 bg-[var(--muted)]/30 rounded text-[10px]"
                  >
                    {skill}
                  </span>
                ))}
                {hoveredChallenge.skills_needed.length > 3 && (
                  <span className="px-1.5 py-0.5 text-[10px] opacity-60">
                    +{hoveredChallenge.skills_needed.length - 3}
                  </span>
                )}
              </div>
            )}
            
            {/* Click hint */}
            <div className="mt-3 pt-2 border-t border-divider text-xs font-medium text-center"
                 style={{ color: getCategoryInfo(hoveredChallenge.category).color }}
            >
              Click to view challenge
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
