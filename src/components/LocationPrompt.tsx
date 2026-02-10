'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';

interface LocationPromptProps {
  onResolved: (lat: number, lng: number, status: GeoStatus) => void;
  defaultLat: number;
  defaultLng: number;
}

export default function LocationPrompt({ onResolved, defaultLat, defaultLng }: LocationPromptProps) {
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleAllow = useCallback(() => {
    if (!navigator.geolocation) {
      onResolved(defaultLat, defaultLng, 'unavailable');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelledRef.current) return;
        onResolved(position.coords.latitude, position.coords.longitude, 'granted');
      },
      (error) => {
        if (cancelledRef.current) return;
        const status: GeoStatus = error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable';
        setLocating(false);
        setDenied(true);
        timerRef.current = setTimeout(() => {
          if (cancelledRef.current) return;
          onResolved(defaultLat, defaultLng, status);
        }, 1500);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, [onResolved, defaultLat, defaultLng]);

  const handleSkip = useCallback(() => {
    onResolved(defaultLat, defaultLng, 'idle');
  }, [onResolved, defaultLat, defaultLng]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 text-center">
      {!denied ? (
        <>
          <div className="text-4xl">📍</div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">現在地を使ってもいい？</h2>
            <p className="text-sm text-gray-500 mt-1">近くのスポットを見つけるために使います</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={handleAllow}
              disabled={locating}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-2xl
                         hover:bg-blue-700 active:scale-[0.98] transition-all
                         disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {locating && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {locating ? '取得中...' : '現在地を使う'}
            </button>
            <button
              onClick={handleSkip}
              disabled={locating}
              className="px-6 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              みなとみらいで探す
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl">📍</div>
          <p className="text-sm text-gray-600">
            位置情報が利用できませんでした。デフォルト位置で探します...
          </p>
        </div>
      )}
    </div>
  );
}
