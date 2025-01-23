"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";
import { MapController } from "@/components/maps/MapController";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/config";
import { eventService } from "@/lib/services/events";
import { profileService } from "@/lib/services/profile"; 
import { type NewEvent } from "@/lib/types/event";

const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
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
});

type EventFormData = z.infer<typeof eventSchema>;

export function EventForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  });

  const onSubmit = async (data: EventFormData) => {
    try {
      setIsSubmitting(true);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        throw new Error("Not authenticated");
      }

      // Check if profile exists, if not create it
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select()
        .eq("id", session.session.user.id)
        .single();

      if (!existingProfile) {
        await profileService.createProfile(session.session.user.id);
      }

      const eventData: NewEvent = {
        title: data.title,
        description: data.description || "",
        date: data.date,
        time: data.time || null,
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
      };

      await eventService.createEvent(eventData, session.session.user.id);

      alert("Event created successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error submitting form:", error);
      alert(
        "Error creating event: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
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

        console.log("Location details:", {
          address: houseNumber
            ? `${houseNumber} ${streetAddress}`
            : streetAddress,
          city,
          country,
          postcode,
        });
      }
    } catch (error) {
      console.error("Error fetching address details:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Details Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Event Details</h2>

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

          {/* Location Details */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium">Location Details</h3>

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
              <label className="block text-sm font-medium mb-1">Country</label>
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
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full mt-6">
            {isSubmitting ? "Creating..." : "Create Event"}
          </Button>
        </div>

        {/* Map Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Select Location on Map</h2>
          <p className="text-sm text-gray-600 mb-4">
            Search for a location or click on the map to set the event location
          </p>
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
          />
          {errors.location && !selectedLocation && (
            <p className="text-red-500 text-sm">
              Please select a location on the map
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
