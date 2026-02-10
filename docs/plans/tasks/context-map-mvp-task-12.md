# Task 12: Google Maps External Link Integration

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-12 |
| Phase | Phase 3: Spot Detail + Polish |
| Verification Level | L1 (unit -- link opens correct URL) |
| Estimated File Count | 1 file (modify) |
| Dependencies | Task 11 |

## Overview

Make the "Open in Google Maps" button in SpotCard functional. It opens Google Maps in a new tab/app with the spot's correct coordinates.

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/SpotCard.tsx` | modify | Wire Google Maps link button |

## Implementation Steps

### Step 1: Replace placeholder button with link
In `SpotCard.tsx`, replace the placeholder button with a functional link:

```typescript
{/* Google Maps link */}
<a
  href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`}
  target="_blank"
  rel="noopener noreferrer"
  className="block w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-sm
             text-center hover:bg-gray-800 active:bg-gray-700 transition-colors"
  aria-label={`Open ${spot.name} in Google Maps`}
>
  Open in Google Maps
</a>
```

Key details:
- URL format: `https://www.google.com/maps/search/?api=1&query={lat},{lng}`
- `target="_blank"` opens in new tab (or Google Maps app on mobile)
- `rel="noopener noreferrer"` for security (prevents `window.opener` access)

## Acceptance Criteria

- [x] AC-007: Button tap opens Google Maps in new tab (desktop) or app (mobile)
- [x] AC-007: Correct coordinates passed to Google Maps URL (verify by checking URL)
- [x] Link has `rel="noopener noreferrer"` for security
- [x] Link is styled as a prominent full-width button, easily tappable on mobile
- [x] Button uses `<a>` tag (not `<button>`) for proper semantics as a navigation link
- [x] `tsc --noEmit` passes

## Verification Method

```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:3000
# 3. Search and tap a pin to open SpotCard
# 4. Click "Open in Google Maps" button
# 5. Verify:
#    - New tab opens to Google Maps
#    - URL contains correct lat,lng (visible in address bar)
#    - Map in Google Maps shows the correct location
#    - Right-click > Inspect the link element:
#      - href contains correct coordinates
#      - target="_blank"
#      - rel="noopener noreferrer"

# 6. Mobile test (Chrome DevTools device mode):
#    - Tap the button
#    - Verify new tab opens (on real mobile device, Google Maps app may open)

# 7. TypeScript check
npx tsc --noEmit
```

## Notes

- The Google Maps Search URL format (`/maps/search/?api=1&query=lat,lng`) is the recommended universal link format that works across platforms
- On mobile devices with Google Maps installed, this URL will typically open the native Google Maps app
- No API key is needed for this external link
