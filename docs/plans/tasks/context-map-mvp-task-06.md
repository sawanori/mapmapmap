# Task 06: Map Component (Mapbox GL JS, Monochrome Style)

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-06 |
| Phase | Phase 2: Map UI + Search Integration |
| Verification Level | L1 (unit -- map renders in browser) |
| Estimated File Count | 2 files (new) + 1 file (modify) |
| Dependencies | Task 05 (Phase 1 complete) |

## Overview

Implement a full-screen Mapbox map with monochrome/white style using `react-map-gl` (v8). The map renders as a Client Component, dynamically imported with SSR disabled to avoid Mapbox GL JS issues with Next.js App Router.

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/Map.tsx` | new | Client Component with react-map-gl |
| `src/app/page.tsx` | modify | Import Map dynamically, pass initialCenter |
| `src/app/layout.tsx` | modify | Add Mapbox CSS import |

## Implementation Steps

### Step 1: Add Mapbox GL CSS
In `src/app/layout.tsx`, add the Mapbox GL CSS import:
```typescript
import 'mapbox-gl/dist/mapbox-gl.css';
```

### Step 2: Implement Map component (`src/components/Map.tsx`)
```typescript
'use client';

import { useState, useCallback } from 'react';
import Map, { ViewStateChangeEvent } from 'react-map-gl';
import { MAP_STYLE, DEFAULT_ZOOM } from '@/lib/constants';

interface MapViewProps {
  initialCenter: { lat: number; lng: number };
}

export default function MapView({ initialCenter }: MapViewProps) {
  const [viewState, setViewState] = useState({
    latitude: initialCenter.lat,
    longitude: initialCenter.lng,
    zoom: DEFAULT_ZOOM,
  });

  const handleMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
  }, []);

  return (
    <Map
      {...viewState}
      onMove={handleMove}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      mapStyle={MAP_STYLE}
      style={{ width: '100vw', height: '100dvh' }}
      interactive={true}
    />
  );
}
```

### Step 3: Update page.tsx with dynamic import
```typescript
import dynamic from 'next/dynamic';
import { DEFAULT_LAT, DEFAULT_LNG } from '@/lib/constants';

const MapView = dynamic(() => import('@/components/Map'), { ssr: false });

export default function Home() {
  return (
    <main className="relative w-screen h-dvh overflow-hidden">
      <MapView initialCenter={{ lat: DEFAULT_LAT, lng: DEFAULT_LNG }} />
    </main>
  );
}
```

### Step 4: Verify in browser
Open `http://localhost:3000` and confirm:
- Full-screen monochrome map renders
- Map is draggable and zoomable
- No console errors

## Acceptance Criteria

- [x] AC-002: Full-screen monochrome map displays on page load
- [x] AC-002: Map supports drag and pinch zoom
- [x] Map style is white/monochrome (`light-v11`), buildings in light gray
- [x] No Mapbox token exposed in client-side code beyond `NEXT_PUBLIC_MAPBOX_TOKEN`
- [x] Map renders without JavaScript errors on desktop Chrome
- [x] `next/dynamic` used with `ssr: false` to prevent SSR issues
- [x] Map uses `100dvh` for proper mobile viewport height

## Verification Method

```bash
# 1. Start dev server
npm run dev

# 2. Open browser to http://localhost:3000
# 3. Visual verification:
#    - Full-screen white/gray monochrome map visible
#    - Map centered on Tokyo Station area
#    - Drag to pan works
#    - Scroll/pinch to zoom works
#    - No errors in browser console

# 4. TypeScript check
npx tsc --noEmit
```

## Notes

- `react-map-gl` v8 wraps Mapbox GL JS v3; ensure version compatibility
- `100dvh` is used instead of `100vh` to handle mobile browser address bar correctly
- SSR must be disabled for the Map component because Mapbox GL JS requires DOM access
