'use client';

import { useEffect, useRef, useState } from 'react';

// Type for Google Maps Autocomplete
interface GoogleAutocomplete {
  getPlace: () => {
    formatted_address?: string;
    [key: string]: any;
  };
  addListener: (event: string, callback: () => void) => void;
}

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export default function PlaceAutocomplete({
  value,
  onChange,
  placeholder,
  required,
  className,
  onFocus,
  onBlur
}: PlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<GoogleAutocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Google Maps API script if not already loaded
      if (typeof window !== 'undefined' && !(window as any).google?.maps?.places) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsLoaded(true);
      };
      document.head.appendChild(script);
      } else if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
        setIsLoaded(true);
      }

    return () => {
      if (autocompleteRef.current && typeof window !== 'undefined' && (window as any).google?.maps?.event) {
        const google = (window as any).google;
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current && typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      const google = (window as any).google;
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'za' } // Restrict to South Africa
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          onChange(place.formatted_address);
        }
      });

      autocompleteRef.current = autocomplete;
    }
  }, [isLoaded, onChange]);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={className}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <p className="text-xs text-yellow-500 mt-1">
          Note: Google Maps API key not configured. Autocomplete will not work.
        </p>
      )}
    </>
  );
}

