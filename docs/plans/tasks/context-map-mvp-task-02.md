# Task 02: Database Schema Definition and Connection Setup

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-02 |
| Phase | Phase 1: Data Foundation + Search Core |
| Verification Level | L1 (unit -- schema applied, types compile) |
| Estimated File Count | 5 files (new) |
| Dependencies | Task 01 |

## Overview

Establish Turso DB connection via Drizzle ORM, define `spots` table schema with `F32_BLOB(1536)` and DiskANN index, create TypeScript type definitions and application constants.

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `src/db/index.ts` | new | Turso connection via Drizzle |
| `src/db/schema.ts` | new | Drizzle schema for spots table |
| `src/types/spot.ts` | new | SpotRecord, SearchResult, UserLocation types |
| `src/lib/constants.ts` | new | All application constants |
| `drizzle/0001_create_spots.sql` | new | Custom SQL migration |

## Implementation Steps

### Step 1: Implement DB connection (`src/db/index.ts`)
```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client);
```

### Step 2: Implement Drizzle schema (`src/db/schema.ts`)
```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const spots = sqliteTable("spots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  magazineContext: text("magazine_context"),
  embedding: text("embedding"), // Placeholder -- actual column is F32_BLOB(1536) via custom migration
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export type Spot = typeof spots.$inferSelect;
export type NewSpot = typeof spots.$inferInsert;
```

### Step 3: Implement type definitions (`src/types/spot.ts`)
```typescript
export interface SpotRecord {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string;
  description: string | null;
  magazineContext: string | null;
  createdAt: string | null;
}

export interface SearchResult extends SpotRecord {
  distance: number; // km
}

export interface UserLocation {
  lat: number;
  lng: number;
  isDefault: boolean; // true = Tokyo Station fallback
}
```

### Step 4: Implement constants (`src/lib/constants.ts`)
```typescript
// Search parameters
export const VECTOR_TOP_K = 50;
export const DEFAULT_RADIUS_KM = 3.0;
export const MAX_QUERY_LENGTH = 200;
export const MIN_QUERY_LENGTH = 1;

// Geolocation fallback (Tokyo Station)
export const DEFAULT_LAT = 35.6812;
export const DEFAULT_LNG = 139.7671;
export const DEFAULT_ZOOM = 14;

// OpenAI
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_TIMEOUT_MS = 5000;

// Mapbox
export const MAP_STYLE = 'mapbox://styles/mapbox/light-v11';
export const PIN_COLOR = '#1a1a6e';
```

### Step 5: Create custom SQL migration (`drizzle/0001_create_spots.sql`)
```sql
CREATE TABLE IF NOT EXISTS spots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  magazine_context TEXT,
  embedding F32_BLOB(1536),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS spots_idx ON spots (
  libsql_vector_idx(embedding, 'metric=cosine')
);
```

### Step 6: Run migration against Turso
```bash
# Apply the custom migration directly via Turso CLI or a script
npx tsx -e "
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
const client = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
const sql = readFileSync('drizzle/0001_create_spots.sql', 'utf-8');
for (const stmt of sql.split(';').filter(s => s.trim())) {
  await client.execute(stmt);
}
console.log('Migration applied successfully');
"
```

## Acceptance Criteria

- [x] `src/db/index.ts` successfully connects to Turso (verified by a simple query returning no error)
- [x] `spots` table exists in Turso with `F32_BLOB(1536)` column and DiskANN index
- [x] TypeScript types in `src/types/spot.ts` match Design Doc interface definitions exactly
- [x] All constants in `src/lib/constants.ts` match Design Doc specification
- [x] `tsc --noEmit` passes without errors for all new files

## Verification Method

```bash
# 1. Verify DB connection and schema
npx tsx -e "
import { createClient } from '@libsql/client';
const client = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
const result = await client.execute('PRAGMA table_info(spots)');
console.log('Table columns:', result.rows.map(r => r.name));
"

# 2. Verify TypeScript compilation
npx tsc --noEmit

# 3. Verify constants match Design Doc
grep 'VECTOR_TOP_K = 50' src/lib/constants.ts
grep 'DEFAULT_RADIUS_KM = 3.0' src/lib/constants.ts
grep "PIN_COLOR = '#1a1a6e'" src/lib/constants.ts
```
