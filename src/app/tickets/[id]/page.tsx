"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
  const ticketRef = useRef<HTMLDivElement>(null);

  const addDebugMessage = (message: string) => {
    setDebug((prev) => ({
      ...prev,
      messages: [...prev.messages, `${new Date().toISOString()}: ${message}`],
    }));
    console.log(`[TicketDetail Debug] ${message}`);
  };

  // Replace the handleDownloadPDF function with this improved version

  const handleDownloadPDF = async () => {
    if (!ticket) return;

    try {
      // Create loading state
      const downloadButton = document.getElementById("download-button");
      if (downloadButton) {
        downloadButton.innerHTML =
          '<span class="animate-spin inline-block mr-2">↻</span> Generating PDF...';
        downloadButton.setAttribute("disabled", "true");
      }

      // Create the PDF document (A4 size)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Set up constants for positioning
      const pageWidth = 210; // A4 width in mm
      const leftMargin = 15;
      const rightMargin = pageWidth - 15;
      const topMargin = 15;
      let yPosition = topMargin;

      // Add title with logo
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(24);
      pdf.setTextColor(65, 105, 225); // Blue color for title
      pdf.text("EVENT TICKET", leftMargin, yPosition);
      yPosition += 15;

      // Event details section
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text(ticket.event.title, leftMargin, yPosition);
      yPosition += 10;

      // Date and time
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.setTextColor(80, 80, 80);
      const dateText = `Date: ${new Date(ticket.event.date).toLocaleDateString()}`;
      const timeText = ticket.event.time
        ? `Time: ${ticket.event.time}`
        : "Time: Not specified";
      pdf.text(dateText, leftMargin, yPosition);
      yPosition += 6;
      pdf.text(timeText, leftMargin, yPosition);
      yPosition += 10;

      // Location
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Location:", leftMargin, yPosition);
      yPosition += 6;

      pdf.setFont("helvetica", "normal");
      pdf.text(ticket.event.location.address, leftMargin, yPosition);
      yPosition += 6;

      const locationText = `${ticket.event.location.city}, ${ticket.event.location.country}`;
      pdf.text(locationText, leftMargin, yPosition);
      yPosition += 6;

      if (ticket.event.location.postalCode) {
        pdf.text(
          `Postal Code: ${ticket.event.location.postalCode}`,
          leftMargin,
          yPosition
        );
        yPosition += 6;
      }

      if (ticket.event.location.buildingDetails) {
        pdf.text(
          `Building Details: ${ticket.event.location.buildingDetails}`,
          leftMargin,
          yPosition
        );
        yPosition += 6;
      }

      yPosition += 10;

      // Add a divider line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(leftMargin, yPosition, rightMargin, yPosition);
      yPosition += 10;

      // Ticket details section
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Ticket Information", leftMargin, yPosition);
      yPosition += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);

      // Ticket type
      pdf.setFont("helvetica", "bold");
      pdf.text("Ticket Type:", leftMargin, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        ticket.ticket_types?.name || "General Admission",
        leftMargin + 30,
        yPosition
      );
      yPosition += 6;

      // Ticket price
      pdf.setFont("helvetica", "bold");
      pdf.text("Price:", leftMargin, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `$${ticket.ticket_types?.price.toFixed(2) || "0.00"}`,
        leftMargin + 30,
        yPosition
      );
      yPosition += 6;

      // Order ID
      pdf.setFont("helvetica", "bold");
      pdf.text("Order ID:", leftMargin, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(ticket.order_id, leftMargin + 30, yPosition);
      yPosition += 6;

      // Ticket ID
      pdf.setFont("helvetica", "bold");
      pdf.text("Ticket ID:", leftMargin, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(ticket.id, leftMargin + 30, yPosition);
      yPosition += 6;

      // Purchase date
      pdf.setFont("helvetica", "bold");
      pdf.text("Purchase Date:", leftMargin, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        new Date(ticket.created_at).toLocaleDateString(),
        leftMargin + 30,
        yPosition
      );
      yPosition += 6;

      // Ticket status
      pdf.setFont("helvetica", "bold");
      pdf.text("Status:", leftMargin, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(ticket.used ? "Used" : "Active", leftMargin + 30, yPosition);
      yPosition += 15;

      // Add QR code - This is the most reliable method
      try {
        // Find the QR code container
        const qrCodeContainer = document.querySelector(
          ".bg-white.p-4.border-2.border-gray-200.rounded-md"
        );

        if (qrCodeContainer) {
          addDebugMessage("QR code container found");

          // Capture QR code as image
          const canvas = await html2canvas(qrCodeContainer, {
            scale: 4, // High resolution
            backgroundColor: "#ffffff",
            logging: false,
          });

          addDebugMessage("QR code captured to canvas");

          // Convert to data URL
          const qrDataUrl = canvas.toDataURL("image/png");

          // Center the QR code
          const qrWidth = 70; // mm - larger size for better scanning
          const qrHeight = 70; // mm
          const qrX = (pageWidth - qrWidth) / 2;

          // Add QR Code to PDF
          pdf.addImage(qrDataUrl, "PNG", qrX, yPosition, qrWidth, qrHeight);
          yPosition += qrHeight + 5;

          // Add QR code text
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          pdf.text(
            "Scan QR code for ticket validation",
            pageWidth / 2,
            yPosition,
            { align: "center" }
          );
          yPosition += 10;

          addDebugMessage("QR code added to PDF");
        } else {
          addDebugMessage("QR code container not found");
          throw new Error("QR code container not found in the DOM");
        }
      } catch (qrError) {
        addDebugMessage(
          `Error capturing QR code: ${qrError instanceof Error ? qrError.message : String(qrError)}`
        );
        console.error("Error capturing QR code:", qrError);

        // Create a fallback QR code with text
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text("TICKET ID FOR VALIDATION:", pageWidth / 2, yPosition + 15, {
          align: "center",
        });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(14);
        pdf.text(ticket.id, pageWidth / 2, yPosition + 25, { align: "center" });
        yPosition += 35;
      }

      // Add footer with legal text
      yPosition = 270; // Near bottom of page
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        "This ticket is subject to the terms and conditions of the event organizer.",
        leftMargin,
        yPosition
      );
      pdf.text(
        `Generated on ${new Date().toLocaleString()}`,
        leftMargin,
        yPosition + 4
      );

      // Add ticket border
      pdf.setDrawColor(65, 105, 225); // Blue border
      pdf.setLineWidth(0.5);
      pdf.rect(5, 5, pageWidth - 10, 287); // A4 height is 297mm

      // Save the PDF
      pdf.save(`${ticket.event.title.replace(/\s+/g, "-")}-Ticket.pdf`);

      // Reset button state
      if (downloadButton) {
        downloadButton.innerHTML =
          '<svg class="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download Ticket';
        downloadButton.removeAttribute("disabled");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      addDebugMessage(
        `Error generating PDF: ${error instanceof Error ? error.message : String(error)}`
      );
      alert("Failed to generate PDF. Please try again.");

      // Reset button state on error
      const downloadButton = document.getElementById("download-button");
      if (downloadButton) {
        downloadButton.innerHTML =
          '<svg class="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download Ticket';
        downloadButton.removeAttribute("disabled");
      }
    }
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
          <Card ref={ticketRef}>
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
                  <QRCode
                    value={`${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/ticket-validation/${ticket.id}`}
                    size={192}
                    level="H"
                    className="mx-auto"
                  />
                </div>
                <p className="text-sm text-center text-gray-500">
                  Present this QR code at the event entrance
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex-col space-y-3">
              <Button
                id="download-button"
                className="w-full"
                variant="outline"
                onClick={handleDownloadPDF}
              >
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
