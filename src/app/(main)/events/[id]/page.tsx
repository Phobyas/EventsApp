"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { MapController } from "@/components/maps/MapController";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

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
}

export default function EventPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowed, setIsFollowed] = useState(false);
  const { session } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
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

    fetchEvent();
  }, [params.id]);

  useEffect(() => {
    const checkIfFollowed = async () => {
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
  }, [session?.user?.id, params.id]);

  const handleFollow = async () => {
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

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  if (!event)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Event not found
      </div>
    );

  return (
    <div className="min-h-screen">
      <Button variant="ghost" onClick={() => router.push("/")} className="m-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Events
      </Button>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-4xl font-bold">{event.title}</h1>
                  {event.category && (
                    <span className="mt-2 inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                      {event.category.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
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
            </div>

            <Button onClick={handleFollow} variant="outline" className="w-full">
              {isFollowed ? "Unfollow" : "Follow"} Event
            </Button>

            <div>
              <h2 className="text-2xl font-semibold mb-3">About this event</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Tickets</h2>
              <div className="text-center py-4">
                <p className="text-gray-500">
                  Tickets will be available soon...
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="h-[400px] rounded-lg overflow-hidden">
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

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3">Venue Details</h2>
              <div className="space-y-2">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
