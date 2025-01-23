import { supabase } from "@/lib/supabase/config";
import { type Event, type NewEvent } from "@/lib/types/event";

export const eventService = {
  createEvent: async (event: NewEvent, userId: string) => {
    const { data, error } = await supabase
      .from("events")
      .insert([
        {
          ...event,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getUserEvents: async (userId: string) => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (error) throw error;
    return data;
  },

  getEvent: async (eventId: string) => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error) throw error;
    return data;
  },

  updateEvent: async (eventId: string, event: Partial<Event>) => {
    const { data, error } = await supabase
      .from("events")
      .update({
        ...event,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteEvent: async (eventId: string) => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) throw error;
  },
};
