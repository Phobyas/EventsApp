"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface EventSearchProps {
  onSearch: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  query: string;
  location?: string;
  date?: Date;
  category?: string;
}

const categories = [
  "Music",
  "Sports",
  "Arts",
  "Food",
  "Business",
  "Technology",
  "Other",
];

export function EventSearch({ onSearch }: EventSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    location: "",
  });
  const [date, setDate] = useState<Date>();

  const handleSearch = () => {
    onSearch({ ...filters, date });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search Query */}
        <div className="relative">
          <Input
            placeholder="Search events..."
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            className="pl-10"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        </div>

        {/* Location */}
        <div className="relative">
          <Input
            placeholder="Location"
            value={filters.location}
            onChange={(e) =>
              setFilters({ ...filters, location: e.target.value })
            }
            className="pl-10"
          />
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        </div>

        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-full justify-start text-left font-normal ${
                !date && "text-muted-foreground"
              }`}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Category Select */}
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Search Button */}
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSearch}>Search Events</Button>
      </div>
    </div>
  );
}
