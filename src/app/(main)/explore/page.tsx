"use client";

import { MapController } from "@/components/maps/MapController";
import { useState } from "react";

const SAMPLE_LOCATIONS = [
  {
    id: "1",
    name: "London Eye",
    latitude: 51.5033,
    longitude: -0.1195,
    description: "Famous Ferris wheel offering views of London",
  },
];

export default function ExplorePage() {
  const handleLocationSelect = (lat: number, lng: number) => {
    console.log(`Selected location: ${lat}, ${lng}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Explore Destinations</h1>
      <div className="rounded-lg border">
        <MapController
          locations={SAMPLE_LOCATIONS}
          onLocationSelect={handleLocationSelect}
        />
      </div>
    </div>
  );
}
