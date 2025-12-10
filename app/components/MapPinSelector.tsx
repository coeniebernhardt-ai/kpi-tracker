'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then((mod) => mod.useMapEvents), { ssr: false });

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Next.js
if (typeof window !== 'undefined') {
  const L = require('leaflet');
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

interface MapPinSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string, coordinates: { lat: number; lng: number }) => void;
  initialAddress?: string;
  label?: string;
}

// Component to handle map clicks
function MapClickHandler({ onClick }: { onClick: (e: any) => void }) {
  const MapEvents = useMapEvents({
    click: onClick,
  });
  return null;
}

export default function MapPinSelector({ isOpen, onClose, onSelect, initialAddress, label }: MapPinSelectorProps) {
  const [position, setPosition] = useState<[number, number]>([-26.2041, 28.0473]); // Default: Johannesburg center
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState('');

  // Initialize position from initial address if provided
  useEffect(() => {
    if (isOpen && initialAddress && initialAddress.trim()) {
      // Try to geocode the initial address
      geocodeAddress(initialAddress);
    } else if (isOpen) {
      // Default to Johannesburg center
      setPosition([-26.2041, 28.0473]);
      reverseGeocode([-26.2041, 28.0473]);
    }
  }, [isOpen, initialAddress]);

  // Geocode address to get coordinates
  const geocodeAddress = async (addressQuery: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(addressQuery)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0 && data[0].geometry) {
          const coords = data[0].geometry.coordinates; // [lng, lat] format
          const newPosition: [number, number] = [coords[1], coords[0]]; // Convert to [lat, lng]
          setPosition(newPosition);
          setAddress(data[0].display_name);
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reverse geocode coordinates to get address
  const reverseGeocode = async (coords: [number, number]) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reverse-geocode?lat=${coords[0]}&lng=${coords[1]}`);
      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          setAddress(data.display_name);
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setAddress(`${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle marker drag end
  const handleMarkerDragEnd = (e: any) => {
    const newPosition: [number, number] = [e.target.getLatLng().lat, e.target.getLatLng().lng];
    setPosition(newPosition);
    reverseGeocode(newPosition);
  };

  // Handle map click
  const handleMapClick = (e: any) => {
    const newPosition: [number, number] = [e.latlng.lat, e.latlng.lng];
    setPosition(newPosition);
    reverseGeocode(newPosition);
  };

  // Handle select button
  const handleSelect = () => {
    onSelect(address, { lat: position[0], lng: position[1] });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Select Location on Map</h2>
                {label && <p className="text-sm text-slate-400 mt-1">{label}</p>}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative min-h-[400px] bg-slate-800">
            {typeof window !== 'undefined' && (
              <MapContainer
                center={position}
                zoom={13}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                className="rounded-b-2xl"
                key={`map-${position[0]}-${position[1]}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={position}
                  draggable={true}
                  eventHandlers={{
                    dragend: handleMarkerDragEnd,
                  }}
                />
                <MapClickHandler onClick={handleMapClick} />
              </MapContainer>
            )}
            
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute top-4 left-4 bg-slate-900/90 px-4 py-2 rounded-lg flex items-center gap-2 z-10">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-white">Getting address...</span>
              </div>
            )}
          </div>

          {/* Address Display and Controls */}
          <div className="p-6 border-t border-slate-700/50">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Selected Address</label>
              <div className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white min-h-[48px] flex items-center">
                {address || 'Drag the pin or click on the map to select a location'}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSelect}
                disabled={!address || isLoading}
                className="flex-1 px-5 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: address && !isLoading ? '#1e3a5f' : '#475569' }}
              >
                Use This Location
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
