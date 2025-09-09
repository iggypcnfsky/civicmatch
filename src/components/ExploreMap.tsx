"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { UserRound } from "lucide-react";
import Image from "next/image";
import { loadGoogleMaps } from "@/lib/google/maps-loader";
// Note: Using CSS media queries for dark mode instead of next-themes

interface ProfileWithLocation {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  tags?: string[];
  location: {
    coordinates?: { lat: number; lng: number; accuracy: string };
    displayName?: string;
    placeId?: string;
    source?: 'places_autocomplete' | 'geocoded' | 'manual';
    geocodedAt?: string;
    raw: string | object; // original location data (legacy)
    needsUpdate?: boolean; // true for legacy string locations
  };
}

interface ExploreMapProps {
  profiles: ProfileWithLocation[];
  invitedIds: Set<string>;
  onProfileClick?: (profile: ProfileWithLocation) => void;
  className?: string;
}

export default function ExploreMap({ 
  profiles, 
  invitedIds, 
  onProfileClick,
  className = "" 
}: ExploreMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(3); // Track current zoom level
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [hoveredProfile, setHoveredProfile] = useState<ProfileWithLocation | null>(null);
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
      });

      // Listen for zoom changes to update marker offsets (with debouncing)
      google.maps.event.addListener(mapInstance, 'zoom_changed', () => {
        const newZoom = mapInstance.getZoom() || 3;
        console.log('Zoom changed to:', newZoom);
        
        // Clear existing timeout
        if (zoomTimeoutRef.current) {
          clearTimeout(zoomTimeoutRef.current);
        }
        
        // Debounce zoom changes to avoid excessive marker recreation
        zoomTimeoutRef.current = setTimeout(() => {
          setCurrentZoom(newZoom);
          console.log('Zoom debounced, updating markers at zoom:', newZoom);
        }, 300); // 300ms debounce
      });
      
      setMap(mapInstance);
    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to initialize map.');
    }
  }, [isLoaded, map]);



  // Create pill content as HTML element (avatar only)
  const createPillContent = useCallback((profile: ProfileWithLocation) => {
    const pillDiv = document.createElement('div');
    pillDiv.className = `
      inline-flex items-center justify-center rounded-full 
      transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl
      ${invitedIds.has(profile.id) ? 'opacity-50' : ''}
      ${profile.location.needsUpdate ? 'border-dashed border-2 p-1' : ''}
    `;
    
    // Start with invisible for fade-in animation
    pillDiv.style.opacity = '0';
    pillDiv.style.transform = 'scale(0.8)';
    
    // Apply styles directly with hex colors
    pillDiv.style.boxShadow = '0 10px 25px -3px rgba(0, 0, 0, 0.46), 0 4px 6px -2px rgba(0, 0, 0, 0.23)'; // 15% stronger shadow
    
    // Special styling for profiles that need location updates
    if (profile.location.needsUpdate) {
      pillDiv.style.backgroundColor = '#6B7280'; // Gray background for visibility
      pillDiv.style.borderColor = '#9CA3AF'; // Light gray dashed border
      pillDiv.style.opacity = '0.5'; // 50% opacity as requested
    }

    // Avatar only
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

    // Add hover event listeners
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
  }, [invitedIds]);

  // Utility function to handle overlapping markers
  const resolveOverlappingCoordinates = useCallback((profiles: ProfileWithLocation[]) => {
    const coordinateGroups = new Map<string, ProfileWithLocation[]>();
    
    // Calculate zoom-aware offset distance
    // Lower zoom (zoomed out) = larger offset (need more separation to be visible)
    // Higher zoom (zoomed in) = smaller offset (less separation needed)
    const baseOffset = 0.03; // Increased by 300% (was 0.001, now 0.003)
    const zoomFactor = Math.pow(2, 10 - currentZoom); // Inverted: larger when zoom is smaller
    const OFFSET_DISTANCE = Math.max(0.03, Math.min(1, baseOffset * zoomFactor));
    
    console.log(`Zoom level: ${currentZoom}, Offset distance: ${OFFSET_DISTANCE} (~${Math.round(OFFSET_DISTANCE * 111000)}m)`);
    
    // Group profiles by identical coordinates
    profiles.forEach(profile => {
      let coordinates = profile.location.coordinates;
      let needsUpdate = false;
      
      // If no coordinates, place randomly on map with dashed border
      if (!coordinates) {
        const lat = (Math.random() - 0.5) * 140; // -70 to 70 latitude
        const lng = (Math.random() - 0.5) * 360; // -180 to 180 longitude
        coordinates = { lat, lng, accuracy: 'random' };
        needsUpdate = true;
      }
      
      // Update the profile's needsUpdate flag
      profile.location.needsUpdate = needsUpdate;
      
      if (coordinates) {
        const key = `${coordinates.lat.toFixed(4)},${coordinates.lng.toFixed(4)}`; // Less precision to catch more overlaps
        if (!coordinateGroups.has(key)) {
          coordinateGroups.set(key, []);
        }
        coordinateGroups.get(key)!.push({ 
          ...profile, 
          location: { ...profile.location, coordinates } 
        });
      }
    });
    
    console.log('Coordinate groups found:', coordinateGroups.size);
    coordinateGroups.forEach((group, key) => {
      if (group.length > 1) {
        console.log(`Location ${key} has ${group.length} users:`, group.map(p => p.name));
      }
    });
    
    // Apply small circular offsets to overlapping markers
    const resolvedProfiles: (ProfileWithLocation & { resolvedCoordinates: { lat: number; lng: number } })[] = [];
    
    coordinateGroups.forEach((groupProfiles, key) => {
      if (groupProfiles.length === 1) {
        // Single marker - no offset needed
        const profile = groupProfiles[0];
        resolvedProfiles.push({
          ...profile,
          resolvedCoordinates: profile.location.coordinates!
        });
      } else {
        // Multiple markers - apply circular offsets
        console.log(`Applying offsets for ${groupProfiles.length} users at ${key}`);
        groupProfiles.forEach((profile, index) => {
          const baseCoords = profile.location.coordinates!;
          
          if (index === 0) {
            // First marker stays at original position
            resolvedProfiles.push({
              ...profile,
              resolvedCoordinates: baseCoords
            });
            console.log(`${profile.name}: Original position (${baseCoords.lat}, ${baseCoords.lng})`);
          } else {
            // Subsequent markers get small circular offsets
            const angle = (2 * Math.PI * index) / groupProfiles.length;
            const offsetLat = baseCoords.lat + (OFFSET_DISTANCE * Math.sin(angle));
            const offsetLng = baseCoords.lng + (OFFSET_DISTANCE * Math.cos(angle));
            
            resolvedProfiles.push({
              ...profile,
              resolvedCoordinates: { lat: offsetLat, lng: offsetLng }
            });
            console.log(`${profile.name}: Offset position (${offsetLat}, ${offsetLng}) - angle: ${angle}`);
          }
        });
      }
    });
    
    return resolvedProfiles;
  }, [currentZoom]);

  // Add user markers using AdvancedMarkerElement
  useEffect(() => {
    if (!map || !isLoaded) return;

    const addMarkers = async () => {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.map = null);
      markersRef.current = [];

      console.log('Adding markers for', profiles.length, 'profiles');

      // Import the marker library
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      console.log('AdvancedMarkerElement imported successfully');
      
      // Resolve overlapping coordinates
      const resolvedProfiles = resolveOverlappingCoordinates(profiles);
      
      // Get map center for distance-based animation ordering
      const mapCenter = map.getCenter();
      const centerLat = mapCenter?.lat() || 0;
      const centerLng = mapCenter?.lng() || 0;
      
      // Sort profiles by distance from map center (closest first)
      const sortedProfiles = resolvedProfiles.sort((a, b) => {
        const distanceA = Math.sqrt(
          Math.pow(a.resolvedCoordinates.lat - centerLat, 2) + 
          Math.pow(a.resolvedCoordinates.lng - centerLng, 2)
        );
        const distanceB = Math.sqrt(
          Math.pow(b.resolvedCoordinates.lat - centerLat, 2) + 
          Math.pow(b.resolvedCoordinates.lng - centerLng, 2)
        );
        return distanceA - distanceB;
      });
      
      console.log(`Animating ${sortedProfiles.length} markers from center (${centerLat.toFixed(4)}, ${centerLng.toFixed(4)})`);
      
      // Process each profile with resolved coordinates
      let markerIndex = 0;
      for (const profile of sortedProfiles) {
        const coordinates = profile.resolvedCoordinates;

        if (coordinates) {
          try {
            const content = createPillContent(profile);
            console.log('Creating marker for', profile.name, 'at', coordinates);
            
            const marker = new AdvancedMarkerElement({
              map,
              position: { lat: coordinates.lat, lng: coordinates.lng },
              content,
              title: profile.name,
            });

            // Add click handler
            marker.addListener('click', () => {
              if (onProfileClick) {
                onProfileClick(profile);
              } else {
                window.location.href = `/profiles?user=${encodeURIComponent(profile.id)}`;
              }
            });

            markersRef.current.push(marker);
            
            // Animate pill in with center-based delay (faster for center users)
            // Users closer to center animate faster, creating a ripple effect
            const delay = markerIndex * 30; // Reduced to 30ms for faster animation
            setTimeout(() => {
              if (marker.content instanceof HTMLElement) {
                marker.content.style.opacity = '1';
                marker.content.style.transform = 'scale(1)';
              }
            }, delay);
            
            console.log('Marker created successfully for', profile.name);
          } catch (markerError) {
            console.error('Failed to create marker for', profile.name, markerError);
          }
        }
        markerIndex++;
      }
    };

    addMarkers();

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => marker.map = null);
      markersRef.current = [];
      
      // Clear any pending zoom timeout
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
        zoomTimeoutRef.current = null;
      }
    };
  }, [map, profiles, isLoaded, createPillContent, onProfileClick, resolveOverlappingCoordinates, currentZoom]);

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
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapRef} className="w-full h-full" />
      
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
            {/* Bigger Profile Picture */}
            <div className="flex flex-col items-center text-center mb-3">
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
              <div className="text-xs opacity-80 leading-relaxed">
                {hoveredProfile.bio.length > 150 
                  ? hoveredProfile.bio.substring(0, 150) + '...' 
                  : hoveredProfile.bio
                }
              </div>
            )}
            
            {/* Location status indicator */}
            {hoveredProfile.location.needsUpdate && (
              <div className="mt-2 text-xs text-amber-500 flex items-center justify-center gap-1">
                <span className="w-2 h-2 border border-dashed border-amber-500 rounded-full"></span>
                Needs location update
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
