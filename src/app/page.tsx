'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DEFAULT_LAT, DEFAULT_LNG } from '@/lib/constants';
import { useVibeStore } from '@/store/vibe-store';
import { openRoute } from '@/lib/route';
import MoodSelector from '@/components/MoodSelector';
import LocationPrompt from '@/components/LocationPrompt';
import StationSearch from '@/components/StationSearch';
import ResultsScreen from '@/components/ResultsScreen';
import PlaceDetail from '@/components/PlaceDetail';
import type { Mood, VibePlace, GeoStatus } from '@/types/vibe';

const LikedMap = dynamic(() => import('@/components/LikedMap'), { ssr: false });

type ViewMode = 'mood' | 'permission_gate' | 'station_search' | 'results' | 'detail' | 'likedMap';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('mood');
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [selectedPlace, setSelectedPlace] = useState<VibePlace | null>(null);

  const {
    currentMood,
    coords,
    filters,
    results,
    displayCount,
    isLoading,
    errorMessage,
    savedPlaceIds,
    setMood,
    setLocation,
    updateFilter,
    loadResults,
    loadMore,
    toggleSaved,
    reset,
  } = useVibeStore();

  // Mood selection → decide next screen
  const handleMoodSelect = useCallback(
    (mood: Mood) => {
      setMood(mood);
      if (geoStatus === 'granted' || geoStatus === 'denied' || geoStatus === 'unavailable') {
        // Already resolved → go to results directly
        setViewMode('results');
        // loadResults reads from store (coords already set)
        loadResults();
      } else {
        // idle → show permission gate
        setViewMode('permission_gate');
      }
    },
    [geoStatus, setMood, loadResults],
  );

  // Location resolved from permission gate
  const handleLocationResolved = useCallback(
    (lat: number, lng: number, status: GeoStatus) => {
      setGeoStatus(status);
      setLocation('geo', lat, lng);
      setViewMode('results');
      // Need to set coords before loadResults reads them
      useVibeStore.setState({
        locationMode: 'geo',
        coords: { lat, lng },
        isLoading: true,
      });
      loadResults();
    },
    [setLocation, loadResults],
  );

  // Station search callback
  const handleStationSearch = useCallback(() => {
    setViewMode('station_search');
  }, []);

  // Station search submitted
  const handleStationSubmit = useCallback(
    (lat: number, lng: number, _stationName: string) => {
      setGeoStatus('denied'); // Mark as resolved (non-geo)
      setLocation('station', lat, lng);
      setViewMode('results');
      useVibeStore.setState({
        locationMode: 'station',
        coords: { lat, lng },
        isLoading: true,
      });
      loadResults();
    },
    [setLocation, loadResults],
  );

  // Back from station search to permission gate
  const handleBackFromStation = useCallback(() => {
    setViewMode('permission_gate');
  }, []);

  // Filter change → reload results
  const handleFilterChange = useCallback(
    (partial: Partial<typeof filters>) => {
      updateFilter(partial);
      // loadResults will be called after filter update
      // We need to trigger it after state update
      setTimeout(() => {
        useVibeStore.getState().loadResults();
      }, 0);
    },
    [updateFilter],
  );

  // Place detail
  const handlePlaceSelect = useCallback((place: VibePlace) => {
    setSelectedPlace(place);
    setViewMode('detail');
  }, []);

  const handleBackFromDetail = useCallback(() => {
    setSelectedPlace(null);
    setViewMode('results');
  }, []);

  // Route start
  const handleStartRoute = useCallback(
    (place: VibePlace) => {
      const c = coords ?? { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
      openRoute(place, c.lat, c.lng);
    },
    [coords],
  );

  // Change mood
  const handleChangeMood = useCallback(() => {
    reset();
    setViewMode('mood');
  }, [reset]);

  // Saved places
  const savedPlaces = results.filter((p) => savedPlaceIds.includes(p.id));

  // Show liked map
  const handleShowLikedMap = useCallback(() => {
    setViewMode('likedMap');
  }, []);

  const handleBackFromMap = useCallback(() => {
    setViewMode('results');
  }, []);

  return (
    <main className="relative w-screen h-dvh overflow-hidden bg-gray-50">
      {/* Liked Map (fullscreen) */}
      {viewMode === 'likedMap' && (
        <LikedMap
          places={savedPlaces}
          userLat={coords?.lat ?? DEFAULT_LAT}
          userLng={coords?.lng ?? DEFAULT_LNG}
          showUserMarker={geoStatus === 'granted'}
          onBack={handleBackFromMap}
        />
      )}

      {/* Detail (fullscreen) */}
      {viewMode === 'detail' && selectedPlace && (
        <PlaceDetail
          place={selectedPlace}
          isSaved={savedPlaceIds.includes(selectedPlace.id)}
          onStartRoute={() => handleStartRoute(selectedPlace)}
          onToggleSaved={() => toggleSaved(selectedPlace.id)}
          onBack={handleBackFromDetail}
        />
      )}

      {/* Main content area */}
      {viewMode !== 'likedMap' && viewMode !== 'detail' && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 bg-gray-50/80 backdrop-blur-sm border-b border-gray-100">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                MAPMAPMAP!!!
              </h1>
              <p className="text-xs text-gray-500 -mt-0.5">
                {geoStatus === 'idle' && '気分に合ったスポットを見つけよう'}
                {geoStatus === 'loading' && '📍 位置情報を取得中...'}
                {geoStatus === 'granted' && coords && `📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
                {geoStatus === 'denied' && '📍 駅名検索 / デフォルト位置'}
                {geoStatus === 'unavailable' && '📍 デフォルト位置（みなとみらい）'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {currentMood && viewMode === 'results' && savedPlaceIds.length > 0 && (
                <button
                  onClick={handleShowLikedMap}
                  className="px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 rounded-full"
                  aria-label={`お気に入り${savedPlaceIds.length}件を地図で見る`}
                >
                  ♥ {savedPlaceIds.length}
                </button>
              )}
              {currentMood && viewMode !== 'results' && (
                <button
                  onClick={handleChangeMood}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white rounded-full border border-gray-200"
                  aria-label="ムードを変更"
                >
                  気分を変える
                </button>
              )}
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {/* Mood Selection */}
            {viewMode === 'mood' && (
              <div className="flex items-center justify-center h-full">
                <MoodSelector onSelect={handleMoodSelect} />
              </div>
            )}

            {/* Permission Gate */}
            {viewMode === 'permission_gate' && (
              <div className="flex items-center justify-center h-full">
                <LocationPrompt
                  onResolved={handleLocationResolved}
                  onStationSearch={handleStationSearch}
                  defaultLat={DEFAULT_LAT}
                  defaultLng={DEFAULT_LNG}
                />
              </div>
            )}

            {/* Station Search */}
            {viewMode === 'station_search' && (
              <div className="flex items-center justify-center h-full">
                <StationSearch
                  onSubmit={handleStationSubmit}
                  onBack={handleBackFromStation}
                />
              </div>
            )}

            {/* Results */}
            {viewMode === 'results' && currentMood && (
              <ResultsScreen
                results={results}
                displayCount={displayCount}
                mood={currentMood}
                filters={filters}
                savedPlaceIds={savedPlaceIds}
                isLoading={isLoading}
                errorMessage={errorMessage}
                onFilterChange={handleFilterChange}
                onPlaceSelect={handlePlaceSelect}
                onStartRoute={handleStartRoute}
                onToggleSaved={toggleSaved}
                onLoadMore={loadMore}
                onChangeMood={handleChangeMood}
                onStationSearch={handleStationSearch}
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
