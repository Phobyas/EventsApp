import { supabase } from "../utils/supabase-instance";

export const auth = {
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
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

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
};
