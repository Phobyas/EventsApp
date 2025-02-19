import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientComponentClient } from "@supabase/supabase-js";
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
  const router = useRouter();
  const supabase = createClientComponentClient();

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
    // You could add service fee calculation here
    return subtotal;
  };

  const generateTicketId = () => {
    return "TKT-" + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const handlePurchase = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Check authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }

      // Start database transaction
      const purchaseTickets = ticketTypes.flatMap((ticket) => {
        const quantity = quantities[ticket.id] || 0;
        if (quantity === 0) return [];

        return Array(quantity)
          .fill(null)
          .map(() => ({
            ticket_id: generateTicketId(),
            event_id: eventId,
            ticket_type_id: ticket.id,
            user_id: session.user.id,
            purchase_date: new Date().toISOString(),
            status: "active",
            price_paid: ticket.price,
          }));
      });

      if (purchaseTickets.length === 0) {
        setError("Please select at least one ticket");
        return;
      }

      // Insert ticket purchases
      const { error: purchaseError } = await supabase
        .from("tickets")
        .insert(purchaseTickets);

      if (purchaseError) throw purchaseError;

      // Update remaining quantities
      for (const ticket of ticketTypes) {
        const quantityPurchased = quantities[ticket.id] || 0;
        if (quantityPurchased > 0) {
          const { error: updateError } = await supabase
            .from("ticket_types")
            .update({
              remaining_quantity: ticket.remaining_quantity - quantityPurchased,
            })
            .eq("id", ticket.id);

          if (updateError) throw updateError;
        }
      }

      // Reset form and notify completion
      setQuantities(Object.fromEntries(ticketTypes.map((t) => [t.id, 0])));
      onPurchaseComplete?.();
      router.push("/tickets");
    } catch (err) {
      console.error("Purchase error:", err);
      setError("Failed to complete purchase. Please try again.");
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
          {/* Add service fees here if needed */}
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </CardContent>

      <CardFooter className="bg-gray-50">
        <Button
          className="w-full"
          disabled={!hasSelectedTickets || isProcessing}
          onClick={handlePurchase}
        >
          {isProcessing ? "Processing..." : "Purchase Tickets"}
        </Button>
      </CardFooter>
    </Card>
  );
}
