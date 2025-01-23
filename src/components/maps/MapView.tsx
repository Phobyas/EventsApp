"use client";

import Map, { Marker, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useState } from "react";

interface MapViewProps {
  initialLatitude?: number;
  initialLongitude?: number;
  initialZoom?: number;
}

export function MapView({
  initialLatitude = 51.5074, // London coordinates as default
  initialLongitude = -0.1278,
  initialZoom = 10,
}: MapViewProps) {
  const [viewState, setViewState] = useState({
    latitude: initialLatitude,
    longitude: initialLongitude,
    zoom: initialZoom,
  });

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden">
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      >
        <NavigationControl position="bottom-right" />
      </Map>
    </div>
  );
}
