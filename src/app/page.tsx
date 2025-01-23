import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { MapController } from "@/components/maps/MapController";

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: events } = await supabase.from("events").select("*");

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-6">
            Discover Amazing Events Near You
          </h1>
          <p className="text-xl mb-8">
            Find and book tickets for the best local events, conferences, and
            meetups.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8">
          <div className="h-[600px]">
            <MapController
              locations={
                events?.map((event) => ({
                  id: event.id,
                  name: event.title,
                  latitude: event.location.latitude,
                  longitude: event.location.longitude,
                  address: event.location.address,
                })) || []
              }
              interactive={false}
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-6">Events Near You</h2>
            <div className="space-y-4">
              {events?.slice(0, 5).map((event) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-sm text-gray-600">
                    {event.location.address}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
