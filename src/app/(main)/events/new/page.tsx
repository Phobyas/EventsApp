import { EventForm } from "@/components/forms/EventForm";

export default function NewEventPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Event</h1>
      <EventForm />
    </div>
  );
}
