"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";
import { MapController } from "@/components/maps/MapController";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  location: z.object({
    address: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    country: z.string().min(1, "Country is required"),
    postalCode: z.string().optional(),
    buildingDetails: z.string().optional(),
    latitude: z.number(),
    longitude: z.number(),
    accessInstructions: z.string().optional(),
  }),
  ticketTypes: z
    .array(
      z.object({
        name: z.string().min(1, "Ticket name is required"),
        description: z.string().optional(),
        price: z.number().min(0, "Price must be 0 or greater"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
      })
    )
    .min(1, "At least one ticket type is required"),
});

type EventFormData = z.infer<typeof eventSchema>;

interface TicketType {
  name: string;
  description: string;
  price: number;
  quantity: number;
}

export function EventForm() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    visible: boolean;
    messages: string[];
  }>({
    visible: false,
    messages: [],
  });
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      ticketTypes: [{ name: "", description: "", price: 0, quantity: 1 }],
    },
  });

  const addDebugMessage = (message: string) => {
    setDebugInfo((prev) => ({
      ...prev,
      messages: [...prev.messages, `${new Date().toISOString()}: ${message}`],
    }));
    console.log(`[EventForm Debug] ${message}`);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        addDebugMessage("Fetching categories");
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (error) {
          addDebugMessage(`Error fetching categories: ${error.message}`);
          return;
        }

        if (data) {
          setCategories(data);
          addDebugMessage(`Loaded ${data.length} categories`);
        }
      } catch (err) {
        addDebugMessage(
          `Exception fetching categories: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    };

    fetchCategories();
  }, []);

  const addTicketType = () => {
    const currentTickets = watch("ticketTypes") || [];
    setValue("ticketTypes", [
      ...currentTickets,
      { name: "", description: "", price: 0, quantity: 1 },
    ]);
  };

  const removeTicketType = (index: number) => {
    const currentTickets = watch("ticketTypes") || [];
    if (currentTickets.length > 1) {
      setValue(
        "ticketTypes",
        currentTickets.filter((_, i) => i !== index)
      );
    }
  };

  const onSubmit = async (data: EventFormData) => {
    addDebugMessage("Form submission started");
    addDebugMessage(
      `Form data: ${JSON.stringify({
        title: data.title,
        category: data.category,
        ticketCount: data.ticketTypes.length,
      })}`
    );

    try {
      setIsSubmitting(true);

      // Check authentication
      addDebugMessage("Checking authentication");
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        addDebugMessage(`Authentication error: ${sessionError.message}`);
        throw new Error(`Authentication failed: ${sessionError.message}`);
      }

      if (!sessionData?.session?.user?.id) {
        addDebugMessage("No authenticated user found");
        throw new Error("Not authenticated");
      }

      const userId = sessionData.session.user.id;
      addDebugMessage(`User authenticated: ${userId}`);

      // Check if profile exists, if not create it
      addDebugMessage("Checking user profile");
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select()
        .eq("id", userId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        // Not found error
        addDebugMessage(`Profile check error: ${profileError.message}`);
        throw profileError;
      }

      if (!existingProfile) {
        addDebugMessage("Creating user profile");
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert([{ id: userId }]);

        if (createProfileError) {
          addDebugMessage(
            `Profile creation error: ${createProfileError.message}`
          );
          throw createProfileError;
        }
      }

      // Prepare event data
      addDebugMessage("Preparing event data");
      const eventData = {
        title: data.title,
        description: data.description || "",
        date: data.date,
        time: data.time || null,
        category_id: data.category,
        location: {
          address: data.location.address,
          city: data.location.city,
          country: data.location.country,
          postalCode: data.location.postalCode || "",
          buildingDetails: data.location.buildingDetails || "",
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          accessInstructions: data.location.accessInstructions || "",
        },
        user_id: userId,
      };

      addDebugMessage(
        `Event data prepared: ${JSON.stringify({
          title: eventData.title,
          date: eventData.date,
          category_id: eventData.category_id,
        })}`
      );

      // Create event
      addDebugMessage("Creating event in database");
      const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert([eventData])
        .select()
        .single();

      if (eventError) {
        addDebugMessage(`Event creation error: ${eventError.message}`);
        throw eventError;
      }

      if (!newEvent || !newEvent.id) {
        addDebugMessage("Event created but no ID returned");
        throw new Error("Failed to get created event ID");
      }

      addDebugMessage(`Event created with ID: ${newEvent.id}`);

      // Create ticket types
      addDebugMessage(`Creating ${data.ticketTypes.length} ticket types`);
      const ticketTypePromises = data.ticketTypes.map((ticket, index) => {
        addDebugMessage(`Preparing ticket type ${index + 1}: ${ticket.name}`);
        return supabase.from("ticket_types").insert({
          event_id: newEvent.id,
          name: ticket.name,
          description: ticket.description || "",
          price: ticket.price,
          quantity: ticket.quantity, // Use 'quantity' as in your schema
          remaining_quantity: ticket.quantity,
        });
      });

      const ticketResults = await Promise.all(ticketTypePromises);

      // Check for ticket creation errors
      const ticketErrors = ticketResults
        .map((result, index) =>
          result.error
            ? `Ticket ${index + 1} (${data.ticketTypes[index].name}): ${result.error.message}`
            : null
        )
        .filter((error) => error !== null);

      if (ticketErrors.length > 0) {
        addDebugMessage(`Errors creating tickets: ${ticketErrors.join("; ")}`);
        throw new Error(
          `Failed to create some ticket types: ${ticketErrors.join("; ")}`
        );
      }

      addDebugMessage("All ticket types created successfully");
      addDebugMessage("Event creation completed successfully");

      // Success - redirect
      alert("Event created successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error submitting form:", error);
      addDebugMessage(
        `Submission error: ${error instanceof Error ? error.message : String(error)}`
      );

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      alert(`Error creating event: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSelect = async (location: {
    lat: number;
    lng: number;
    address?: string;
  }) => {
    setSelectedLocation(location);
    setValue("location.latitude", location.lat);
    setValue("location.longitude", location.lng);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&types=address,place`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const context = feature.context || [];
        const streetAddress = feature.text || "";
        const houseNumber = feature.address || "";
        const city =
          context.find((c: any) => c.id.includes("place"))?.text || "";
        const country =
          context.find((c: any) => c.id.includes("country"))?.text || "";
        const postcode =
          context.find((c: any) => c.id.includes("postcode"))?.text || "";

        setValue(
          "location.address",
          houseNumber ? `${houseNumber} ${streetAddress}` : streetAddress
        );
        setValue("location.city", city);
        setValue("location.country", country);
        setValue("location.postalCode", postcode);
      }
    } catch (error) {
      console.error("Error fetching address details:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Event Details Section */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Event Title
                </label>
                <Input
                  placeholder="Event Title"
                  {...register("title")}
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Category
                </label>
                <select
                  {...register("category")}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Textarea
                  placeholder="Event Description"
                  {...register("description")}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <Input type="date" {...register("date")} />
                  {errors.date && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.date.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <Input type="time" {...register("time")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Details Section */}
          <Card>
            <CardHeader>
              <CardTitle>Location Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Street Address
                </label>
                <Input
                  {...register("location.address")}
                  placeholder="Street address"
                  className={errors.location?.address ? "border-red-500" : ""}
                />
                {errors.location?.address && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.location.address.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <Input
                    {...register("location.city")}
                    placeholder="City"
                    className={errors.location?.city ? "border-red-500" : ""}
                  />
                  {errors.location?.city && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.location.city.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Postal Code
                  </label>
                  <Input
                    {...register("location.postalCode")}
                    placeholder="Postal code"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Country
                </label>
                <Input
                  {...register("location.country")}
                  placeholder="Country"
                  className={errors.location?.country ? "border-red-500" : ""}
                />
                {errors.location?.country && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.location.country.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Building Details (Optional)
                </label>
                <Input
                  {...register("location.buildingDetails")}
                  placeholder="Floor, Suite, Building name, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Access Instructions (Optional)
                </label>
                <Textarea
                  {...register("location.accessInstructions")}
                  placeholder="Instructions for finding the location, parking details, etc."
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Ticket Types Section */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Types</CardTitle>
              <CardDescription>
                Create at least one ticket type for your event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {watch("ticketTypes")?.map((_, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Ticket Type {index + 1}</h4>
                    {watch("ticketTypes").length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTicketType(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Input
                      placeholder="Ticket Name"
                      {...register(`ticketTypes.${index}.name`)}
                      className={
                        errors.ticketTypes?.[index]?.name
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {errors.ticketTypes?.[index]?.name && (
                      <p className="text-red-500 text-sm">
                        {errors.ticketTypes[index]?.name?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Ticket Description"
                      {...register(`ticketTypes.${index}.description`)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        {...register(`ticketTypes.${index}.price`, {
                          valueAsNumber: true,
                        })}
                        className={
                          errors.ticketTypes?.[index]?.price
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {errors.ticketTypes?.[index]?.price && (
                        <p className="text-red-500 text-sm">
                          {errors.ticketTypes[index]?.price?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        {...register(`ticketTypes.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        className={
                          errors.ticketTypes?.[index]?.quantity
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {errors.ticketTypes?.[index]?.quantity && (
                        <p className="text-red-500 text-sm">
                          {errors.ticketTypes[index]?.quantity?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addTicketType}
                className="w-full"
              >
                Add Ticket Type
              </Button>
            </CardContent>
            <CardFooter className="flex-col items-start">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating..." : "Create Event"}
              </Button>

              {/* Debug toggle */}
              <div className="w-full mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDebugInfo((prev) => ({
                      ...prev,
                      visible: !prev.visible,
                    }))
                  }
                  className="text-xs"
                >
                  {debugInfo.visible ? "Hide Debug Info" : "Show Debug Info"}
                </Button>

                {debugInfo.visible && debugInfo.messages.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
                    {debugInfo.messages.map((msg, i) => (
                      <div key={i} className="mb-1">
                        {msg}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column - Map Section */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Select Location on Map</CardTitle>
              <CardDescription>
                Search for a location or click on the map to set the event
                location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <MapController
                  onLocationSelect={handleLocationSelect}
                  locations={
                    selectedLocation
                      ? [
                          {
                            id: "new",
                            name: "Selected Location",
                            latitude: selectedLocation.lat,
                            longitude: selectedLocation.lng,
                            address: selectedLocation.address,
                          },
                        ]
                      : []
                  }
                  interactive={true}
                />
              </div>
              {errors.location && !selectedLocation && (
                <p className="text-red-500 text-sm mt-2">
                  Please select a location on the map
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
