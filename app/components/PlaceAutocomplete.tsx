'use client';

import { useEffect, useRef, useState } from 'react';

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
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Google Maps API script if not already loaded
      if (typeof window !== 'undefined' && typeof window.google === 'undefined') {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsLoaded(true);
      };
      document.head.appendChild(script);
      } else if (typeof window !== 'undefined' && window.google?.maps?.places) {
        setIsLoaded(true);
      }

    return () => {
      if (autocompleteRef.current && typeof window !== 'undefined' && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current && typeof window !== 'undefined' && window.google?.maps?.places) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
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

