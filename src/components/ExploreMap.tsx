"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { UserRound } from "lucide-react";
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

      setMap(mapInstance);
    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to initialize map.');
    }
  }, [isLoaded, map]);



  // Create pill content as HTML element
  const createPillContent = useCallback((profile: ProfileWithLocation) => {
    const pillDiv = document.createElement('div');
    pillDiv.className = `
      inline-flex items-center gap-2 rounded-full border 
      pr-3 pl-1.5 py-1.5
      transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl
      ${invitedIds.has(profile.id) ? 'opacity-50' : ''}
      ${profile.location.needsUpdate ? 'border-dashed border-2' : 'border-solid border'}
    `;
    
    // Start with invisible for fade-in animation
    pillDiv.style.opacity = '0';
    pillDiv.style.transform = 'scale(0.8)';
    
    // Apply styles directly with hex colors
    pillDiv.style.color = '#FFFCF2'; // Light text
    pillDiv.style.borderStyle = 'dashed';
    pillDiv.style.borderWidth = '2px';
    pillDiv.style.boxShadow = '0 10px 25px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'; // Enhanced shadow
    
    if (profile.location.needsUpdate) {
      pillDiv.style.backgroundColor = '#6B7280'; // Lighter gray background for no location
      pillDiv.style.borderColor = '#9CA3AF'; // Light gray border for dashed
    } else {
      pillDiv.style.backgroundColor = '#252422'; // Dark background for normal users
      pillDiv.style.borderColor = '#CCC5B9'; // Muted border for normal users
      pillDiv.style.borderStyle = 'solid';
      pillDiv.style.borderWidth = '1px';
    }

    // Avatar
    const avatarSpan = document.createElement('span');
    avatarSpan.className = 'relative inline-flex';
    
    if (profile.avatarUrl) {
      const img = document.createElement('img');
      img.src = profile.avatarUrl;
      img.alt = profile.name;
      img.className = 'h-7 w-7 rounded-full object-cover';
      avatarSpan.appendChild(img);
    } else {
      avatarSpan.className += ' h-7 w-7 rounded-full inline-flex items-center justify-center';
      avatarSpan.style.backgroundColor = '#CCC5B9'; // Muted color
      avatarSpan.style.opacity = '0.4';
      avatarSpan.innerHTML = `
        <svg class="size-3 opacity-70" fill="none" stroke="#FFFCF2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      `;
    }

    // Name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-xs font-medium whitespace-nowrap max-w-[80px] truncate';
    nameSpan.style.color = '#FFFCF2'; // Light text color
    nameSpan.textContent = profile.name;

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
    pillDiv.appendChild(nameSpan);

    return pillDiv;
  }, [invitedIds]);

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
      

      
      // Process each profile (coordinates should already be in database)
      let markerIndex = 0;
      for (const profile of profiles) {
        let coordinates = profile.location.coordinates;
        let needsUpdate = false;
        
        // If no coordinates, place randomly on map with dashed border
        if (!coordinates) {
          // Generate random coordinates within reasonable bounds
          const lat = (Math.random() - 0.5) * 140; // -70 to 70 latitude
          const lng = (Math.random() - 0.5) * 360; // -180 to 180 longitude
          coordinates = {
            lat,
            lng,
            accuracy: 'random'
          };
          needsUpdate = true; // Mark as needing location update
        }

        // Update the profile's needsUpdate flag
        profile.location.needsUpdate = needsUpdate;

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
            
            // Animate pill in with staggered delay
            const delay = markerIndex * 50; // 50ms delay between pills
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
    };
  }, [map, profiles, isLoaded, createPillContent, onProfileClick]);

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
                <img 
                  src={hoveredProfile.avatarUrl} 
                  alt={hoveredProfile.name} 
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
