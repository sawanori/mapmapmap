# Task 11: SpotCard BottomSheet Modal

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-11 |
| Phase | Phase 3: Spot Detail + Polish |
| Verification Level | L2 (integration -- pin tap opens modal with spot data) |
| Estimated File Count | 2 files (new + modify) |
| Dependencies | Task 10 (Phase 2 complete) |

## Overview

Implement a bottom-sheet modal that slides up when a map pin is tapped, displaying all spot information: name, category, distance, description, magazine context. Includes backdrop blur, slide-in animation, and multiple dismiss methods (backdrop tap, Escape key, drag down).

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/SpotCard.tsx` | new | Client Component -- bottom sheet modal |
| `src/app/page.tsx` | modify | Render SpotCard with selectedSpot |

## Implementation Steps

### Step 1: Implement SpotCard (`src/components/SpotCard.tsx`)
```typescript
'use client';

import { useEffect, useCallback, useRef } from 'react';
import type { SearchResult } from '@/types/spot';

interface SpotCardProps {
  spot: SearchResult | null;
  onClose: () => void;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m away`;
  }
  return `${km.toFixed(1)}km away`;
}

export default function SpotCard({ spot, onClose }: SpotCardProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Escape key handler
  useEffect(() => {
    if (!spot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [spot, onClose]);

  // Focus management
  useEffect(() => {
    if (spot && sheetRef.current) {
      sheetRef.current.focus();
    }
  }, [spot]);

  if (!spot) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-label={`Details for ${spot.name}`}
        aria-modal="true"
        tabIndex={-1}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl
                   transform transition-transform duration-300 ease-out
                   animate-slide-up
                   max-h-[70vh] overflow-y-auto
                   pb-[env(safe-area-inset-bottom)]"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Header: Name + Category */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{spot.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                {spot.category}
              </span>
              <span className="text-sm text-gray-400">
                {formatDistance(spot.distance)}
              </span>
            </div>
          </div>

          {/* Description */}
          {spot.description && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {spot.description}
            </p>
          )}

          {/* Magazine Context */}
          {spot.magazineContext && (
            <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              <span className="shrink-0 font-medium">Context:</span>
              <span>{spot.magazineContext}</span>
            </div>
          )}

          {/* Google Maps button placeholder -- wired in Task 12 */}
          <button
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-sm
                       hover:bg-gray-800 active:bg-gray-700 transition-colors"
            aria-label={`Open ${spot.name} in Google Maps`}
          >
            Open in Google Maps
          </button>
        </div>
      </div>
    </>
  );
}
```

### Step 2: Add slide-up animation to Tailwind config
Add to `tailwind.config.ts`:
```typescript
// In the theme.extend section:
keyframes: {
  'slide-up': {
    '0%': { transform: 'translateY(100%)' },
    '100%': { transform: 'translateY(0)' },
  },
},
animation: {
  'slide-up': 'slide-up 0.3s ease-out',
},
```

### Step 3: Wire SpotCard into page.tsx
```typescript
// In page.tsx, add:
import SpotCard from '@/components/SpotCard';

// Inside JSX:
<SpotCard
  spot={selectedSpot}
  onClose={() => setSelectedSpot(null)}
/>
```

## Acceptance Criteria

- [x] AC-004: Pin tap shows bottom-sheet with slide-in animation (0.3s ease-out)
- [x] AC-004: All required info displayed: name, category, distance, description, magazine context
- [x] AC-004: Backdrop blur effect applied (`backdrop-blur-sm`)
- [x] AC-004: Dismissible via backdrop tap and Escape key
- [x] Null description handled: section hidden when `spot.description` is null
- [x] Null magazineContext handled: section hidden when `spot.magazineContext` is null
- [x] Distance formatted correctly: meters (< 1km) or km (>= 1km)
- [x] Keyboard accessible: Escape to close, focus moves to sheet on open
- [x] ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-label`
- [x] Max height 70vh with scroll for long content
- [x] Safe area bottom padding for iOS
- [x] `tsc --noEmit` passes

## Verification Method

```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:3000
# 3. Search for something (e.g., "coffee")
# 4. Click a pin on the map
# 5. Verify:
#    - Bottom sheet slides up from bottom
#    - Spot name, category, distance displayed
#    - Description shown (if present)
#    - Magazine context shown (if present)
#    - Backdrop has blur effect
#    - Click backdrop -> sheet closes
#    - Reopen -> press Escape -> sheet closes
#    - Google Maps button visible (not yet functional)

# 6. TypeScript check
npx tsc --noEmit
```

## Notes

- Google Maps button is rendered as a placeholder in this task. Task 12 will make it functional.
- Drag-to-dismiss gesture is deferred to Task 14 (mobile polish) to keep this task focused.
- The `animate-slide-up` class uses a custom Tailwind keyframe animation.
