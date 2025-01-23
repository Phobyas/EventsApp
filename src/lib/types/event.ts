export interface Event {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  date: string;
  time: string | null;
  location: {
    address: string;
    city: string;
    country: string;
    postalCode?: string;
    buildingDetails?: string;
    latitude: number;
    longitude: number;
    accessInstructions?: string;
  };
  created_at: string;
  updated_at: string;
}

export type NewEvent = Omit<
  Event,
  "id" | "user_id" | "created_at" | "updated_at"
>;
