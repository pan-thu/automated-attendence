"use client";

import { useCallback, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Direct Leaflet types - Using import types for proper typing
import type * as L from 'leaflet';
type LeafletMap = L.Map;
type LeafletMarker = L.Marker;
type LeafletCircle = L.Circle;

const DEFAULT_CENTER: [number, number] = [16.8409, 96.1735];

export interface MapPickerProps {
  value: { latitude: number; longitude: number } | null;
  radius?: number | null;
  onChange: (coords: { latitude: number; longitude: number }) => void;
}

/**
 * React 19 Fix: Use direct Leaflet with manual lifecycle management
 * This is the most reliable solution for "Map container is already initialized" error
 * Source: react-leaflet issues #1133, #936, Stack Overflow discussions
 */
export function MapPicker({ value, radius, onChange }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const center = value ? [value.latitude, value.longitude] as [number, number] : DEFAULT_CENTER;

  const handleSelect = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onChange(coords);
      }, 300);
    },
    [onChange]
  );

  // Initialize map with direct Leaflet
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Initialize map only if not already initialized
      if (!mapRef.current && mapContainerRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          attributionControl: false,
          doubleClickZoom: false,
          scrollWheelZoom: true,
        }).setView(center, 16);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);

        // Add marker
        markerRef.current = L.marker(center).addTo(mapRef.current);

        // Add circle if radius exists
        if (radius && radius > 0) {
          circleRef.current = L.circle(center, {
            radius,
            color: '#2563eb',
            fillOpacity: 0.1,
          }).addTo(mapRef.current);
        }

        // Add click handler
        mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
          handleSelect({ latitude: e.latlng.lat, longitude: e.latlng.lng });
        });

        // Invalidate size after a short delay
        setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 100);
      }
    };

    initMap();

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only initialize once

  // Update map view when center changes
  useEffect(() => {
    if (mapRef.current && value) {
      mapRef.current.setView(center, mapRef.current.getZoom(), { animate: true });

      if (markerRef.current) {
        markerRef.current.setLatLng(center);
      }

      if (circleRef.current) {
        circleRef.current.setLatLng(center);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.latitude, value?.longitude]);

  // Update radius when it changes
  useEffect(() => {
    const updateRadius = async () => {
      if (!mapRef.current) return;

      const L = (await import('leaflet')).default;

      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }

      if (radius && radius > 0) {
        circleRef.current = L.circle(center, {
          radius,
          color: '#2563eb',
          fillOpacity: 0.1,
        }).addTo(mapRef.current);
      }
    };

    updateRadius();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, value?.latitude, value?.longitude]);

  return (
    <div className="h-72 overflow-hidden rounded-md border">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
