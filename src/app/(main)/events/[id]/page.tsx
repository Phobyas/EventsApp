"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { MapController } from "@/components/maps/MapController";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import { EventTicketPurchaseForm } from "@/components/forms/EventTicketPurchaseForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  location: {
    address: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    postalCode?: string;
    buildingDetails?: string;
    accessInstructions?: string;
  };
  ticket_types?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    remaining_quantity: number;
  }[];
}

export default function EventPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowed, setIsFollowed] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const fetchEvent = async () => {
    try {
      const { data } = await supabase
        .from("events")
        .select(
          `
          *,
          category:category_id (
            id,
            name
          ),
          ticket_types (
            id,
            name,
            description,
            price,
            remaining_quantity
          )
        `
        )
        .eq("id", params.id)
        .single();

      if (data) setEvent(data);
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [params.id]);

  useEffect(() => {
    const checkIfFollowed = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data } = await supabase
        .from("event_follows")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("event_id", params.id)
        .single();

      setIsFollowed(!!data);
    };

    checkIfFollowed();
  }, [params.id]);

  const handleFollow = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    try {
      if (isFollowed) {
        const { error } = await supabase
          .from("event_follows")
          .delete()
          .eq("user_id", session.user.id)
          .eq("event_id", params.id);

        if (error) throw error;
        setIsFollowed(false);
      } else {
        const { error } = await supabase.from("event_follows").insert([
          {
            user_id: session.user.id,
            event_id: params.id,
          },
        ]);

        if (error) throw error;
        setIsFollowed(true);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Event not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Button variant="ghost" onClick={() => router.push("/")} className="m-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Events
      </Button>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl">{event.title}</CardTitle>
                    {event.category && (
                      <span className="mt-2 inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                        {event.category.name}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-5 w-5 mr-2" />
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                  {event.time && (
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-5 w-5 mr-2" />
                      {event.time}
                    </div>
                  )}
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-2" />
                    {event.location.address}, {event.location.city},{" "}
                    {event.location.country}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleFollow}
                  variant="outline"
                  className="w-full"
                >
                  {isFollowed ? "Unfollow" : "Follow"} Event
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About this event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                {event.ticket_types && event.ticket_types.length > 0 ? (
                  <EventTicketPurchaseForm
                    eventId={event.id}
                    eventTitle={event.title}
                    ticketTypes={event.ticket_types}
                    onPurchaseComplete={fetchEvent}
                  />
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">
                      No tickets are currently available for this event.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Location</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px] rounded-t-none rounded-b-lg overflow-hidden">
                  <MapController
                    locations={[
                      {
                        id: event.id,
                        name: event.title,
                        latitude: event.location.latitude,
                        longitude: event.location.longitude,
                        address: event.location.address,
                      },
                    ]}
                    selectedLocationId={event.id}
                    interactive={false}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Venue Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-lg">{event.location.address}</p>
                <p className="text-gray-600">
                  {event.location.city}, {event.location.country}
                </p>
                {event.location.buildingDetails && (
                  <p className="text-gray-600">
                    {event.location.buildingDetails}
                  </p>
                )}
                {event.location.accessInstructions && (
                  <div className="mt-4">
                    <h3 className="font-medium">Access Instructions</h3>
                    <p className="text-gray-600">
                      {event.location.accessInstructions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
