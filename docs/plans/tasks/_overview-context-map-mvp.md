# Overall Design Document: Context-Map MVP

Generation Date: 2026-02-10
Target Plan Document: docs/plans/work-plan.md

## Project Overview

### Purpose and Goals
Context-Map MVP -- a map web application that allows users to search for places using natural language "vibe" queries. Users type a mood or context (e.g., "quiet coffee shop for reading") and the app returns semantically relevant nearby spots displayed as pins on a monochrome map.

### Background and Context
New project (greenfield). No existing codebase. Technology stack: Next.js 15 (App Router) + Turso (libSQL with native vector search) + Mapbox GL JS + OpenAI Embeddings. Strategy B: Implementation-First Development with Vertical Slice approach across 3 phases.

## Task Division Design

### Division Policy
Tasks are divided following the work plan's Vertical Slice approach at single-commit granularity. Each phase delivers an end-to-end verifiable slice of functionality.

- **Phase 1** (Tasks 01-05): Data foundation + search core. Backend-only, verifiable at L2 (integration).
- **Phase 2** (Tasks 06-10): Map UI + search integration. Frontend + backend integration, verifiable at L2 (browser).
- **Phase 3** (Tasks 11-15): Spot detail + polish. Complete user journey, verifiable at L3 (E2E).

Verification level distribution:
- L1 (unit): Tasks 01, 02
- L2 (integration): Tasks 03, 04, 06, 07, 08, 09, 11, 12, 13
- L3 (E2E): Tasks 14, 15

### Inter-task Relationship Map
```
Task 01: Project Scaffolding         -> Deliverable: package.json, tsconfig.json, next.config.ts, etc.
  |
Task 02: DB Schema + Connection      -> Deliverable: src/db/, src/types/, src/lib/constants.ts, migration SQL
  |         \
  |          \
Task 03: Seed Script                  -> Deliverable: seed.ts, spot data in Turso
  |           |
  |     Task 04: Search Server Action -> Deliverable: src/app/actions.ts, src/lib/geo.ts
  |           |
Task 05: Phase 1 Integration Verification (depends on 03 + 04)
  |
  +---> Task 06: Map Component        -> Deliverable: src/components/Map.tsx
  |
  +---> Task 07: SearchBar Component  -> Deliverable: src/components/SearchBar.tsx
            |
        Task 08: Geolocation          -> Modifies: SearchBar.tsx, Map.tsx
            |
            +--- Task 06 -+
                           |
        Task 09: Search -> Pin Integration -> Modifies: Map.tsx, page.tsx
            |
        Task 10: Phase 2 Integration Verification
            |
        Task 11: SpotCard BottomSheet  -> Deliverable: src/components/SpotCard.tsx
            |
        Task 12: Google Maps Link      -> Modifies: SpotCard.tsx
            |
        Task 13: Error Handling        -> Modifies: actions.ts, SearchBar.tsx, Map.tsx
            |
        Task 14: Responsive Polish     -> Modifies: layout.tsx, Map.tsx, SearchBar.tsx, SpotCard.tsx
            |
        Task 15: Final E2E Verification
```

### Interface Change Impact Analysis
| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|-------------------|-------------------|
| (none - greenfield) | searchSpots(query, lat, lng) | N/A | Task 04 |
| (none) | SearchResult type | N/A | Task 02 |
| (none) | UserLocation type | N/A | Task 02 |
| Turso Raw SQL rows | SpotRecord[] | Yes (type mapping) | Task 04 |
| Geolocation API Position | UserLocation | Yes (conversion) | Task 08 |

### Common Processing Points
- **Type definitions** (`src/types/spot.ts`): Created in Task 02, consumed by Tasks 04, 06, 07, 09, 11
- **Constants** (`src/lib/constants.ts`): Created in Task 02, consumed by Tasks 04, 06, 07, 08, 09
- **DB connection** (`src/db/index.ts`): Created in Task 02, consumed by Tasks 03, 04
- **Haversine utility** (`src/lib/geo.ts`): Created in Task 04, consumed by Task 04 only (server-side)

## Implementation Considerations

### Principles to Maintain Throughout
1. TypeScript strict mode -- all files must pass strict type checking
2. Server-side API keys -- only `NEXT_PUBLIC_MAPBOX_TOKEN` exposed to client
3. Mobile-first Tailwind CSS styling
4. Server Components by default, `'use client'` only when interactive state is needed
5. Server Actions for data fetching (no API routes)

### Risks and Countermeasures
- Risk: Turso F32_BLOB / DiskANN may behave unexpectedly
  Countermeasure: Verify in Task 02 migration. Fallback: TEXT column with app-layer cosine calculation
- Risk: react-map-gl SSR issues with Next.js 15 App Router
  Countermeasure: Use `next/dynamic` with `ssr: false` in Task 06
- Risk: OpenAI API latency exceeds 2s budget
  Countermeasure: 5-second timeout with error response in Task 04
- Risk: Mobile keyboard obscures search bar
  Countermeasure: Use `visualViewport` API in Task 14

### Impact Scope Management
- Allowed change scope: All files under `src/`, root config files, `seed.ts`
- No-change areas: `docs/` directory (documentation only, not modified by implementation tasks)
