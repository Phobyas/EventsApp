import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  remaining_quantity: number;
}

interface PurchaseTicketsProps {
  eventId: string;
  eventTitle: string;
  ticketTypes: TicketType[];
  onPurchaseComplete?: () => void;
}

export function EventTicketPurchaseForm({
  eventId,
  eventTitle,
  ticketTypes,
  onPurchaseComplete,
}: PurchaseTicketsProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(ticketTypes.map((t) => [t.id, 0]))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    console.log(`[TicketPurchase Debug] ${message}`);
  };

  const handleQuantityChange = (ticketId: string, value: string) => {
    const quantity = parseInt(value) || 0;
    const ticket = ticketTypes.find((t) => t.id === ticketId);

    if (ticket && quantity >= 0 && quantity <= ticket.remaining_quantity) {
      setQuantities((prev) => ({ ...prev, [ticketId]: quantity }));
    }
  };

  const calculateSubtotal = () => {
    return ticketTypes.reduce((total, ticket) => {
      return total + ticket.price * (quantities[ticket.id] || 0);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal;
  };

  const handlePurchase = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      addDebugMessage("Starting ticket purchase process");

      // Check authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        addDebugMessage("No authenticated user found");
        router.push("/login");
        return;
      }

      addDebugMessage(`User authenticated: ${session.user.id}`);

      // Prepare ticket purchases
      const selectedTickets = ticketTypes.filter(
        (ticket) => quantities[ticket.id] > 0
      );

      if (selectedTickets.length === 0) {
        setError("Please select at least one ticket");
        addDebugMessage("No tickets selected");
        return;
      }

      addDebugMessage(`Selected ${selectedTickets.length} ticket types`);

      // Create orders for each ticket type
      for (const ticket of selectedTickets) {
        const quantity = quantities[ticket.id];
        const ticketTotal = ticket.price * quantity;

        addDebugMessage(
          `Creating order for ticket type ${ticket.id}: ${quantity} x $${ticket.price} = $${ticketTotal}`
        );

        // Create order
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: session.user.id,
            ticket_type_id: ticket.id,
            quantity: quantity,
            total_amount: ticketTotal,
            status: "completed",
          })
          .select()
          .single();

        if (orderError) {
          addDebugMessage(`Order creation error: ${orderError.message}`);
          throw orderError;
        }

        if (!orderData) {
          addDebugMessage("Order created but no data returned");
          throw new Error("Failed to create order");
        }

        addDebugMessage(`Order created with ID: ${orderData.id}`);

        // Create individual tickets with absolute minimal fields
        addDebugMessage(`Creating ${quantity} individual tickets`);

        for (let i = 0; i < quantity; i++) {
          // Create tickets one by one to isolate issues
          const { error: ticketError } = await supabase.from("tickets").insert({
            order_id: orderData.id,
            ticket_type_id: ticket.id,
            user_id: session.user.id, // Link ticket to user
          });

          if (ticketError) {
            addDebugMessage(`Ticket creation error: ${ticketError.message}`);
            throw ticketError;
          }
        }

        // Update remaining quantity
        const { error: updateError } = await supabase
          .from("ticket_types")
          .update({
            remaining_quantity: ticket.remaining_quantity - quantity,
          })
          .eq("id", ticket.id);

        if (updateError) {
          addDebugMessage(
            `Error updating quantity for ticket type ${ticket.id}: ${updateError.message}`
          );
        }
      }

      addDebugMessage("All purchases completed successfully");

      // Reset form and notify completion
      setQuantities(Object.fromEntries(ticketTypes.map((t) => [t.id, 0])));
      onPurchaseComplete?.();

      alert("Tickets purchased successfully!");
      router.push("/dashboard?tab=tickets");
    } catch (err) {
      console.error("Purchase error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      addDebugMessage(`Purchase error: ${errorMessage}`);
      setError(`Failed to complete purchase: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const hasSelectedTickets = Object.values(quantities).some((q) => q > 0);

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Purchase Tickets</CardTitle>
        <CardDescription>{eventTitle}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {ticketTypes.map((ticket) => (
          <div
            key={ticket.id}
            className="flex justify-between items-start p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <h4 className="font-medium">{ticket.name}</h4>
              {ticket.description && (
                <p className="text-sm text-gray-600">{ticket.description}</p>
              )}
              <p className="text-sm text-gray-600">
                {ticket.remaining_quantity} remaining
              </p>
            </div>

            <div className="flex items-center gap-4">
              <p className="font-medium">${ticket.price.toFixed(2)}</p>
              <div className="w-20">
                <Input
                  type="number"
                  min="0"
                  max={ticket.remaining_quantity}
                  value={quantities[ticket.id]}
                  onChange={(e) =>
                    handleQuantityChange(ticket.id, e.target.value)
                  }
                  className="text-right"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Subtotal</span>
            <span>${calculateSubtotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </CardContent>

      <CardFooter className="flex-col">
        <Button
          className="w-full"
          disabled={!hasSelectedTickets || isProcessing}
          onClick={handlePurchase}
        >
          {isProcessing ? "Processing..." : "Purchase Tickets"}
        </Button>

        {/* Debug toggle */}
        <div className="w-full mt-4">
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
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
              {debug.messages.map((msg, i) => (
                <div key={i} className="mb-1">
                  {msg}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
