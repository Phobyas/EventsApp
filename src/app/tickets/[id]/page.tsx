"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  Download,
  Ticket as TicketIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

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
  ticket_types?: {
    name: string;
    price: number;
    event_id: string;
  };
  event?: {
    id: string;
    title: string;
    date: string;
    time: string | null;
    description: string;
    location: {
      address: string;
      city: string;
      country: string;
      postalCode?: string;
      buildingDetails?: string;
      accessInstructions?: string;
    };
  };
}

export default function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [debug, setDebug] = useState<{ visible: boolean; messages: string[] }>({
    visible: false,
    messages: [],
  });
  const router = useRouter();
  const supabase = createClientComponentClient();

  const addDebugMessage = (message: string) => {
    setDebug((prev) => ({
      ...prev,
      messages: [...prev.messages, `${new Date().toISOString()}: ${message}`],
    }));
    console.log(`[TicketDetail Debug] ${message}`);
  };

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setIsLoading(true);
        addDebugMessage("Starting ticket fetch");

        // Check authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          addDebugMessage("No authenticated user found");
          router.push("/login");
          return;
        }

        // Fetch ticket with order
        addDebugMessage(`Fetching ticket with ID: ${params.id}`);
        const { data: ticketData, error: ticketError } = await supabase
          .from("tickets")
          .select(
            `
            *,
            order:orders!tickets_order_id_fkey (*)
          `
          )
          .eq("id", params.id)
          .single();

        if (ticketError) {
          addDebugMessage(`Error fetching ticket: ${ticketError.message}`);
          console.error("Error fetching ticket:", ticketError);
          if (ticketError.code === "PGRST116") {
            // Not found
            router.push("/not-found");
          }
          return;
        }

        if (!ticketData) {
          addDebugMessage("Ticket not found");
          router.push("/not-found");
          return;
        }

        // Check if user is authorized to view this ticket
        if (ticketData.user_id !== session.user.id) {
          addDebugMessage(
            `Authorization failed: Ticket belongs to ${ticketData.user_id}, not ${session.user.id}`
          );
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        setIsAuthorized(true);

        // Fetch ticket type
        addDebugMessage(`Fetching ticket type: ${ticketData.ticket_type_id}`);
        const { data: ticketTypeData, error: typeError } = await supabase
          .from("ticket_types")
          .select("*")
          .eq("id", ticketData.ticket_type_id)
          .single();

        if (typeError) {
          addDebugMessage(`Error fetching ticket type: ${typeError.message}`);
          console.error("Error fetching ticket type:", typeError);
          setTicket({ ...ticketData, ticket_types: undefined });
          return;
        }

        // Fetch event
        addDebugMessage(`Fetching event: ${ticketTypeData.event_id}`);
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", ticketTypeData.event_id)
          .single();

        if (eventError) {
          addDebugMessage(`Error fetching event: ${eventError.message}`);
          console.error("Error fetching event:", eventError);
          setTicket({
            ...ticketData,
            ticket_types: ticketTypeData,
            event: undefined,
          });
          return;
        }

        // Combine all data
        const combinedTicketData = {
          ...ticketData,
          ticket_types: ticketTypeData,
          event: eventData,
        };

        addDebugMessage("Successfully fetched all ticket data");
        setTicket(combinedTicketData);
      } catch (err) {
        console.error("Error:", err);
        addDebugMessage(
          `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicket();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Not Authorized</h1>
        <p className="text-gray-600 mb-6">
          You are not authorized to view this ticket.
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (!ticket || !ticket.event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Ticket information incomplete</p>
          <Button onClick={() => router.push("/dashboard?tab=tickets")}>
            Back to My Tickets
          </Button>

          {/* Debug toggle */}
          <div className="mt-4">
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

            {debug.visible && debug.messages.length > 0 && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40 text-left">
                {debug.messages.map((msg, i) => (
                  <div key={i} className="mb-1">
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const eventDate = new Date(ticket.event.date);
  const isPastEvent = eventDate < new Date();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => router.push("/dashboard?tab=tickets")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Tickets
      </Button>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Left column - Ticket info */}
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader className="bg-blue-500 text-white py-6">
              <div className="flex items-center space-x-2">
                <TicketIcon />
                <h1 className="text-2xl font-bold">{ticket.event.title}</h1>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="bg-white text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {ticket.ticket_types?.name || "General Admission"}
                </span>
                {ticket.used ? (
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                    Used
                  </span>
                ) : isPastEvent ? (
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                    Event Ended
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    Valid
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Date
                  </h3>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                    <span>{eventDate.toLocaleDateString()}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Time
                  </h3>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-blue-500" />
                    <span>{ticket.event.time || "Not specified"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Location
                </h3>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-2 text-blue-500 mt-0.5" />
                  <div>
                    <p>{ticket.event.location.address}</p>
                    <p>
                      {ticket.event.location.city},{" "}
                      {ticket.event.location.country}
                      {ticket.event.location.postalCode
                        ? ` ${ticket.event.location.postalCode}`
                        : ""}
                    </p>
                    {ticket.event.location.buildingDetails && (
                      <p className="text-gray-600 text-sm mt-1">
                        {ticket.event.location.buildingDetails}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {ticket.event.location.accessInstructions && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Access Instructions
                  </h3>
                  <p className="text-gray-700">
                    {ticket.event.location.accessInstructions}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Ticket Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID</span>
                    <span className="font-mono">
                      {ticket.order_id.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Purchase Date</span>
                    <span>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price</span>
                    <span>
                      ${ticket.ticket_types?.price.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span
                      className={
                        ticket.used ? "text-gray-500" : "text-green-600"
                      }
                    >
                      {ticket.used ? "Used" : "Active"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - QR and actions */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="bg-white p-4 border-2 border-gray-200 rounded-md">
                  {/* Placeholder for QR code */}
                  <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                    <p className="text-gray-600 text-center p-4">
                      QR code for ticket
                      <br />
                      ID: {ticket.id.substring(0, 8)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-center text-gray-500">
                  Present this QR code at the event entrance
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex-col space-y-3">
              <Button className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Ticket
              </Button>

              <div className="w-full pt-3 border-t text-center">
                <p className="text-sm text-gray-500 mb-1">Having problems?</p>
                <Button variant="link" className="text-sm underline">
                  Contact Support
                </Button>
              </div>
            </CardFooter>
          </Card>

          {ticket.event.description && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">Event Description</h3>
                <p className="text-gray-700 text-sm">
                  {ticket.event.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Debug toggle */}
          <div className="w-full mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDebug((prev) => ({ ...prev, visible: !prev.visible }))
              }
              className="text-xs w-full"
            >
              {debug.visible ? "Hide Debug Info" : "Show Debug Info"}
            </Button>

            {debug.visible && debug.messages.length > 0 && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
                {debug.messages.map((msg, i) => (
                  <div key={i} className="mb-1">
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
