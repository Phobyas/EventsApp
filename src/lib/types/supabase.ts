import { createClient } from "@supabase/supabase-js";
import {
  Profile,
  Itinerary,
  Location,
  DatabaseResponse,
  NewProfile,
  NewItinerary,
  NewLocation,
  UpdateProfile,
  UpdateItinerary,
  UpdateLocation,
} from "./database";

// Define a basic Database interface
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: NewProfile;
        Update: UpdateProfile;
      };
      itineraries: {
        Row: Itinerary;
        Insert: NewItinerary;
        Update: UpdateItinerary;
      };
      locations: {
        Row: Location;
        Insert: NewLocation;
        Update: UpdateLocation;
      };
    };
  };
}

export type TypedSupabaseClient = ReturnType<typeof createClient<Database>>;

export type {
  Profile,
  Itinerary,
  Location,
  DatabaseResponse,
  NewProfile,
  NewItinerary,
  NewLocation,
  UpdateProfile,
  UpdateItinerary,
  UpdateLocation,
} from "./database";
