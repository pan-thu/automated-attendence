"use client";

import { useEffect } from "react";
import type { Map as LeafletMap } from "leaflet";

export interface LeafletControllerProps {
  map: LeafletMap | null;
  onClick?: () => void;
}

export function LeafletController({ map, onClick }: LeafletControllerProps) {
  useEffect(() => {
    if (!map || !onClick) return;
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, onClick]);

  return null;
}
