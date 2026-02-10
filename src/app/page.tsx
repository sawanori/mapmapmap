'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DEFAULT_LAT, DEFAULT_LNG } from '@/lib/constants';
import { useVibeStore } from '@/store/vibe-store';
import MoodSelector from '@/components/MoodSelector';
import CardStack from '@/components/CardStack';
import CardsExhausted from '@/components/CardsExhausted';
import type { Mood } from '@/types/vibe';
import type { VibePlace } from '@/types/vibe';

const LikedMap = dynamic(() => import('@/components/LikedMap'), { ssr: false });

type ViewMode = 'mood' | 'cards' | 'exhausted' | 'likedMap';

type GeoStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

export default function Home() {
  const [userLat, setUserLat] = useState(DEFAULT_LAT);
  const [userLng, setUserLng] = useState(DEFAULT_LNG);
  const [viewMode, setViewMode] = useState<ViewMode>('mood');
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('loading');

  const {
    currentMood,
    cards,
    currentIndex,
    likedPlaces,
    isLoading,
    isExhausted,
    errorMessage,
    setMood,
    loadCards,
    like,
    pass,
    reset,
  } = useVibeStore();

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLat(position.coords.latitude);
        setUserLng(position.coords.longitude);
        setGeoStatus('granted');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus('denied');
          navigator.geolocation.clearWatch(watchId);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );

    return () => {
      navigator.geolocation?.clearWatch(watchId);
    };
  }, []);

  // Transition to cards/exhausted based on store state
  useEffect(() => {
    if (isExhausted && viewMode === 'cards') {
      setViewMode('exhausted');
    }
  }, [isExhausted, viewMode]);

  const handleMoodSelect = useCallback(
    async (mood: Mood) => {
      setMood(mood);
      setViewMode('cards');
      await loadCards(userLat, userLng);
    },
    [setMood, loadCards, userLat, userLng],
  );

  const handleChangeMood = useCallback(() => {
    reset();
    setViewMode('mood');
  }, [reset]);

  const handleExpandRadius = useCallback(async () => {
    setViewMode('cards');
    await loadCards(userLat, userLng);
  }, [loadCards, userLat, userLng]);

  const handleShowLikedMap = useCallback(() => {
    setViewMode('likedMap');
  }, []);

  const handleBackFromMap = useCallback(() => {
    if (isExhausted) {
      setViewMode('exhausted');
    } else {
      setViewMode('cards');
    }
  }, [isExhausted]);

  const handleLike = useCallback(
    (place: VibePlace) => {
      like(place);
    },
    [like],
  );

  const handlePass = useCallback(
    (placeId: string) => {
      pass(placeId);
    },
    [pass],
  );

  return (
    <main className="relative w-screen h-dvh overflow-hidden bg-gray-50">
      {/* Liked Map (fullscreen) */}
      {viewMode === 'likedMap' && (
        <LikedMap
          places={likedPlaces}
          onBack={handleBackFromMap}
        />
      )}

      {/* Main content area (centered) */}
      {viewMode !== 'likedMap' && (
        <div className="flex flex-col items-center justify-center h-full px-4 py-8">
          {/* Header */}
          <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gray-50/80 backdrop-blur-sm">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                VIBE MAP
              </h1>
              <p className="text-[10px] text-gray-400 -mt-0.5">
                {geoStatus === 'loading' && '位置情報を取得中...'}
                {geoStatus === 'granted' && `${userLat.toFixed(4)}, ${userLng.toFixed(4)}`}
                {geoStatus === 'denied' && 'デフォルト位置（みなとみらい）'}
                {geoStatus === 'unavailable' && 'デフォルト位置（みなとみらい）'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {currentMood && viewMode === 'cards' && likedPlaces.length > 0 && (
                <button
                  onClick={handleShowLikedMap}
                  className="px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 rounded-full"
                  aria-label={`お気に入り${likedPlaces.length}件を地図で見る`}
                >
                  ♥ {likedPlaces.length}
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

          {/* Mood Selection */}
          {viewMode === 'mood' && (
            <MoodSelector onSelect={handleMoodSelect} disabled={isLoading} />
          )}

          {/* Loading */}
          {viewMode === 'cards' && isLoading && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-800 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">スポットを探しています...</p>
            </div>
          )}

          {/* Card Stack */}
          {viewMode === 'cards' && !isLoading && cards.length > 0 && (
            <div className="w-full max-w-sm mt-14">
              <CardStack
                cards={cards}
                currentIndex={currentIndex}
                mood={currentMood ?? undefined}
                onLike={handleLike}
                onPass={handlePass}
              />
            </div>
          )}

          {/* No results */}
          {viewMode === 'cards' && !isLoading && cards.length === 0 && !isExhausted && (
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                {errorMessage ?? '近くにスポットが見つかりませんでした'}
              </p>
              <button
                onClick={handleChangeMood}
                className="mt-4 px-4 py-2 text-sm text-blue-800 bg-blue-50 rounded-xl"
              >
                別の気分で探す
              </button>
            </div>
          )}

          {/* Cards Exhausted */}
          {viewMode === 'exhausted' && (
            <CardsExhausted
              likedCount={likedPlaces.length}
              onExpandRadius={handleExpandRadius}
              onChangeMood={handleChangeMood}
              onShowLikedMap={handleShowLikedMap}
            />
          )}
        </div>
      )}

      {/* Error toast */}
      {errorMessage && viewMode !== 'cards' && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 text-red-700 px-4 py-2 rounded-lg shadow text-sm max-w-sm text-center"
        >
          {errorMessage}
        </div>
      )}
    </main>
  );
}
