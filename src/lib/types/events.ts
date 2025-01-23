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
};
