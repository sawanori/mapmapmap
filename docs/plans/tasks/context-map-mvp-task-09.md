# Task 09: Search Results to Map Pins Integration

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-09 |
| Phase | Phase 2: Map UI + Search Integration |
| Verification Level | L2 (integration -- search results display as pins on map) |
| Estimated File Count | 2 files (modify) |
| Dependencies | Task 06, Task 08 |

## Overview

Wire search results from the SearchBar through page state to the Map component. Render accent-colored pins for each search result using Mapbox Markers. Implement viewport auto-adjustment to encompass all result pins. Handle zero-result state.

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/Map.tsx` | modify | Add Marker rendering, fitBounds, selectedSpot |
| `src/app/page.tsx` | modify | Add selectedSpot state, pass searchResults to Map |

## Implementation Steps

### Step 1: Update Map.tsx to render pins
```typescript
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Map, { Marker, ViewStateChangeEvent, MapRef } from 'react-map-gl';
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
  selectedSpot,
  onSpotSelect,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    latitude: initialCenter.lat,
    longitude: initialCenter.lng,
    zoom: DEFAULT_ZOOM,
  });

  // Re-center on user location
  useEffect(() => {
    if (userLocation) {
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

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      mapStyle={MAP_STYLE}
      style={{ width: '100vw', height: '100dvh' }}
    >
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
            className="w-4 h-4 rounded-full border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-125"
            style={{ backgroundColor: PIN_COLOR }}
          />
        </Marker>
      ))}
    </Map>
  );
}
```

### Step 2: Update page.tsx with full state management
```typescript
// Add to page.tsx:
const [selectedSpot, setSelectedSpot] = useState<SearchResult | null>(null);
const [noResults, setNoResults] = useState(false);

const handleResults = useCallback((results: SearchResult[]) => {
  setSearchResults(results);
  setSelectedSpot(null);
  setErrorMessage(null);
  setNoResults(results.length === 0);
}, []);

// Pass to MapView:
<MapView
  initialCenter={{ lat: userLocation.lat, lng: userLocation.lng }}
  userLocation={{ lat: userLocation.lat, lng: userLocation.lng }}
  searchResults={searchResults}
  selectedSpot={selectedSpot}
  onSpotSelect={setSelectedSpot}
/>

// Zero-result overlay:
{noResults && (
  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-white/90 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg text-center">
    <p className="text-gray-600 text-sm">No spots found nearby.</p>
    <p className="text-gray-400 text-xs mt-1">Try a different search or location.</p>
  </div>
)}
```

## Acceptance Criteria

- [x] AC-003: Search results displayed as accent-colored pins on map
- [x] AC-003: Viewport auto-adjusts to encompass all result pins (fitBounds)
- [x] AC-003: Zero results shows "No spots found" message overlay
- [x] Pin color is gunjo-blue (#1a1a6e) per Design Doc
- [x] Previous pins cleared on new search (searchResults state replaced)
- [x] Pin click sets selectedSpot (preparation for Phase 3 SpotCard)
- [x] Single-result case: map zooms to that spot's location
- [x] `tsc --noEmit` passes

## Verification Method

```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:3000 in Chrome
# 3. Verification flow:
#    - Type "coffee" in search bar -> submit
#    - Accent-colored pins should appear on map
#    - Map viewport should adjust to show all pins
#    - Click a pin -> selectedSpot updated (verify via React DevTools or console)
#    - Type new search -> old pins disappear, new ones appear
#    - Search for something with no nearby results -> "No spots found" overlay

# 4. TypeScript check
npx tsc --noEmit
```

## Notes

- `fitBounds` with `padding: 80` ensures pins are not at the very edge of the viewport
- Marker `onClick` uses `stopPropagation` to prevent the map click from deselecting
- The pin style is a simple circle; can be enhanced in Phase 3 polish
