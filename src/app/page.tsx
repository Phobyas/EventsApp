"use client";

import { useEffect, useState } from "react";
import { MapController } from "@/components/maps/MapController";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { EventCard } from "@/components/events/EventCard";
import Link from "next/link";

interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  remaining_quantity: number;
}

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
  ticket_types?: TicketType[];
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*, ticket_types(*)")
        .order("date", { ascending: true });
      if (data) setEvents(data);
    };

    fetchEvents();

    const channel = supabase
      .channel("public:events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        fetchEvents
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-6">Discover Events</h1>
          <p className="text-xl">Browse and book tickets for upcoming events</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-6">All Events</h2>
            <div className="space-y-4">
              {events.map((event) => (
                <EventCard
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
              locations={events.map((event) => ({
                id: event.id,
                name: event.title,
                latitude: event.location.latitude,
                longitude: event.location.longitude,
                address: event.location.address,
              }))}
              selectedLocationId={selectedEvent?.id}
              onLocationSelect={(location) => {
                const event = events.find((e) => e.id === location.id);
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
