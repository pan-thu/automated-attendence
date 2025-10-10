"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const DynamicMap = dynamic(async () => {
  const reactLeaflet = await import("react-leaflet");
  const leaflet = await import("leaflet");

  // Fix default marker icons using CDN URLs
  leaflet.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });

  const MapClickHandler = ({
    onSelect,
  }: {
    onSelect: (coords: { latitude: number; longitude: number }) => void;
  }) => {
    reactLeaflet.useMapEvent("click", (event) => {
      onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });

    return null;
  };

  const LeafletMap = ({
    center,
    radius,
    onSelect,
  }: {
    center: [number, number];
    radius?: number;
    onSelect: (coords: { latitude: number; longitude: number }) => void;
  }) => (
    <reactLeaflet.MapContainer
      center={center}
      zoom={16}
      scrollWheelZoom
      attributionControl={false}
      doubleClickZoom={false}
      className="h-full w-full"
    >
      <reactLeaflet.TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <reactLeaflet.Marker position={center} />
      {radius && radius > 0 ? (
        <reactLeaflet.Circle
          center={center}
          radius={radius}
          pathOptions={{ color: "#2563eb", fillOpacity: 0.1 }}
        />
      ) : null}
      <MapClickHandler onSelect={onSelect} />
    </reactLeaflet.MapContainer>
  );

  return LeafletMap;
}, {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
});

const DEFAULT_CENTER: [number, number] = [16.8409, 96.1735];

export interface MapPickerProps {
  value: { latitude: number; longitude: number } | null;
  radius?: number | null;
  onChange: (coords: { latitude: number; longitude: number }) => void;
}

/**
 * Bug Fix #23: Added debouncing to map click handler to prevent rapid state updates
 */
export function MapPicker({ value, radius, onChange }: MapPickerProps) {
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value) {
      setCurrentCenter([value.latitude, value.longitude]);
    }
  }, [value]);

  // Bug Fix #23: Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSelect = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      // Update visual position immediately for responsive UX
      setCurrentCenter([coords.latitude, coords.longitude]);

      // Bug Fix #23: Debounce onChange callback to prevent rapid updates
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onChange(coords);
      }, 300); // 300ms debounce delay
    },
    [onChange]
  );

  return (
    <div className="h-72 overflow-hidden rounded-md border">
      <DynamicMap center={currentCenter} radius={radius ?? undefined} onSelect={handleSelect} />
    </div>
  );
}
