'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, MapRef } from 'react-map-gl';
import { MAP_STYLE, DEFAULT_ZOOM, PIN_COLOR } from '@/lib/constants';
import type { SearchResult } from '@/types/spot';

interface MapViewProps {
  initialCenter: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number };
  searchResults: SearchResult[];
  selectedSpot: SearchResult | null;
  onSpotSelect: (spot: SearchResult) => void;
}

export default function MapView({
  initialCenter,
  userLocation,
  searchResults,
  selectedSpot: _selectedSpot,
  onSpotSelect,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    latitude: initialCenter.lat,
    longitude: initialCenter.lng,
    zoom: DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0,
  });
  const [mapError, setMapError] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const hasCenteredOnUser = useRef(false);

  // Re-center on FIRST real GPS position only
  useEffect(() => {
    if (userLocation && !hasCenteredOnUser.current) {
      hasCenteredOnUser.current = true;
      setViewState((prev) => ({
        ...prev,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
      }));
    }
  }, [userLocation]);

  // Fit bounds when search results change
  useEffect(() => {
    if (searchResults.length === 0 || !mapRef.current) return;

    if (searchResults.length === 1) {
      setViewState((prev) => ({
        ...prev,
        latitude: searchResults[0].lat,
        longitude: searchResults[0].lng,
        zoom: 16,
      }));
      return;
    }

    const lngs = searchResults.map((s) => s.lng);
    const lats = searchResults.map((s) => s.lat);
    mapRef.current.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 80, duration: 1000 }
    );
  }, [searchResults]);

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setLanguage('ja');

    // Apply blue tint to map layers
    const style = map.getStyle();
    if (!style?.layers) return;

    for (const layer of style.layers) {
      const id = layer.id;
      const type = layer.type;

      // Water → deeper blue
      if (id.includes('water')) {
        if (type === 'fill') map.setPaintProperty(id, 'fill-color', '#c7d9f0');
        if (type === 'line') map.setPaintProperty(id, 'line-color', '#a3c4e8');
      }
      // Land / background → very faint blue-white
      else if (id.includes('land') || id === 'background') {
        if (type === 'fill') map.setPaintProperty(id, 'fill-color', '#f0f4fa');
        if (type === 'background') map.setPaintProperty(id, 'background-color', '#f0f4fa');
      }
      // Buildings → light blue-gray
      else if (id.includes('building')) {
        if (type === 'fill') map.setPaintProperty(id, 'fill-color', '#dce4f0');
      }
      // Roads → blue-tinted gray
      else if (id.includes('road') || id.includes('bridge')) {
        if (type === 'line') {
          try { map.setPaintProperty(id, 'line-color', '#cdd6e4'); } catch { /* some road layers use expressions */ }
        }
      }
      // Parks / green areas → blue-tinted green
      else if (id.includes('park') || id.includes('landuse') || id.includes('national')) {
        if (type === 'fill') {
          try { map.setPaintProperty(id, 'fill-color', '#d4e4ee'); } catch { /* skip expression layers */ }
        }
      }
    }
  }, []);

  const handleMapError = useCallback(() => {
    setMapError(true);
  }, []);

  const toggle3D = useCallback(() => {
    const next = !is3D;
    setIs3D(next);

    const map = mapRef.current?.getMap();
    if (!map) return;

    if (next) {
      // Enable 3D buildings
      setViewState((prev) => ({ ...prev, pitch: 60, bearing: -20, zoom: Math.max(prev.zoom, 15) }));

      // Add 3D building layer if not already present
      if (!map.getLayer('3d-buildings')) {
        map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#c4d0e4',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.7,
          },
        });
      } else {
        map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
      }
    } else {
      // Disable 3D
      setViewState((prev) => ({ ...prev, pitch: 0, bearing: 0 }));
      if (map.getLayer('3d-buildings')) {
        map.setLayoutProperty('3d-buildings', 'visibility', 'none');
      }
    }
  }, [is3D]);

  if (mapError) {
    return (
      <div
        className="relative w-full h-full"
        style={{ width: '100vw', height: '100dvh' }}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center p-6">
            <p className="text-gray-600 font-medium">地図の読み込みに失敗しました</p>
            <p className="text-gray-400 text-sm mt-1">接続を確認して再読み込みしてください</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="touch-none">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onLoad={handleMapLoad}
        onError={handleMapError}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        style={{ width: '100vw', height: '100dvh' }}
      >
        {userLocation && (
          <Marker
            latitude={userLocation.lat}
            longitude={userLocation.lng}
            anchor="center"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-8 h-8 rounded-full bg-blue-500/20 animate-ping" />
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md" />
            </div>
          </Marker>
        )}
        {searchResults.map((spot) => (
          <Marker
            key={spot.id}
            latitude={spot.lat}
            longitude={spot.lng}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSpotSelect(spot);
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-blue-100 shadow-md cursor-pointer transition-transform hover:scale-125"
              style={{ backgroundColor: PIN_COLOR }}
            />
          </Marker>
        ))}
      </Map>

      {/* 3D Toggle Button */}
      <button
        onClick={toggle3D}
        className="fixed top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-lg bg-white shadow-md text-sm font-bold transition-colors"
        style={{ color: is3D ? '#1e40af' : '#6b7280' }}
        aria-label={is3D ? '2D表示に切替' : '3D表示に切替'}
      >
        3D
      </button>
    </div>
  );
}
