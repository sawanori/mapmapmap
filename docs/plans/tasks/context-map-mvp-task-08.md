# Task 08: Geolocation Integration with Tokyo Station Fallback

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-08 |
| Phase | Phase 2: Map UI + Search Integration |
| Verification Level | L2 (integration -- browser Geolocation API + map center) |
| Estimated File Count | 2 files (modify) |
| Dependencies | Task 07 |

## Overview

Integrate Browser Geolocation API to obtain user's current position. On success, update map center and use real coordinates for search. On failure (denied, unsupported, timeout), silently fall back to Tokyo Station coordinates.

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `src/app/page.tsx` | modify | Add geolocation logic, pass location to children |
| `src/components/Map.tsx` | modify | Accept and respond to userLocation changes |

## Implementation Steps

### Step 1: Add geolocation hook/logic to page.tsx
Add geolocation on mount in the page component:

```typescript
// In page.tsx, add to the Home component:
import { DEFAULT_LAT, DEFAULT_LNG } from '@/lib/constants';
import type { UserLocation } from '@/types/spot';

// Inside Home component:
const [userLocation, setUserLocation] = useState<UserLocation>({
  lat: DEFAULT_LAT,
  lng: DEFAULT_LNG,
  isDefault: true,
});

useEffect(() => {
  if (!navigator.geolocation) return; // Unsupported -- keep default

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        isDefault: false,
      });
    },
    () => {
      // Denied or error -- keep default (Tokyo Station)
      // Silent fallback, no error message
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}, []);
```

### Step 2: Update Map component to re-center on location change
```typescript
// In Map.tsx, add:
interface MapViewProps {
  initialCenter: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number };
  // ... other props
}

// Inside component, add effect to fly to user location:
useEffect(() => {
  if (userLocation) {
    setViewState((prev) => ({
      ...prev,
      latitude: userLocation.lat,
      longitude: userLocation.lng,
    }));
  }
}, [userLocation]);
```

### Step 3: Wire userLocation through page.tsx
Pass `userLocation` to both `MapView` and `SearchBar`:
```typescript
<MapView
  initialCenter={{ lat: userLocation.lat, lng: userLocation.lng }}
  userLocation={{ lat: userLocation.lat, lng: userLocation.lng }}
/>
<SearchBar
  userLocation={{ lat: userLocation.lat, lng: userLocation.lng }}
  onResults={handleResults}
  onError={handleError}
/>
```

## Acceptance Criteria

- [x] AC-005: Location permission dialog appears on first access (browser-native)
- [x] AC-005: On permission grant, map centers on user location
- [x] AC-005: On permission deny, map centers on Tokyo Station (35.6812, 139.7671)
- [x] AC-005: Search uses current location coordinates regardless of permission state
- [x] Fallback is silent -- no error message shown to user on geolocation denial
- [x] Geolocation API unsupported (e.g., HTTP context) -- silently uses default
- [x] `tsc --noEmit` passes

## Verification Method

```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:3000 in Chrome
# 3. Geolocation tests:
#
#    Test A - Allow geolocation:
#    - Browser prompts for location permission
#    - Click "Allow"
#    - Map should center on your current location (or simulated location in DevTools)
#    - Perform a search -> results should be relative to your location
#
#    Test B - Deny geolocation:
#    - Open in incognito / clear permissions
#    - Click "Block" on permission prompt
#    - Map should show Tokyo Station area (no error message visible)
#    - Search works with Tokyo Station as reference point
#
#    Test C - Simulate unsupported:
#    - Open DevTools > Console > run: delete navigator.geolocation
#    - Reload page
#    - Map shows Tokyo Station, no errors
#
# 4. Chrome DevTools Sensors tab can simulate geolocation for testing

# 5. TypeScript check
npx tsc --noEmit
```

## Notes

- `enableHighAccuracy: false` for faster response (GPS lock not needed for neighborhood-level search)
- `timeout: 10000` (10s) allows reasonable time for geolocation resolution
- `maximumAge: 300000` (5 min) allows cached position for repeat visits
- The geolocation effect runs once on mount; no continuous tracking needed for MVP
