# Task 14: Responsive Design and Mobile Polish

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-14 |
| Phase | Phase 3: Spot Detail + Polish |
| Verification Level | L3 (E2E -- multi-device visual verification) |
| Estimated File Count | 4 files (modify) |
| Dependencies | Task 13 |

## Overview

Mobile-first responsive polish: proper viewport meta, font loading, metadata, mobile keyboard handling, safe area insets, touch gestures for SpotCard drag-to-dismiss, and performance verification (FCP, LCP targets).

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `src/app/layout.tsx` | modify | Viewport meta, fonts, metadata |
| `src/components/Map.tsx` | modify | Mobile viewport fixes (100dvh) |
| `src/components/SearchBar.tsx` | modify | Keyboard handling, input attributes |
| `src/components/SpotCard.tsx` | modify | Touch drag-to-dismiss gesture |

## Implementation Steps

### Step 1: Layout meta and fonts (`src/app/layout.tsx`)
```typescript
import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import 'mapbox-gl/dist/mapbox-gl.css';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Context-Map -- Find places by vibe',
  description: 'Discover spots that match your mood. Vibe-based semantic search on a minimal map.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${geist.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

### Step 2: Mobile Map fixes (`src/components/Map.tsx`)
- Verify `100dvh` is used (not `100vh`) for proper iOS Safari behavior
- Add `touch-action: none` to prevent scroll-through on touch devices
- Verify map container has no overflow issues

```typescript
// Ensure style includes:
style={{ width: '100vw', height: '100dvh' }}
// And container has:
className="touch-none"
```

### Step 3: SearchBar mobile polish (`src/components/SearchBar.tsx`)
```typescript
// Add appropriate input attributes for mobile:
<input
  type="search"
  inputMode="text"
  autoComplete="off"
  autoCorrect="off"
  spellCheck={false}
  enterKeyHint="search"
  // ... existing props
/>

// Bottom safe area already handled via:
// pb-[calc(1rem+env(safe-area-inset-bottom))]
```

### Step 4: SpotCard drag-to-dismiss (`src/components/SpotCard.tsx`)
Add touch-based drag-to-dismiss:

```typescript
const [dragY, setDragY] = useState(0);
const [isDragging, setIsDragging] = useState(false);
const startY = useRef(0);

const handleTouchStart = useCallback((e: React.TouchEvent) => {
  startY.current = e.touches[0].clientY;
  setIsDragging(true);
}, []);

const handleTouchMove = useCallback((e: React.TouchEvent) => {
  const currentY = e.touches[0].clientY;
  const diff = currentY - startY.current;
  if (diff > 0) { // Only allow dragging down
    setDragY(diff);
  }
}, []);

const handleTouchEnd = useCallback(() => {
  setIsDragging(false);
  if (dragY > 100) { // Threshold to dismiss
    onClose();
  }
  setDragY(0);
}, [dragY, onClose]);

// Apply to sheet div:
<div
  // ... existing props
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  style={{
    transform: isDragging ? `translateY(${dragY}px)` : undefined,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
  }}
>
```

### Step 5: Performance verification
Run Lighthouse audit (Chrome DevTools > Lighthouse):
- FCP target: < 1.5s
- LCP target: < 2.5s
- Check for layout shifts
- Verify no unnecessary JavaScript bundles

## Acceptance Criteria

- [x] AC-002: iOS Safari and Android Chrome render correctly (verified in DevTools device mode)
- [x] Mobile viewport: no horizontal scroll, proper safe areas (top and bottom)
- [x] Touch interactions: smooth map drag, pin tap, SpotCard drag-to-dismiss
- [x] Keyboard does not obscure search bar input (proper `enterKeyHint`, safe area padding)
- [x] Viewport meta: `width=device-width, initial-scale=1, viewport-fit=cover`
- [x] Metadata: title and description set
- [x] Font: Geist loaded properly
- [x] SpotCard: drag > 100px threshold dismisses sheet
- [x] SpotCard: spring-back animation if drag < threshold
- [ ] FCP target: < 1.5s (Lighthouse on localhost)
- [ ] LCP target: < 2.5s (Lighthouse on localhost)
- [x] `tsc --noEmit` passes

## Verification Method

```bash
# 1. Start dev server
npm run dev

# 2. Desktop Chrome verification:
#    - Open http://localhost:3000
#    - Full search flow works
#    - Lighthouse audit: check FCP and LCP

# 3. Mobile viewport testing (Chrome DevTools):
#    - Toggle device toolbar
#    - Test iPhone 14 Pro (390x844)
#    - Test Galaxy S21 (360x800)
#    - Verify:
#      - Map fills full viewport (no white space at bottom)
#      - Search bar has bottom safe area padding
#      - SpotCard has bottom safe area padding
#      - No horizontal scroll
#      - SpotCard drag gesture works

# 4. Keyboard test:
#    - Focus search bar
#    - Verify keyboard appears with "search" key (enterKeyHint)
#    - Verify search bar remains visible above keyboard

# 5. TypeScript check
npx tsc --noEmit
```

## Notes

- `maximumScale: 1` and `userScalable: false` prevents double-tap zoom which interferes with map interactions
- `viewportFit: 'cover'` enables access to `env(safe-area-inset-*)` CSS environment variables for notched devices
- The drag-to-dismiss threshold of 100px is a standard UX pattern for bottom sheets
