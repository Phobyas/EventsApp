"use client";

import React, { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "../ui/card";
import {
  TicketIcon,
  CreditCard,
  User,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ShoppingCart,
} from "lucide-react";

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  remaining_quantity: number;
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  ticketTypes: TicketType[];
  onPurchaseComplete?: () => void;
}

// Purchase steps
enum PurchaseStep {
  SELECT_TICKETS = 0,
  PERSONAL_INFO = 1,
  PAYMENT = 2,
  CONFIRMATION = 3,
}

export function TicketPurchaseModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  ticketTypes,
  onPurchaseComplete,
}: PurchaseModalProps) {
  const [currentStep, setCurrentStep] = useState<PurchaseStep>(
    PurchaseStep.SELECT_TICKETS
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(ticketTypes.map((t) => [t.id, 0]))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<{ visible: boolean; messages: string[] }>({
    visible: false,
    messages: [],
  });

  // Personal information
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    specialRequirements: "",
  });

  // Payment information
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
    paymentMethod: "credit-card",
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
    // Add a service fee (5%)
    const serviceFee = subtotal * 0.05;
    return subtotal + serviceFee;
  };

  const calculateServiceFee = () => {
    return calculateSubtotal() * 0.05;
  };

  const generateTicketId = () => {
    return "TKT-" + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const nextStep = () => {
    if (currentStep === PurchaseStep.SELECT_TICKETS && !hasSelectedTickets) {
      setError("Please select at least one ticket");
      return;
    }

    if (currentStep === PurchaseStep.PERSONAL_INFO) {
      // Validate personal info
      if (!personalInfo.fullName || !personalInfo.email) {
        setError("Please provide your name and email");
        return;
      }

      if (!isValidEmail(personalInfo.email)) {
        setError("Please provide a valid email address");
        return;
      }
    }

    if (currentStep === PurchaseStep.PAYMENT) {
      // Validate payment info for demo (simple validation)
      if (paymentInfo.paymentMethod === "credit-card") {
        if (
          !paymentInfo.cardNumber ||
          !paymentInfo.cardHolder ||
          !paymentInfo.expiryDate ||
          !paymentInfo.cvv
        ) {
          setError("Please fill in all payment fields");
          return;
        }

        if (paymentInfo.cardNumber.replace(/\s/g, "").length !== 16) {
          setError("Please enter a valid 16-digit card number");
          return;
        }

        if (paymentInfo.cvv.length < 3) {
          setError("Please enter a valid CVV");
          return;
        }
      }
    }

    setError(null);
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep((prev) => prev - 1);
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleCardNumberChange = (value: string) => {
    // Format credit card with spaces every 4 digits
    const formatted = value
      .replace(/\s/g, "")
      .substring(0, 16)
      .replace(/(\d{4})/g, "$1 ")
      .trim();

    setPaymentInfo((prev) => ({
      ...prev,
      cardNumber: formatted,
    }));
  };

  const handleExpiryDateChange = (value: string) => {
    // Format expiry date as MM/YY
    const cleaned = value.replace(/\D/g, "");
    let formatted = cleaned;

    if (cleaned.length > 2) {
      formatted = `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }

    setPaymentInfo((prev) => ({
      ...prev,
      expiryDate: formatted,
    }));
  };

  const handlePurchase = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      addDebugMessage("Starting ticket purchase process");

      // Check authentication
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();
      if (authError) {
        addDebugMessage(`Auth error: ${authError.message}`);
        throw authError;
      }

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

      // Simulate payment processing
      addDebugMessage("Processing payment...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate payment processing

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

        // Create individual tickets for this order
        for (let i = 0; i < quantity; i++) {
          // Create tickets one by one
          const { error: ticketError } = await supabase.from("tickets").insert({
            order_id: orderData.id,
            ticket_type_id: ticket.id,
            user_id: session.user.id,
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
          // Continue anyway since order was created
        }
      }

      addDebugMessage("All tickets created successfully");

      // Reset form and notify completion
      setQuantities(Object.fromEntries(ticketTypes.map((t) => [t.id, 0])));
      onPurchaseComplete?.();

      addDebugMessage("Purchase completed successfully");

      // Move to confirmation step
      setCurrentStep(PurchaseStep.CONFIRMATION);
    } catch (err) {
      console.error("Purchase error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      addDebugMessage(`Purchase error: ${errorMessage}`);
      setError(`Failed to complete purchase: ${errorMessage}`);
      setCurrentStep(PurchaseStep.PAYMENT); // Go back to payment step on error
    } finally {
      setIsProcessing(false);
    }
  };

  const hasSelectedTickets = Object.values(quantities).some((q) => q > 0);
  const totalItems = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  const handleClose = () => {
    if (!isProcessing) {
      setCurrentStep(PurchaseStep.SELECT_TICKETS);
      setError(null);
      onClose();
    }
  };

  const handleViewTickets = () => {
    handleClose();
    router.push("/dashboard?tab=tickets");
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case PurchaseStep.SELECT_TICKETS:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Select Tickets</DialogTitle>
              <DialogDescription>
                {eventTitle} - Select the tickets you want to purchase
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {ticketTypes.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex justify-between items-start p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{ticket.name}</h4>
                    {ticket.description && (
                      <p className="text-sm text-gray-600">
                        {ticket.description}
                      </p>
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
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Service Fee (5%)</span>
                <span>${calculateServiceFee().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={nextStep} disabled={!hasSelectedTickets}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        );

      case PurchaseStep.PERSONAL_INFO:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Personal Information</DialogTitle>
              <DialogDescription>
                Please provide your details for the tickets
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={personalInfo.fullName}
                  onChange={(e) =>
                    setPersonalInfo({
                      ...personalInfo,
                      fullName: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={personalInfo.email}
                  onChange={(e) =>
                    setPersonalInfo({ ...personalInfo, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  placeholder="Enter your phone number"
                  value={personalInfo.phone}
                  onChange={(e) =>
                    setPersonalInfo({ ...personalInfo, phone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRequirements">
                  Special Requirements (Optional)
                </Label>
                <Textarea
                  id="specialRequirements"
                  placeholder="Any special requirements or accessibility needs?"
                  value={personalInfo.specialRequirements}
                  onChange={(e) =>
                    setPersonalInfo({
                      ...personalInfo,
                      specialRequirements: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">
                Purchasing {totalItems}{" "}
                {totalItems === 1 ? "ticket" : "tickets"} • Total: $
                {calculateTotal().toFixed(2)}
              </p>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        );

      case PurchaseStep.PAYMENT:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>
                Enter your payment information
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <RadioGroup
                value={paymentInfo.paymentMethod}
                onValueChange={(value) =>
                  setPaymentInfo({ ...paymentInfo, paymentMethod: value })
                }
                className="flex gap-4 mb-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit-card" id="credit-card" />
                  <Label htmlFor="credit-card" className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Credit Card
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal">PayPal</Label>
                </div>
              </RadioGroup>

              {paymentInfo.paymentMethod === "credit-card" && (
                <div className="space-y-4 border p-4 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={paymentInfo.cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardHolder">Cardholder Name</Label>
                    <Input
                      id="cardHolder"
                      placeholder="Enter cardholder name"
                      value={paymentInfo.cardHolder}
                      onChange={(e) =>
                        setPaymentInfo({
                          ...paymentInfo,
                          cardHolder: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        placeholder="MM/YY"
                        value={paymentInfo.expiryDate}
                        onChange={(e) => handleExpiryDateChange(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        type="password"
                        placeholder="123"
                        maxLength={4}
                        value={paymentInfo.cvv}
                        onChange={(e) =>
                          setPaymentInfo({
                            ...paymentInfo,
                            cvv: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentInfo.paymentMethod === "paypal" && (
                <div className="border p-4 rounded-lg">
                  <p className="text-sm">
                    You will be redirected to PayPal to complete your payment
                    after clicking "Complete Purchase".
                  </p>
                  <p className="text-sm mt-2">
                    For demo purposes, this will be simulated without actual
                    redirection.
                  </p>
                </div>
              )}

              <div className="space-y-2 mt-4">
                <p className="text-sm font-medium">Order Summary:</p>
                <div className="border p-4 rounded-lg space-y-2">
                  {ticketTypes
                    .filter((ticket) => quantities[ticket.id] > 0)
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          {ticket.name} × {quantities[ticket.id]}
                        </span>
                        <span>
                          ${(ticket.price * quantities[ticket.id]).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Service Fee</span>
                      <span>${calculateServiceFee().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium mt-1">
                      <span>Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handlePurchase} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <span className="animate-spin mr-2">↻</span>
                    Processing...
                  </>
                ) : (
                  <>Complete Purchase</>
                )}
              </Button>
            </DialogFooter>
          </>
        );

      case PurchaseStep.CONFIRMATION:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center text-green-600">
                <CheckCircle2 className="h-6 w-6 mr-2" />
                Purchase Successful!
              </DialogTitle>
              <DialogDescription>
                Your tickets have been purchased successfully
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center">
              <div className="mx-auto bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mb-4">
                <TicketIcon className="h-10 w-10 text-green-600" />
              </div>

              <h3 className="text-xl font-medium mb-2">
                Thank You for Your Purchase!
              </h3>
              <p className="text-gray-600 mb-4">
                Your tickets have been added to your account. You can view and
                download them from your dashboard.
              </p>

              <div className="border rounded-lg p-4 bg-gray-50 mx-auto max-w-xs mb-6">
                <div className="text-left space-y-2">
                  <p className="flex justify-between">
                    <span className="text-gray-600">Event:</span>
                    <span className="font-medium">{eventTitle}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Tickets:</span>
                    <span className="font-medium">{totalItems}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                A confirmation email has been sent to {personalInfo.email}
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleViewTickets}>View My Tickets</Button>
            </DialogFooter>
          </>
        );
    }
  };

  // Progress indicators
  const steps = [
    { name: "Tickets", icon: <ShoppingCart className="h-4 w-4" /> },
    { name: "Details", icon: <User className="h-4 w-4" /> },
    { name: "Payment", icon: <CreditCard className="h-4 w-4" /> },
    { name: "Done", icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl">
        {/* Progress bar */}
        {currentStep < PurchaseStep.CONFIRMATION && (
          <div className="mb-6">
            <div className="flex justify-between">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center ${
                    i === currentStep
                      ? "text-blue-600"
                      : i < currentStep
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                      i === currentStep
                        ? "bg-blue-100 border-2 border-blue-600"
                        : i < currentStep
                          ? "bg-green-100"
                          : "bg-gray-100"
                    }`}
                  >
                    {i < currentStep ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className="text-xs">{step.name}</span>
                </div>
              ))}
            </div>

            <div className="relative mt-2">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-full" />
              <div
                className="absolute top-0 left-0 h-1 bg-blue-600 rounded-full transition-all"
                style={{
                  width: `${(currentStep / (steps.length - 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Content based on current step */}
        {renderStepContent()}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-800 p-3 rounded-md flex items-start mt-4">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Debug toggle */}
        {debug.visible && debug.messages.length > 0 && (
          <div className="mt-4 border-t pt-2">
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
              {debug.messages.map((msg, i) => (
                <div key={i} className="mb-1">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
