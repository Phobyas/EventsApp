import { supabaseClient } from "../utils/supabase-client";

export const auth = {
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return {
        session: data.session,
        user: data.user,
        error: null,
      };
    } catch (error) {
      return { error, session: null, user: null };
    }
  },
};
