'use client';

import { useEffect, useRef, useState } from 'react';
import MapPinSelector from './MapPinSelector';

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  label?: string;
}

interface NominatimResult {
  display_name: string;
  place_id: number;
}

export default function PlaceAutocomplete({
  value,
  onChange,
  placeholder,
  required,
  className,
  onFocus,
  onBlur,
  label
}: PlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Use Next.js API route to proxy Nominatim requests (avoids CORS issues)
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);

      if (response.ok) {
        const data: NominatimResult[] = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        setSelectedIndex(-1);
      } else {
        console.error('Geocoding API error:', response.status, response.statusText);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onChange(query);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce API calls
    timeoutRef.current = setTimeout(() => {
      searchAddress(query);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: NominatimResult) => {
    onChange(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMapSelect = (address: string) => {
    onChange(address);
  };

  // Remove w-full from className if present, as we're using flex-1 instead
  const inputClassName = className?.replace(/\bw-full\b/g, '') || '';
  
  return (
    <>
      <div className="relative w-full" ref={containerRef}>
        <div className="flex gap-2 w-full">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
              onFocus?.(e);
            }}
            onBlur={(e) => {
              // Don't hide if clicking on suggestions
              const relatedTarget = (e.relatedTarget as HTMLElement);
              if (!relatedTarget || !relatedTarget.closest('.autocomplete-suggestions')) {
                setTimeout(() => {
                  setShowSuggestions(false);
                }, 200);
              }
              onBlur?.(e);
            }}
            placeholder={placeholder}
            required={required}
            className={`flex-1 min-w-0 ${inputClassName}`}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Map button clicked');
              setShowMap(true);
            }}
            className="px-4 py-3 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2 shrink-0 hover:opacity-90 whitespace-nowrap"
            style={{ background: '#1e3a5f', minWidth: '80px' }}
            title="Select location on map"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Map</span>
          </button>
        </div>
        {isLoading && (
          <div className="absolute right-20 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <div className="autocomplete-suggestions absolute z-50 w-full mt-1 bg-slate-800 border border-blue-500/30 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.place_id}-${index}`}
                type="button"
                onMouseDown={(e) => {
                  // Prevent input blur from firing before click
                  e.preventDefault();
                }}
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full text-left px-4 py-3 hover:bg-blue-900/50 transition-colors ${
                  index === selectedIndex ? 'bg-blue-900/50' : ''
                } ${index < suggestions.length - 1 ? 'border-b border-blue-500/20' : ''}`}
              >
                <p className="text-sm text-white">{suggestion.display_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <MapPinSelector
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        onSelect={handleMapSelect}
        initialAddress={value}
        label={label}
      />
    </>
  );
}
