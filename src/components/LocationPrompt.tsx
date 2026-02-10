'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { GeoStatus } from '@/types/vibe';

interface LocationPromptProps {
  onResolved: (lat: number, lng: number, status: GeoStatus) => void;
  onStationSearch: () => void;
  defaultLat: number;
  defaultLng: number;
}

export default function LocationPrompt({
  onResolved,
  onStationSearch,
  defaultLat,
  defaultLng,
}: LocationPromptProps) {
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
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
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setDenied(true);
        } else {
          // POSITION_UNAVAILABLE or TIMEOUT
          onResolved(defaultLat, defaultLng, 'unavailable');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, [onResolved, defaultLat, defaultLng]);

  const handleRetryPermission = useCallback(() => {
    setDenied(false);
    handleAllow();
  }, [handleAllow]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 text-center">
      {!denied ? (
        <>
          <div className="text-4xl">📍</div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              近くのスポットを出すために位置情報を使います
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              許可すると、いまいる場所から徒歩で行ける候補を優先して表示します。
            </p>
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
              {locating ? '取得中...' : '位置情報を許可して探す'}
            </button>
            <button
              onClick={onStationSearch}
              disabled={locating}
              className="px-6 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              駅名で探す
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl">📍</div>
          <p className="text-sm text-gray-600">
            位置情報が使えないため、駅名で探せます。
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={onStationSearch}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-2xl
                         hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              駅名で探す
            </button>
            <button
              onClick={handleRetryPermission}
              className="px-6 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              再度許可を試す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
