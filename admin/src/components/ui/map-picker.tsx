"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const DynamicMap = dynamic(async () => {
  const reactLeaflet = await import("react-leaflet");
  const leaflet = await import("leaflet");
  const [iconRetina, iconDefault, shadow] = await Promise.all([
    import("leaflet/dist/images/marker-icon-2x.png"),
    import("leaflet/dist/images/marker-icon.png"),
    import("leaflet/dist/images/marker-shadow.png"),
  ]);

  leaflet.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetina.default,
    iconUrl: iconDefault.default,
    shadowUrl: shadow.default,
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

  return ({
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

export function MapPicker({ value, radius, onChange }: MapPickerProps) {
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(DEFAULT_CENTER);

  useEffect(() => {
    if (value) {
      setCurrentCenter([value.latitude, value.longitude]);
    }
  }, [value]);

  const handleSelect = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      setCurrentCenter([coords.latitude, coords.longitude]);
      onChange(coords);
    },
    [onChange]
  );

  return (
    <div className="h-72 overflow-hidden rounded-md border">
      <DynamicMap center={currentCenter} radius={radius ?? undefined} onSelect={handleSelect} />
    </div>
  );
}
