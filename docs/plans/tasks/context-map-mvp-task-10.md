# Task 10: Phase 2 Integration Verification

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-10 |
| Phase | Phase 2: Map UI + Search Integration |
| Verification Level | L2 (integration -- full browser search flow) |
| Estimated File Count | 0 files (verification only) |
| Dependencies | Task 09 |

## Overview

Verify the full browser-based search flow: monochrome map loads, geolocation works, search queries produce pins on the map, and viewport adjusts correctly. Test on both desktop and mobile viewport.

## Target Files

No new files. This is a verification-only task.

## Verification Procedure

### Test 1: Desktop Chrome -- Full Search Flow
1. Open `http://localhost:3000` in Chrome
2. Verify: monochrome map loads full-screen (white/gray style)
3. Geolocation prompt appears
   - Allow: map centers on your location (or simulated location)
   - Or deny: map shows Tokyo Station area
4. Type "late night bar" in search bar, press Enter/submit
5. Verify: accent-colored pins (#1a1a6e) appear on map
6. Verify: viewport auto-adjusts to encompass all pins
7. Click a pin: `selectedSpot` state updates (visible in React DevTools)
8. Type new search "quiet cafe": verify old pins replaced by new ones

### Test 2: Mobile Viewport (Chrome DevTools)
1. Open Chrome DevTools > Toggle Device Toolbar
2. Select iPhone 14 Pro or similar mobile device
3. Verify: map fills entire viewport
4. Verify: search bar is at bottom of screen, not obscured
5. Verify: pins are visible and tappable
6. Verify: no horizontal scroll

### Test 3: Error Cases
1. Empty query: submit button should be disabled (or validation prevents submission)
2. 201+ character query: input maxLength prevents this, or validation error shown
3. Simulate network error (DevTools > Network > Offline): error toast appears

### Test 4: Geolocation Scenarios
1. Allow geolocation: map centers on simulated location, search uses that location
2. Deny geolocation: map centers on Tokyo Station, search works with default coordinates
3. No geolocation API: same as deny (silent fallback)

### Test 5: Zero Results
1. Search for something unlikely to match nearby (e.g., "underwater cave diving")
2. Verify "No spots found" overlay appears

## Acceptance Criteria

- [ ] Complete search flow works in browser: type query -> see pins on map
- [ ] Geolocation permission flow works correctly (allow + deny)
- [ ] Mobile viewport renders correctly (no horizontal scroll, full-screen map)
- [ ] Error states handled gracefully
- [ ] Zero-results message displayed appropriately
- [ ] Phase 2 coverage: AC-001, AC-002, AC-003, AC-005

## Phase 2 AC Coverage Summary

| AC | Status | Verified By |
|----|--------|-------------|
| AC-001 | Search bar accepts input, returns semantic results | Test 1 step 4-5 |
| AC-002 | Full-screen monochrome map with pan/zoom | Test 1 step 2, Test 2 |
| AC-003 | Accent pins with viewport adjustment, zero-result msg | Test 1 step 5-6, Test 5 |
| AC-005 | Geolocation with Tokyo Station fallback | Test 4 |
