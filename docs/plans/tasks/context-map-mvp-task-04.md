# Task 04: Search Server Action (searchSpots) with Haversine Filtering

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-04 |
| Phase | Phase 1: Data Foundation + Search Core |
| Verification Level | L2 (integration -- OpenAI + Turso + geo filtering) |
| Estimated File Count | 2 files (new) |
| Dependencies | Task 02 |

## Overview

Implement the `searchSpots` Server Action that forms the core search pipeline: input validation, OpenAI embedding generation, Turso vector search (`vector_top_k`), Haversine distance calculation, 3km radius filtering, and distance-sorted response. Also implement the Haversine distance utility.

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `src/app/actions.ts` | new | Server Action with `'use server'` directive |
| `src/lib/geo.ts` | new | Haversine distance utility function |

## Implementation Steps

### Step 1: Implement Haversine utility (`src/lib/geo.ts`)
```typescript
/**
 * Calculate the distance between two points on Earth using the Haversine formula.
 * @returns Distance in kilometers
 */
export function getDistanceFromLatLonInKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

### Step 2: Implement Server Action (`src/app/actions.ts`)
```typescript
'use server';

import OpenAI from 'openai';
import { createClient } from '@libsql/client';
import { getDistanceFromLatLonInKm } from '@/lib/geo';
import type { SearchResult } from '@/types/spot';
import {
  VECTOR_TOP_K,
  DEFAULT_RADIUS_KM,
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  EMBEDDING_MODEL,
  EMBEDDING_TIMEOUT_MS,
} from '@/lib/constants';

interface SearchError {
  code: 'VALIDATION_ERROR' | 'EMBEDDING_ERROR' | 'DB_ERROR' | 'UNKNOWN_ERROR';
  message: string;
}

type SearchResponse =
  | { success: true; data: SearchResult[] }
  | { success: false; error: SearchError };

export async function searchSpots(
  query: string,
  userLat: number,
  userLng: number
): Promise<SearchResponse> {
  try {
    // 1. Input validation
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < MIN_QUERY_LENGTH || trimmedQuery.length > MAX_QUERY_LENGTH) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Search text must be between ${MIN_QUERY_LENGTH} and ${MAX_QUERY_LENGTH} characters.`,
        },
      };
    }
    if (userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid coordinates.',
        },
      };
    }

    // 2. Generate embedding via OpenAI
    let embedding: number[];
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

      const embeddingResponse = await openai.embeddings.create(
        { model: EMBEDDING_MODEL, input: trimmedQuery },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      embedding = embeddingResponse.data[0].embedding;
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'EMBEDDING_ERROR',
          message: 'Search failed. Please try again.',
        },
      };
    }

    // 3. Vector search via Turso
    let rows: Array<Record<string, unknown>>;
    try {
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      });

      const result = await client.execute({
        sql: `SELECT s.id, s.name, s.lat, s.lng, s.category, s.description, s.magazine_context
              FROM vector_top_k('spots_idx', vector32(?), ?) AS v
              JOIN spots AS s ON s.rowid = v.id`,
        args: [JSON.stringify(embedding), VECTOR_TOP_K],
      });
      rows = result.rows as unknown as Array<Record<string, unknown>>;
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: 'Search failed. Please try again.',
        },
      };
    }

    // 4. Haversine distance calculation + filter + sort
    const results: SearchResult[] = rows
      .map((row) => {
        const distance = getDistanceFromLatLonInKm(
          userLat,
          userLng,
          row.lat as number,
          row.lng as number
        );
        return {
          id: row.id as number,
          name: row.name as string,
          lat: row.lat as number,
          lng: row.lng as number,
          category: row.category as string,
          description: (row.description as string) ?? null,
          magazineContext: (row.magazine_context as string) ?? null,
          createdAt: null,
          distance,
        };
      })
      .filter((spot) => spot.distance <= DEFAULT_RADIUS_KM)
      .sort((a, b) => a.distance - b.distance);

    return { success: true, data: results };
  } catch (e) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
    };
  }
}
```

## Acceptance Criteria

- [x] AC-001 (partial): `searchSpots` accepts natural language input and returns semantically relevant spots
- [x] AC-006: Haversine distance correctly calculated, 3km filter applied, results sorted by distance ascending
- [x] Input validation rejects: empty strings, whitespace-only strings, strings > 200 characters
- [x] Input validation rejects invalid coordinates (lat outside -90~90, lng outside -180~180)
- [x] OpenAI API timeout at 5 seconds returns `EMBEDDING_ERROR`
- [x] Turso query errors return `DB_ERROR`
- [x] `SearchResponse` type matches Design Doc exactly (discriminated union with success/error)
- [x] No technical details (stack traces, API keys) in error messages
- [x] `tsc --noEmit` passes

## Verification Method

```bash
# 1. TypeScript compilation
npx tsc --noEmit

# 2. Functional verification (requires seeded data from Task 03)
npx tsx -e "
import { searchSpots } from './src/app/actions';
// Happy path
const result = await searchSpots('quiet coffee shop', 35.6812, 139.7671);
console.log('Success:', result.success);
if (result.success) {
  console.log('Results count:', result.data.length);
  console.log('First result:', result.data[0]?.name, result.data[0]?.distance, 'km');
  console.log('Sorted:', result.data.every((r, i) => i === 0 || r.distance >= result.data[i-1].distance));
}

// Validation error
const empty = await searchSpots('', 35.6812, 139.7671);
console.log('Empty query error:', empty.success === false && empty.error.code === 'VALIDATION_ERROR');

// Long query
const long = await searchSpots('a'.repeat(201), 35.6812, 139.7671);
console.log('Long query error:', long.success === false && long.error.code === 'VALIDATION_ERROR');
"
```

## Notes

- The `createClient` is instantiated per-request intentionally for serverless compatibility
- The `vector_top_k` SQL syntax follows Turso's native vector search documentation
- If `vector_top_k` syntax differs from documentation, fallback to `vector_distance_cos` with ORDER BY LIMIT (see Risk R-003 in work plan)
