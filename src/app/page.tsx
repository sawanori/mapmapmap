'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DEFAULT_LAT, DEFAULT_LNG } from '@/lib/constants';
import { useVibeStore } from '@/store/vibe-store';
import MoodSelector from '@/components/MoodSelector';
import LocationPrompt from '@/components/LocationPrompt';
import StationSearch from '@/components/StationSearch';
import SwipeIntro from '@/components/SwipeIntro';
import type { Mood, GeoStatus } from '@/types/vibe';

const LikedMap = dynamic(() => import('@/components/LikedMap'), { ssr: false });

type ViewMode = 'mood' | 'permission_gate' | 'station_search' | 'swipe' | 'likedMap';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('mood');
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');

  const {
    currentMood,
    coords,
    results,
    isLoading,
    savedPlaceIds,
    setMood,
    setLocation,
    loadResults,
    toggleSaved,
    reset,
  } = useVibeStore();

  // Mood selection → decide next screen
  const handleMoodSelect = useCallback(
    (mood: Mood) => {
      setMood(mood);
      if (geoStatus === 'granted' || geoStatus === 'denied' || geoStatus === 'unavailable') {
        setViewMode('swipe');
        loadResults();
      } else {
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
      setViewMode('swipe');
      useVibeStore.setState({
        locationMode: 'geo',
        coords: { lat, lng },
        isLoading: true,
      });
      loadResults();
    },
    [setLocation, loadResults],
  );

  // Station search
  const handleStationSearch = useCallback(() => {
    setViewMode('station_search');
  }, []);

  const handleStationSubmit = useCallback(
    (lat: number, lng: number, _stationName: string) => {
      setGeoStatus('denied');
      setLocation('station', lat, lng);
      setViewMode('swipe');
      useVibeStore.setState({
        locationMode: 'station',
        coords: { lat, lng },
        isLoading: true,
      });
      loadResults();
    },
    [setLocation, loadResults],
  );

  const handleBackFromStation = useCallback(() => {
    setViewMode('permission_gate');
  }, []);

  // Swipe handlers — like always saves (never removes)
  const handleSwipeLike = useCallback(
    (placeId: string) => {
      if (!savedPlaceIds.includes(placeId)) {
        toggleSaved(placeId);
      }
    },
    [toggleSaved, savedPlaceIds],
  );

  const handleSwipeComplete = useCallback(() => {
    setViewMode('likedMap');
  }, []);

  // Change mood → back to start
  const handleChangeMood = useCallback(() => {
    reset();
    setViewMode('mood');
  }, [reset]);

  // Saved places for map
  const savedPlaces = results.filter((p) => savedPlaceIds.includes(p.id));

  // Show liked map
  const handleShowLikedMap = useCallback(() => {
    setViewMode('likedMap');
  }, []);

  const handleBackFromMap = useCallback(() => {
    setViewMode('mood');
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

      {/* Main content area */}
      {viewMode !== 'likedMap' && (
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
              {currentMood && viewMode === 'swipe' && savedPlaceIds.length > 0 && (
                <button
                  onClick={handleShowLikedMap}
                  className="px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 rounded-full"
                  aria-label={`お気に入り${savedPlaceIds.length}件を地図で見る`}
                >
                  ♥ {savedPlaceIds.length}
                </button>
              )}
              {currentMood && (
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
            {viewMode === 'mood' && (
              <div className="flex items-center justify-center h-full">
                <MoodSelector onSelect={handleMoodSelect} />
              </div>
            )}

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

            {viewMode === 'station_search' && (
              <div className="flex items-center justify-center h-full">
                <StationSearch
                  onSubmit={handleStationSubmit}
                  onBack={handleBackFromStation}
                />
              </div>
            )}

            {viewMode === 'swipe' && currentMood && !isLoading && (
              <SwipeIntro
                places={results}
                savedPlaceIds={savedPlaceIds}
                onLike={handleSwipeLike}
                onToggleSaved={toggleSaved}
                onComplete={handleSwipeComplete}
              />
            )}

            {viewMode === 'swipe' && isLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-500">スポットを探しています...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
