"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, AlertCircle } from "lucide-react";

interface LocationData {
  displayName: string;
  coordinates: { lat: number; lng: number; accuracy: string };
  placeId: string;
  source: 'places_autocomplete';
  geocodedAt: string;
}

interface LocationAutocompleteProps {
  value: string | LocationData;
  onChange: (location: LocationData | string) => void;
  placeholder?: string;
  showUpdatePrompt?: boolean;
  className?: string;
}

declare global {
  interface Window {
    google?: typeof google;
  }
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Enter your location",
  showUpdatePrompt = false,
  className = ""
}: LocationAutocompleteProps) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize input value from prop
  useEffect(() => {
    if (typeof value === 'string') {
      setInputValue(value);
    } else if (value && typeof value === 'object' && 'displayName' in value) {
      setInputValue(value.displayName);
    }
  }, [value]);

  // Load Google Maps API and initialize autocomplete
  useEffect(() => {
    const initializeAutocomplete = () => {
      if (!inputRef.current || !window.google || autocomplete) return;
      
      try {
        const autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['(cities)'],
          fields: ['place_id', 'formatted_address', 'geometry.location', 'types']
        });
        
        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();
          if (place.geometry?.location && place.place_id && place.formatted_address) {
            const locationData: LocationData = {
              displayName: place.formatted_address,
              coordinates: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                accuracy: 'GEOMETRIC_CENTER'
              },
              placeId: place.place_id,
              source: 'places_autocomplete',
              geocodedAt: new Date().toISOString()
            };
            
            setInputValue(place.formatted_address);
            onChange(locationData);
          }
        });
        
        setAutocomplete(autocompleteInstance);
      } catch (error) {
        console.warn('Failed to initialize Google Places Autocomplete:', error);
      }
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      initializeAutocomplete();
    } else {
      // Listen for Google Maps to be loaded
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true);
          initializeAutocomplete();
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      checkGoogleMaps();
    }
  }, [autocomplete, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // If user is typing manually (not from autocomplete), pass string value
    onChange(newValue);
  };

  // Determine if this is a legacy location (string only)
  const isLegacyLocation = typeof value === 'string' || 
    (typeof value === 'object' && value && !('coordinates' in value));

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <MapPin className="size-4 opacity-70" />
        <input
          ref={inputRef}
          className="flex-1 rounded-full border bg-transparent px-4 py-2"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
      
      {(showUpdatePrompt || isLegacyLocation) && isLoaded && (
        <div className="text-xs text-[color:var(--muted-foreground)] flex items-center gap-2">
          <AlertCircle className="size-3 text-amber-500" />
          <span>
            {isLegacyLocation 
              ? "Update your location using the autocomplete to appear accurately on the explore map"
              : "Location updated! You'll now appear on the explore map"
            }
          </span>
        </div>
      )}
      
      {!isLoaded && (
        <div className="text-xs text-[color:var(--muted-foreground)] flex items-center gap-2">
          <div className="size-3 animate-spin rounded-full border border-gray-300 border-t-transparent"></div>
          Loading location services...
        </div>
      )}
    </div>
  );
}

export type { LocationData };
