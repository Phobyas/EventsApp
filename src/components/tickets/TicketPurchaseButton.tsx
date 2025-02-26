"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { TicketPurchaseModal } from "./TicketPurchaseModal";
import { TicketIcon } from "lucide-react";

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  remaining_quantity: number;
}

interface TicketPurchaseButtonProps {
  eventId: string;
  eventTitle: string;
  ticketTypes: TicketType[];
  onPurchaseComplete?: () => void;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function TicketPurchaseButton({
  eventId,
  eventTitle,
  ticketTypes,
  onPurchaseComplete,
  variant = "default",
  size = "default",
  className = "",
}: TicketPurchaseButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handlePurchaseComplete = () => {
    onPurchaseComplete?.();
  };

  const hasAvailableTickets = ticketTypes.some(
    (ticket) => ticket.remaining_quantity > 0
  );

  return (
    <>
      <Button
        onClick={openModal}
        variant={variant}
        size={size}
        className={className}
        disabled={!hasAvailableTickets}
      >
        <TicketIcon className="h-4 w-4 mr-2" />
        {hasAvailableTickets ? "Get Tickets" : "Sold Out"}
      </Button>

      <TicketPurchaseModal
        isOpen={isModalOpen}
        onClose={closeModal}
        eventId={eventId}
        eventTitle={eventTitle}
        ticketTypes={ticketTypes}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </>
  );
}
