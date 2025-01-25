"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { EventCard } from "@/components/events/EventCard";

export default function FollowedEventsPage() {
  const [followedEvents, setFollowedEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { session } = useAuth();
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const fetchFollowedEvents = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("event_follows")
        .select(
          `
         event_id,
         events (*)
       `
        )
        .eq("user_id", session.user.id);

      if (data) {
        setFollowedEvents(data.map((item) => item.events));
      }
    };

    fetchFollowedEvents();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Followed Events</h1>
      <div className="grid gap-4">
        {followedEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isSelected={selectedEventId === event.id}
            onClick={() =>
              setSelectedEventId(selectedEventId === event.id ? null : event.id)
            }
          />
        ))}
      </div>
    </div>
  );
}
