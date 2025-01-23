"use client";

import { useState, useEffect, useCallback } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { SearchBox } from "./SearchBox";

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

interface MapControllerProps {
  locations: Location[];
  selectedLocationId?: string | null;
  onLocationSelect: (location: any) => void;
  interactive?: boolean;
}

export function MapController({
  locations,
  selectedLocationId,
  onLocationSelect,
  interactive = true,
}: MapControllerProps) {
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 10,
  });

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );

  const handleMapClick = async (event: any) => {
    if (!interactive) return;

    const { lat, lng } = event.lngLat;
    onLocationSelect({ lat, lng });
  };

  const handleLocationSelect = async (
    lat: number,
    lng: number,
    address: string
  ) => {
    onLocationSelect({ lat, lng, address });
    setViewState({
      latitude: lat,
      longitude: lng,
      zoom: 14,
    });
  };

  useEffect(() => {
    if (selectedLocationId) {
      const location = locations.find((loc) => loc.id === selectedLocationId);
      if (location) {
        setViewState({
          latitude: location.latitude,
          longitude: location.longitude,
          zoom: 14,
        });
        setSelectedLocation(location);
      }
    }
  }, [selectedLocationId, locations]);

  return (
    <div className="space-y-4">
      <SearchBox onLocationSelect={handleLocationSelect} />
      <div className="h-[600px] w-full rounded-lg overflow-hidden">
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          onClick={handleMapClick}
          cursor={interactive ? "pointer" : "grab"}
        >
          <NavigationControl position="bottom-right" />

          {locations.map((location) => (
            <Marker
              key={location.id}
              latitude={location.latitude}
              longitude={location.longitude}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedLocation(location);
                onLocationSelect(location);
              }}
            >
              <div
                className={`transition-all duration-200 transform ${
                  selectedLocationId === location.id
                    ? "text-blue-500 scale-125"
                    : "text-red-500 hover:scale-110"
                }`}
              >
                📍
              </div>
            </Marker>
          ))}

          {selectedLocation && (
            <Popup
              latitude={selectedLocation.latitude}
              longitude={selectedLocation.longitude}
              closeButton={true}
              closeOnClick={false}
              onClose={() => setSelectedLocation(null)}
              anchor="bottom"
            >
              <div className="p-2">
                <h3 className="font-bold">{selectedLocation.name}</h3>
                {selectedLocation.address && (
                  <p className="text-sm text-gray-600">
                    {selectedLocation.address}
                  </p>
                )}
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
}
