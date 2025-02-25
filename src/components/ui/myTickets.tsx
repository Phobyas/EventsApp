import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Clock, MapPin, Ticket } from "lucide-react";

interface TicketData {
  id: string;
  order_id: string;
  ticket_type_id: string;
  user_id: string;
  used: boolean;
  created_at: string;
  order: {
    total_amount: number;
    created_at: string;
  };
  ticket_types: {
    name: string;
    price: number;
    event_id: string;
  };
  event: {
    id: string;
    title: string;
    date: string;
    time: string | null;
    location: {
      city: string;
      country: string;
    };
  };
}

export function MyTickets() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<{ visible: boolean; messages: string[] }>({
    visible: false,
    messages: [],
  });
  const supabase = createClientComponentClient();

  const addDebugMessage = (message: string) => {
    setDebug((prev) => ({
      ...prev,
      messages: [...prev.messages, `${new Date().toISOString()}: ${message}`],
    }));
    console.log(`[MyTickets Debug] ${message}`);
  };

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true);
        addDebugMessage("Starting ticket fetch");

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoading(false);
          addDebugMessage("No authenticated user found");
          return;
        }

        addDebugMessage(`User authenticated: ${session.user.id}`);

        // First, fetch the tickets
        addDebugMessage("Fetching tickets from database");
        const { data: ticketsData, error: ticketsError } = await supabase
          .from("tickets")
          .select(
            `
            *,
            order:orders!tickets_order_id_fkey (*)
          `
          )
          .eq("user_id", session.user.id);

        if (ticketsError) {
          console.error("Error fetching tickets:", ticketsError);
          addDebugMessage(`Error fetching tickets: ${ticketsError.message}`);
          setError("Failed to load tickets");
          return;
        }

        if (!ticketsData || ticketsData.length === 0) {
          addDebugMessage("No tickets found");
          setTickets([]);
          setIsLoading(false);
          return;
        }

        addDebugMessage(`Found ${ticketsData.length} tickets`);

        // Now fetch ticket types for these tickets
        const ticketTypeIds = ticketsData.map((t) => t.ticket_type_id);
        addDebugMessage(`Fetching ${ticketTypeIds.length} ticket types`);

        const { data: ticketTypesData, error: typesError } = await supabase
          .from("ticket_types")
          .select("*, event:events!ticket_types_event_id_fkey(*)")
          .in("id", ticketTypeIds);

        if (typesError) {
          console.error("Error fetching ticket types:", typesError);
          addDebugMessage(`Error fetching ticket types: ${typesError.message}`);
          setError("Failed to load ticket details");
          return;
        }

        // Combine the data
        const processedTickets = ticketsData.map((ticket) => {
          const ticketType = ticketTypesData.find(
            (tt) => tt.id === ticket.ticket_type_id
          );
          return {
            ...ticket,
            ticket_types: ticketType,
            event: ticketType?.event,
          };
        });

        addDebugMessage(
          `Processed ${processedTickets.length} tickets with event data`
        );
        setTickets(processedTickets.filter((ticket) => ticket.event !== null));
      } catch (err) {
        console.error("Error:", err);
        addDebugMessage(
          `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
        );
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>

        {/* Debug toggle */}
        <div className="w-full mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDebug((prev) => ({ ...prev, visible: !prev.visible }))
            }
            className="text-xs"
          >
            {debug.visible ? "Hide Debug Info" : "Show Debug Info"}
          </Button>
        </div>

        {debug.visible && debug.messages.length > 0 && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40 mx-auto max-w-2xl text-left">
            {debug.messages.map((msg, i) => (
              <div key={i} className="mb-1">
                {msg}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <Ticket className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium mb-2">No tickets yet</h3>
        <p className="text-gray-500 mb-6">
          You haven't purchased any tickets yet. Browse events to find something
          interesting.
        </p>
        <Link href="/">
          <Button>Browse Events</Button>
        </Link>
      </div>
    );
  }

  // Group tickets by event for better organization
  const groupedTickets: Record<string, TicketData[]> = {};
  tickets.forEach((ticket) => {
    if (!ticket.event) return;

    const eventId = ticket.event.id;
    if (!groupedTickets[eventId]) {
      groupedTickets[eventId] = [];
    }
    groupedTickets[eventId].push(ticket);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">My Tickets</h2>

        {/* Debug toggle */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setDebug((prev) => ({ ...prev, visible: !prev.visible }))
          }
          className="text-xs"
        >
          {debug.visible ? "Hide Debug Info" : "Show Debug Info"}
        </Button>
      </div>

      {debug.visible && debug.messages.length > 0 && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
          {debug.messages.map((msg, i) => (
            <div key={i} className="mb-1">
              {msg}
            </div>
          ))}
        </div>
      )}

      {Object.entries(groupedTickets).map(([eventId, eventTickets]) => (
        <div
          key={eventId}
          className="border rounded-lg overflow-hidden bg-white shadow-sm"
        >
          <div className="bg-gray-50 p-4 border-b">
            <h3 className="font-medium text-lg">
              {eventTickets[0].event.title}
            </h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(eventTickets[0].event.date).toLocaleDateString()}
              </div>
              {eventTickets[0].event.time && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {eventTickets[0].event.time}
                </div>
              )}
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {eventTickets[0].event.location.city},{" "}
                {eventTickets[0].event.location.country}
              </div>
            </div>
          </div>

          <div className="divide-y">
            {eventTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">
                      {ticket.ticket_types?.name || "Ticket"}
                    </span>
                    {ticket.used ? (
                      <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        Used
                      </span>
                    ) : (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Valid
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Purchased:{" "}
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                </div>

                <Link href={`/tickets/${ticket.id}`}>
                  <Button variant="outline" size="sm">
                    View Ticket
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-4 border-t">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {eventTickets.length}{" "}
                {eventTickets.length === 1 ? "ticket" : "tickets"}
              </div>
              <div className="text-sm font-medium">
                Total: $
                {eventTickets
                  .reduce((sum, t) => sum + (t.ticket_types?.price || 0), 0)
                  .toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
