import { supabase } from "@/lib/supabase/config";

export const profileService = {
  createProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .insert([
        {
          id: userId,
          username: `user_${userId.slice(0, 8)}`, // Create a default username
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
