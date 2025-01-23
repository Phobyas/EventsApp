"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
}

interface SearchBoxProps {
  onLocationSelect: (lng: number, lat: number, address: string) => void;
}

export function SearchBox({ onLocationSelect }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const searchLocations = async () => {
      if (query.length < 3) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&types=address,place`
        );
        const data = await response.json();
        setResults(data.features);
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchLocations, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search for a location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-10"
          />
          {isLoading ? (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {results.map((result) => (
              <li
                key={result.id}
                className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                onClick={() => {
                  onLocationSelect(result.center[0], result.center[1], result.place_name);
                  setQuery(result.place_name);
                  setIsOpen(false);
                }}
              >
                {result.place_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}