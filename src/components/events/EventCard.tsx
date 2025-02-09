"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuth } from "@/lib/hooks/useAuth";

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
  };
  ticket_types?: TicketType[];
}

interface EventCardProps {
  event: Event;
  isSelected: boolean;
  onClick: () => void;
}

export function EventCard({ event, isSelected, onClick }: EventCardProps) {
  const [isFollowed, setIsFollowed] = useState(false);
  const { session } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkIfFollowed = async () => {
      if (!session?.user?.id) return;

      const { data } = await supabase
        .from("event_follows")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("event_id", event.id)
        .single();

      setIsFollowed(!!data);
    };

    checkIfFollowed();
  }, [session?.user?.id, event.id, supabase]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();

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
          .eq("event_id", event.id);

        if (error) throw error;
        setIsFollowed(false);
      } else {
        const { error } = await supabase.from("event_follows").insert([
          {
            user_id: session.user.id,
            event_id: event.id,
          },
        ]);

        if (error) throw error;
        setIsFollowed(true);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-blue-500" : "hover:shadow-md"
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">{event.title}</h3>
        {event.category && (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            {event.category.name}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600">
        {new Date(event.date).toLocaleDateString()}
      </p>
      <p className="text-sm text-gray-600">
        {new Date(event.date).toLocaleDateString()}
      </p>
      <p className="text-sm">
        {event.location.city}, {event.location.country}
      </p>

      {isSelected && (
        <div className="mt-4 space-y-4">
          <p className="text-sm">{event.description}</p>

          <div className="space-y-2">
            <h4 className="font-medium">Tickets</h4>
            {event.ticket_types?.map((ticket) => (
              <div
                key={ticket.id}
                className="flex justify-between items-center bg-gray-50 p-2 rounded"
              >
                <div>
                  <p className="font-medium">{ticket.name}</p>
                  <p className="text-sm text-gray-600">{ticket.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${ticket.price}</p>
                  <p className="text-sm text-gray-600">
                    {ticket.remaining_quantity} remaining
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex gap-2">
            <Button variant="outline" onClick={handleFollow} className="flex-1">
              {isFollowed ? "Unfollow" : "Follow"} Event
            </Button>
            <Link
              href={`/events/${event.id}`}
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button className="w-full">View Details</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
