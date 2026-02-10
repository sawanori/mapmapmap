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
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export default function LikedMap({ places, userLat, userLng, onBack }: LikedMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapError, setMapError] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<VibePlace | null>(null);

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

  const handleMarkerClick = useCallback((place: VibePlace) => {
    setSelectedPlace(place);
    mapRef.current?.flyTo({
      center: [place.lng, place.lat],
      zoom: 16,
      duration: 500,
      offset: [0, -80],
    });
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedPlace(null);
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
        onClick={handleCloseDetail}
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
              handleMarkerClick(place);
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full border-2 border-white shadow-lg cursor-pointer
                           transition-transform hover:scale-125 ${
                             selectedPlace?.id === place.id ? 'scale-150 ring-2 ring-blue-400' : ''
                           }`}
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

      {/* Place detail card */}
      {selectedPlace && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 p-4 animate-in slide-in-from-bottom duration-300"
          role="dialog"
          aria-label={`${selectedPlace.name}の詳細`}
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md mx-auto">
            {/* Hero image */}
            {selectedPlace.heroImageUrl && (
              <div className="relative h-40 w-full">
                <img
                  src={selectedPlace.heroImageUrl}
                  alt={selectedPlace.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              {/* Name + close */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {selectedPlace.name}
                </h3>
                <button
                  onClick={handleCloseDetail}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                  aria-label="閉じる"
                >
                  ✕
                </button>
              </div>

              {/* Catchphrase */}
              <p className="text-sm text-gray-600 mt-1">
                {selectedPlace.catchphrase}
              </p>

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="px-2 py-0.5 bg-gray-100 rounded-full font-medium">
                  {selectedPlace.category}
                </span>
                <span>{formatDistance(selectedPlace.distance)}</span>
                {selectedPlace.rating != null && (
                  <span className="text-yellow-500 font-medium">
                    ★ {selectedPlace.rating.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Vibe tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedPlace.vibeTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Hidden gems */}
              {selectedPlace.hiddenGemsInfo && (
                <div className="mt-3 px-3 py-2 bg-amber-50 rounded-xl">
                  <p className="text-xs text-amber-800">
                    💎 {selectedPlace.hiddenGemsInfo}
                  </p>
                </div>
              )}

              {/* Address */}
              {selectedPlace.address && (
                <p className="mt-2 text-xs text-gray-400">
                  📍 {selectedPlace.address}
                </p>
              )}

              {/* Opening hours */}
              {selectedPlace.openingHours && selectedPlace.openingHours.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    🕒 営業時間
                  </summary>
                  <ul className="mt-1 text-xs text-gray-400 space-y-0.5 pl-5">
                    {selectedPlace.openingHours.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Google Maps link */}
              <a
                href={`https://www.google.com/maps/place/?q=place_id:${selectedPlace.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                Google Maps で開く →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
