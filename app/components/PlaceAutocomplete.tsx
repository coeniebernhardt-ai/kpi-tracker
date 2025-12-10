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
  onBlur
}: PlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
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
      // Use Nominatim API (OpenStreetMap) - free, no API key required
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=za&limit=5&addressdetails=1`;
      
      console.log('Searching for:', query);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Think-Q/1.0 (contact: webmaster@thinkdigital.co.za)', // Required by Nominatim
          'Accept-Language': 'en',
        },
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data: NominatimResult[] = await response.json();
        console.log('Suggestions received:', data.length);
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        setSelectedIndex(-1);
      } else {
        console.error('Nominatim API error:', response.status, response.statusText);
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

  return (
    <div className="relative" ref={containerRef}>
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
        className={className}
        autoComplete="off"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
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
  );
}
