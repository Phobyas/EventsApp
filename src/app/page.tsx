"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { MapController } from "@/components/maps/MapController";
import {
  EventSearch,
  type SearchFilters,
} from "@/components/search/EventSearch";
import { EventCard } from "@/components/events/EventCard";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  location: {
    address: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  category: {
    id: string;
    name: string;
  } | null;
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select(
          `
          *,
          category:category_id (
            id,
            name
          )
        `
        )
        .order("date", { ascending: true });
      if (data) {
        setEvents(data);
        setFilteredEvents(data);
      }
    };

    fetchEvents();
  }, []);

  const handleSearch = (filters: SearchFilters) => {
    let filtered = [...events];

    // Filter by search query
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query)
      );
    }

    // Filter by location
    if (filters.location) {
      const location = filters.location.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.location.city.toLowerCase().includes(location) ||
          event.location.country.toLowerCase().includes(location)
      );
    }

    // Filter by date
    if (filters.date) {
      filtered = filtered.filter(
        (event) =>
          new Date(event.date).toDateString() === filters.date?.toDateString()
      );
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(
        (event) => event.category?.id === filters.category
      );
    }

    setFilteredEvents(filtered);
  };

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-6">Discover Events</h1>
          <p className="text-xl">Find and book tickets for events near you</p>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4">
          <EventSearch onSearch={handleSearch} />
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-6">
              Events ({filteredEvents.length})
            </h2>
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isSelected={selectedEvent?.id === event.id}
                  onClick={() =>
                    setSelectedEvent(
                      selectedEvent?.id === event.id ? null : event
                    )
                  }
                />
              ))}
            </div>
          </div>

          <div className="h-[600px] sticky top-4">
            <MapController
              locations={filteredEvents.map((event) => ({
                id: event.id,
                name: event.title,
                latitude: event.location.latitude,
                longitude: event.location.longitude,
                address: event.location.address,
              }))}
              selectedLocationId={selectedEvent?.id}
              onLocationSelect={(location) => {
                const event = filteredEvents.find((e) => e.id === location.id);
                setSelectedEvent(
                  selectedEvent?.id === event?.id ? null : (event ?? null)
                );
              }}
              interactive={false}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
