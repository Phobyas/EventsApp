export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Itinerary = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string | null; // dates are returned as ISO strings
  end_date: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type Location = {
  id: string;
  itinerary_id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  day_number: number | null;
  order_index: number | null;
  created_at: string;
};

// Response types for Supabase
export type DatabaseResponseOk<T> = {
  data: T;
  error: null;
};

export type DatabaseResponseError = {
  data: null;
  error: {
    message: string;
    code: string;
  };
};

export type DatabaseResponse<T> = DatabaseResponseOk<T> | DatabaseResponseError;

// Helper type for creating new records
export type NewProfile = Omit<Profile, "id" | "created_at" | "updated_at">;
export type NewItinerary = Omit<Itinerary, "id" | "created_at" | "updated_at">;
export type NewLocation = Omit<Location, "id" | "created_at">;

// Helper type for updating records
export type UpdateProfile = Partial<NewProfile>;
export type UpdateItinerary = Partial<NewItinerary>;
export type UpdateLocation = Partial<NewLocation>;
