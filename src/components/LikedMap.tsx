'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import Map, { Marker, MapRef } from 'react-map-gl';
import { MAP_STYLE, PIN_COLOR } from '@/lib/constants';
import type { VibePlace } from '@/types/vibe';

interface LikedMapProps {
  places: VibePlace[];
  userLat?: number;
  userLng?: number;
  onBack: () => void;
  onSelectPlace?: (place: VibePlace) => void;
}

export default function LikedMap({ places, userLat, userLng, onBack, onSelectPlace }: LikedMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    if (places.length === 0) return;

    // Include user location in bounds calculation
    const allLngs = places.map((p) => p.lng);
    const allLats = places.map((p) => p.lat);
    if (userLat != null && userLng != null) {
      allLngs.push(userLng);
      allLats.push(userLat);
    }

    if (allLngs.length === 1 && !userLat) {
      mapRef.current.flyTo({
        center: [places[0].lng, places[0].lat],
        zoom: 16,
        duration: 500,
      });
      return;
    }

    mapRef.current.fitBounds(
      [
        [Math.min(...allLngs), Math.min(...allLats)],
        [Math.max(...allLngs), Math.max(...allLats)],
      ],
      { padding: 80, duration: 1000 },
    );
  }, [places, userLat, userLng]);

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) map.setLanguage('ja');
  }, []);

  const handleMapError = useCallback(() => {
    setMapError(true);
  }, []);

  if (mapError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600 text-sm">地図の読み込みに失敗しました</p>
      </div>
    );
  }

  const center = places.length > 0
    ? { lat: places[0].lat, lng: places[0].lng }
    : userLat != null && userLng != null
      ? { lat: userLat, lng: userLng }
      : { lat: 35.4544, lng: 139.6368 };

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: center.lat,
          longitude: center.lng,
          zoom: 14,
        }}
        onLoad={handleMapLoad}
        onError={handleMapError}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
      >
        {/* User location marker */}
        {userLat != null && userLng != null && (
          <Marker latitude={userLat} longitude={userLng} anchor="center">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-8 h-8 rounded-full bg-blue-400 opacity-30 animate-ping" />
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
            </div>
          </Marker>
        )}

        {/* Place markers */}
        {places.map((place) => (
          <Marker
            key={place.id}
            latitude={place.lat}
            longitude={place.lng}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectPlace?.(place);
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="w-5 h-5 rounded-full border-2 border-white shadow-lg cursor-pointer
                           transition-transform hover:scale-125"
                style={{ backgroundColor: PIN_COLOR }}
              />
              <span className="mt-1 px-2 py-0.5 text-[10px] font-medium bg-white rounded-full shadow text-gray-800 whitespace-nowrap max-w-[120px] truncate">
                {place.name}
              </span>
            </div>
          </Marker>
        ))}
      </Map>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-white rounded-xl shadow-md
                   text-sm font-medium text-gray-700 hover:bg-gray-50
                   active:scale-95 transition-all"
        aria-label="カードに戻る"
      >
        ← 戻る
      </button>

      {/* Place count */}
      <div className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-white rounded-xl shadow-md">
        <span className="text-sm font-medium text-blue-800">
          ♥ {places.length}
        </span>
      </div>
    </div>
  );
}
