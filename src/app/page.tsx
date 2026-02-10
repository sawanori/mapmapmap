'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { DEFAULT_LAT, DEFAULT_LNG } from '@/lib/constants';
import SearchBar from '@/components/SearchBar';
import SpotCard from '@/components/SpotCard';
import SortToggle from '@/components/SortToggle';
import type { SearchResult, UserLocation, SortBy } from '@/types/spot';

const ERROR_TOAST_DURATION_MS = 5000;

const MapView = dynamic(() => import('@/components/Map'), { ssr: false });

export default function Home() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<SearchResult | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    isDefault: true,
  });
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          isDefault: false,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          navigator.geolocation.clearWatch(watchId);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => {
      navigator.geolocation?.clearWatch(watchId);
    };
  }, []);

  // Auto-dismiss error toast
  useEffect(() => {
    if (errorMessage) {
      // Clear any existing timer
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      errorTimerRef.current = setTimeout(() => {
        setErrorMessage(null);
        errorTimerRef.current = null;
      }, ERROR_TOAST_DURATION_MS);
    }

    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, [errorMessage]);

  const handleResults = useCallback((results: SearchResult[]) => {
    setSearchResults(results);
    setSelectedSpot(null);
    setErrorMessage(null);
    setNoResults(results.length === 0);
  }, []);

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const sortedResults = useMemo(() => {
    if (searchResults.length === 0) return [];
    const sorted = [...searchResults];
    if (sortBy === 'distance') {
      sorted.sort((a, b) => a.distance - b.distance);
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => {
        if (a.rating == null && b.rating == null) return 0;
        if (a.rating == null) return 1;
        if (b.rating == null) return -1;
        return b.rating - a.rating;
      });
    }
    // 'relevance' = server order (vectorDistance asc), no re-sort needed
    return sorted;
  }, [searchResults, sortBy]);

  const mapUserLocation = useMemo(
    () => userLocation.isDefault ? undefined : { lat: userLocation.lat, lng: userLocation.lng },
    [userLocation.lat, userLocation.lng, userLocation.isDefault]
  );

  return (
    <main className="relative w-screen h-dvh overflow-hidden">
      <MapView
        initialCenter={{ lat: DEFAULT_LAT, lng: DEFAULT_LNG }}
        userLocation={mapUserLocation}
        searchResults={sortedResults}
        selectedSpot={selectedSpot}
        onSpotSelect={setSelectedSpot}
      />
      <SearchBar
        userLocation={{ lat: userLocation.lat, lng: userLocation.lng }}
        onResults={handleResults}
        onError={handleError}
      />
      {sortedResults.length > 0 && (
        <SortToggle sortBy={sortBy} onSortChange={setSortBy} />
      )}
      <SpotCard
        spot={selectedSpot}
        onClose={() => setSelectedSpot(null)}
      />
      {errorMessage && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 text-red-700 px-4 py-2 rounded-lg shadow text-sm max-w-sm text-center animate-fade-in"
        >
          {errorMessage}
        </div>
      )}
      {noResults && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-white/90 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg text-center">
          <p className="text-gray-600 text-sm">近くにスポットが見つかりませんでした</p>
          <p className="text-gray-400 text-xs mt-1">別のキーワードや場所で試してみてください</p>
        </div>
      )}
    </main>
  );
}
