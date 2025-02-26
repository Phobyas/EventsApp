"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapController } from "@/components/maps/MapController";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyTickets } from "@/components/ui/myTickets";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  TicketIcon,
  CalendarDays,
  Users,
  Settings,
} from "lucide-react";

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
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{event.title}</h3>
              {event.category && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {event.category}
                </span>
              )}
            </div>

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
  const [createdEventCount, setCreatedEventCount] = useState(0);
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "my-events";

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

      if (createdEvents) {
        setEvents(createdEvents);
        setCreatedEventCount(createdEvents.length);
      }

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
        <div className="flex gap-3">
          {createdEventCount > 0 && (
            <Link href="/dashboard/organizer">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Event Organizer
              </Button>
            </Link>
          )}
          <Link href="/events/new">
            <Button>Create New Event</Button>
          </Link>
        </div>
      </div>

      {/* Banner for event organizers */}
      {createdEventCount > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
          <CardContent className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-full mr-4">
                <BarChart3 className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h3 className="font-medium">Event Organizer Dashboard</h3>
                <p className="text-sm text-gray-600">
                  Manage your {createdEventCount} event
                  {createdEventCount !== 1 ? "s" : ""}, track sales, and check
                  in attendees
                </p>
              </div>
            </div>
            <Link href="/dashboard/organizer">
              <Button size="sm">Manage Events</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="w-full border-b">
          <TabsTrigger value="my-events">My Events</TabsTrigger>
          <TabsTrigger value="followed">Followed Events</TabsTrigger>
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Rest of your existing tabs content */}
        <TabsContent value="my-events">
          {/* Your existing my events content */}
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
          {/* Your existing followed events content */}
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
          <MyTickets />
        </TabsContent>

        <TabsContent value="settings">
          <div className="text-center py-8">
            <p className="text-gray-500">Account settings coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add organizer highlights section */}
      {createdEventCount > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            Event Organizer Highlights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2 text-blue-600" />
                  <CardTitle className="text-sm">Your Events</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-2xl font-bold">{createdEventCount}</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Link
                  href="/dashboard/organizer"
                  className="text-blue-600 text-sm"
                >
                  Manage events →
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <TicketIcon className="h-4 w-4 mr-2 text-green-600" />
                  <CardTitle className="text-sm">Ticket Sales</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-2xl font-bold">--</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Link
                  href="/dashboard/organizer?tab=sales"
                  className="text-blue-600 text-sm"
                >
                  View analytics →
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-purple-600" />
                  <CardTitle className="text-sm">Attendees</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-2xl font-bold">--</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Link
                  href="/dashboard/organizer?tab=attendees"
                  className="text-blue-600 text-sm"
                >
                  Manage attendees →
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
