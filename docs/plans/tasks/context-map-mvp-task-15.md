# Task 15: Final E2E Verification and Quality Assurance

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-15 |
| Phase | Phase 3: Spot Detail + Polish |
| Verification Level | L3 (E2E -- complete user journey) |
| Estimated File Count | 0 files (verification only) |
| Dependencies | Task 14 |

## Overview

Complete end-to-end verification of the entire user journey across desktop and mobile. Confirm all 8 acceptance criteria (AC-001 through AC-008), non-functional requirements (performance, security, accessibility), and error scenarios.

## Target Files

No new files. This is a verification-only task.

## Verification Procedure

### E2E Flow A: Desktop Chrome Happy Path
1. Open `http://localhost:3000`
2. **AC-002**: Monochrome map loads full-screen (white/gray style, buildings light gray)
3. **AC-005**: Geolocation prompt appears. Click "Allow". Map centers on location.
4. **AC-001**: Type "quiet coffee reading" in search bar, submit
5. **AC-001**: Results return within 2 seconds
6. **AC-003**: Accent-colored pins (#1a1a6e) appear on map
7. **AC-003**: Viewport auto-adjusts to encompass all pins
8. **AC-004**: Click a pin. SpotCard slides up from bottom with backdrop blur.
9. **AC-004**: Verify displayed: name, category, distance, description, magazine context
10. **AC-007**: Click "Open in Google Maps". New tab opens with correct coordinates.
11. Close SpotCard (click backdrop)
12. New search: "late night bar". Previous pins cleared, new pins appear.

### E2E Flow B: Mobile Chrome (DevTools device mode or real device)
1. Same flow as Flow A on iPhone 14 Pro viewport (390x844)
2. Verify: map fills full viewport, no horizontal scroll
3. Verify: search bar at bottom with safe area padding
4. Verify: SpotCard can be dismissed by drag gesture
5. Verify: keyboard shows "search" key when input focused
6. Verify: pin tap works on touch device

### E2E Flow C: Geolocation Denied
1. Open in incognito / reset permissions
2. **AC-005**: Deny geolocation permission
3. Map centers on Tokyo Station (35.6812, 139.7671) silently
4. Search works normally with Tokyo Station as reference point
5. Results show distance from Tokyo Station

### E2E Flow D: Error Scenarios
1. **AC-001 (unhappy)**: Submit empty query -> validation prevents submission (button disabled or inline error)
2. **AC-001 (unhappy)**: Type 200 characters -> character count visible, search works
3. **AC-001 (edge)**: Search single character "night" -> results returned normally
4. **AC-001 (edge)**: Search English text "quiet coffee shop" -> results returned
5. **AC-003 (unhappy)**: Search something unlikely -> "No spots found" message

### Non-Functional Verification

#### Performance (measured via Lighthouse):
- [ ] Search response time: < 2s (P95) -- measured via DevTools Network tab
- [ ] FCP: < 1.5s
- [ ] LCP: < 2.5s

#### Security:
- [ ] DevTools Network tab: no `OPENAI_API_KEY` or `TURSO_AUTH_TOKEN` visible in requests
- [ ] Only `NEXT_PUBLIC_MAPBOX_TOKEN` visible in Mapbox tile requests (expected)
- [ ] Server Action calls go through Next.js server (not directly to OpenAI/Turso from browser)

#### Accessibility:
- [ ] Tab key focuses search bar input
- [ ] Escape key closes SpotCard modal
- [ ] ARIA labels present on: search input, search button, SpotCard modal, Google Maps link
- [ ] Lighthouse Accessibility score > 90

## Acceptance Criteria (Final Checklist)

| AC | Requirement | Status |
|----|------------|--------|
| AC-001 | Vibe search returns semantically relevant results within 2 seconds | [ ] |
| AC-002 | Full-screen monochrome map with pan/zoom on all target browsers | [ ] |
| AC-003 | Accent-colored pins with viewport auto-adjustment, zero-result message | [ ] |
| AC-004 | BottomSheet modal with all required fields, blur backdrop, dismissible | [ ] |
| AC-005 | Geolocation permission with Tokyo Station fallback | [ ] |
| AC-006 | Haversine distance calculation, 3km filter, distance-sorted results | [ ] |
| AC-007 | Google Maps external link opens correct location | [ ] |
| AC-008 | Seed data successfully ingested and searchable | [ ] |

## Non-Functional Checklist

| Category | Requirement | Status |
|----------|------------|--------|
| Performance | Search P95 < 2s | [ ] |
| Performance | FCP < 1.5s | [ ] |
| Performance | LCP < 2.5s | [ ] |
| Security | API keys server-side only | [ ] |
| Security | Input validation (1-200 chars) | [ ] |
| Accessibility | Keyboard navigation | [ ] |
| Accessibility | ARIA labels | [ ] |
| Responsive | iOS Safari viewport | [ ] |
| Responsive | Android Chrome viewport | [ ] |

## Notes

- If any acceptance criterion fails, create a fix task and re-verify
- Performance measurements on localhost may differ from production; record baseline for comparison
- Accessibility audit via Lighthouse provides automated checks; manual keyboard testing is also required
