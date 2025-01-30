"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapController } from "@/components/maps/MapController";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    buildingDetails?: string;
    latitude: number;
    longitude: number;
    postalCode?: string;
    accessInstructions?: string;
  };
  user_id: string;
}

function EventList({
  events,
  onEventSelect,
  selectedEventId,
}: {
  events: Event[];
  onEventSelect: (event: Event | null) => void;
  selectedEventId: string | null;
}) {
  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <div className="text-center p-6 bg-white rounded-lg border">
          <p className="text-gray-500">
            No events yet. Create your first event!
          </p>
        </div>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            className={`p-4 border rounded-lg bg-white cursor-pointer transition-all
            ${
              selectedEventId === event.id
                ? "border-blue-500 ring-2 ring-blue-200 shadow-lg"
                : "hover:bg-gray-50 hover:shadow-md"
            }`}
            onClick={() =>
              onEventSelect(selectedEventId === event.id ? null : event)
            }
          >
            <h3 className="font-semibold">{event.title}</h3>
            <p className="text-sm text-gray-600">
              {new Date(event.date).toLocaleDateString()}
            </p>
            <p className="text-sm">{event.location.address}</p>

            {selectedEventId === event.id && (
              <div className="mt-4 space-y-3 text-sm">
                {event.description && (
                  <p className="text-gray-700">{event.description}</p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">Location:</p>
                    <p>
                      {event.location.city}, {event.location.country}
                    </p>
                    {event.location.postalCode && (
                      <p className="text-gray-600">
                        Postal code: {event.location.postalCode}
                      </p>
                    )}
                    {event.location.buildingDetails && (
                      <p className="text-gray-600">
                        {event.location.buildingDetails}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Date & Time:</p>
                    <p>{new Date(event.date).toLocaleDateString()}</p>
                    <p>{event.time || "Time not specified"}</p>
                  </div>
                </div>
                {event.location.accessInstructions && (
                  <div>
                    <p className="font-medium">Access Instructions:</p>
                    <p className="text-gray-600">
                      {event.location.accessInstructions}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [followedEvents, setFollowedEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [session, setSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };

    fetchSession();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchEvents = async () => {
      // Fetch user's created events
      const { data: createdEvents } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: true });

      if (createdEvents) setEvents(createdEvents);

      // Fetch followed events
      const { data: followedData } = await supabase
        .from("event_follows")
        .select(
          `
         event_id,
         events (*)
       `
        )
        .eq("user_id", session.user.id);

      if (followedData) {
        setFollowedEvents(followedData.map((item) => item.events));
      }
    };

    fetchEvents();

    const channel = supabase
      .channel("events")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `user_id=eq.${session.user.id}`,
        },
        fetchEvents
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session]);

  const handleEventSelect = (event: Event | null) => {
    setSelectedEvent(event);
    if (event) {
      const searchText = `${event.location.address}, ${event.location.city}, ${event.location.country}`;
      setSearchQuery(searchText);
    } else {
      setSearchQuery("");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-600">Welcome back!</p>
        </div>
        <Link href="/events/new">
          <Button>Create New Event</Button>
        </Link>
      </div>

      <Tabs defaultValue="my-events" className="space-y-6">
        <TabsList className="w-full border-b">
          <TabsTrigger value="my-events">My Events</TabsTrigger>
          <TabsTrigger value="followed">Followed Events</TabsTrigger>
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="my-events">
          <div className="grid md:grid-cols-2 gap-6">
            <EventList
              events={events}
              onEventSelect={handleEventSelect}
              selectedEventId={selectedEvent?.id ?? null}
            />
            <div className="sticky top-6 h-[600px] bg-white rounded-lg border">
              <MapController
                locations={events.map((event) => ({
                  id: event.id,
                  name: event.title,
                  latitude: event.location.latitude,
                  longitude: event.location.longitude,
                  address: event.location.address,
                }))}
                selectedLocationId={selectedEvent?.id ?? null}
                onLocationSelect={(location) => {
                  const event = events.find((e) => e.id === location.id);
                  handleEventSelect(event ?? null);
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                interactive={false}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="followed">
          <div className="grid md:grid-cols-2 gap-6">
            <EventList
              events={followedEvents}
              onEventSelect={handleEventSelect}
              selectedEventId={selectedEvent?.id ?? null}
            />
            <div className="sticky top-6 h-[600px] bg-white rounded-lg border">
              <MapController
                locations={followedEvents.map((event) => ({
                  id: event.id,
                  name: event.title,
                  latitude: event.location.latitude,
                  longitude: event.location.longitude,
                  address: event.location.address,
                }))}
                selectedLocationId={selectedEvent?.id ?? null}
                onLocationSelect={(location) => {
                  const event = followedEvents.find(
                    (e) => e.id === location.id
                  );
                  handleEventSelect(event ?? null);
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                interactive={false}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tickets">
          <div className="text-center py-8">
            <p className="text-gray-500">Your tickets will appear here soon</p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="text-center py-8">
            <p className="text-gray-500">Account settings coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
