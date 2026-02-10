# Phase 2 Completion Verification: Map UI + Search Integration

| Item | Details |
|------|---------|
| Phase | Phase 2 |
| Verification Level | L2 (Integration) |
| Dependencies | Tasks 06, 07, 08, 09, 10 all complete |

## Phase 2 Goal
Full-screen monochrome map with search bar, search results displayed as pins, geolocation with fallback.

## Task Completion Checklist

- [ ] Task 06: Map Component -- full-screen monochrome map renders with pan/zoom
- [ ] Task 07: SearchBar Component -- floating search bar triggers Server Action
- [ ] Task 08: Geolocation -- browser location or Tokyo Station fallback
- [ ] Task 09: Search -> Pin Integration -- pins rendered, viewport adjusts, zero-result handled
- [ ] Task 10: Phase 2 Integration Verification -- all browser-based tests pass

## E2E Verification Procedures

### Desktop Chrome Flow
1. Open app -> monochrome map loads full-screen
2. Geolocation prompt -> allow/deny -> correct behavior
3. Type search query -> submit -> pins appear on map
4. Viewport adjusts to show all pins
5. Click pin -> selectedSpot state updates

### Mobile Chrome (DevTools Device Mode)
1. Map fills viewport (100dvh)
2. Search bar at bottom with safe area padding
3. Pins visible and tappable
4. No horizontal scroll

### Acceptance Criteria Coverage
| AC | Status | Verification |
|----|--------|-------------|
| AC-001 | Search accepts input, returns results | Task 10 Test 1 |
| AC-002 | Full-screen monochrome map | Task 10 Test 1+2 |
| AC-003 | Accent pins, viewport adjust, zero-result msg | Task 10 Test 1+5 |
| AC-005 | Geolocation + fallback | Task 10 Test 4 |

## Proceed to Phase 3 Criteria
All items above must be checked before starting Phase 3 tasks (Task 11+).
