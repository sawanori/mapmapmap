# Task 03: Seed Script Implementation and Data Ingestion

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-03 |
| Phase | Phase 1: Data Foundation + Search Core |
| Verification Level | L2 (integration -- OpenAI API + Turso write) |
| Estimated File Count | 2 files (new) + 1 file (modify) |
| Dependencies | Task 02 |

## Overview

Implement `seed.ts` script that populates Turso with 20-50 Tokyo area spot data including OpenAI-generated embeddings. The script calls OpenAI Embedding API for each spot and inserts results using Turso's `vector32()` function within a transaction.

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `seed.ts` | new | Seed script at project root |
| `src/data/spots.json` | new | Raw spot data (optional, for reference/re-seeding) |
| `package.json` | modify | Add `"seed"` script |

## Implementation Steps

### Step 1: Create spot data (`src/data/spots.json`)
Design 30+ spots with geographic spread across central Tokyo:
- Categories: Cafe, Bar, Bookstore, Gallery, Park, Restaurant, Library, Music Venue, Temple, etc.
- Magazine contexts: BRUTUS, Hanako, POPEYE, Casa BRUTUS, etc.
- Geographic areas: Shibuya, Shinjuku, Daikanyama, Shimokitazawa, Yanaka, Kagurazaka, etc.

Example entry:
```json
{
  "name": "Fuglen Tokyo",
  "lat": 35.6614,
  "lng": 139.6938,
  "category": "Cafe",
  "description": "Norwegian coffee bar with vintage furniture. Daytime is a specialty coffee shop, evenings transform into a cocktail bar. Known for its Scandinavian minimalist design and carefully curated vinyl collection.",
  "magazineContext": "BRUTUS 2024/01 Coffee Culture Special"
}
```

### Step 2: Implement `seed.ts`
```typescript
import { createClient } from "@libsql/client";
import OpenAI from "openai";
import spotsData from "./src/data/spots.json";
import { EMBEDDING_MODEL } from "./src/lib/constants";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function seed() {
  console.log(`Seeding ${spotsData.length} spots...`);

  // Use transaction for atomicity
  const tx = await client.transaction("write");

  try {
    for (let i = 0; i < spotsData.length; i++) {
      const spot = spotsData[i];
      const embeddingInput = `${spot.name} ${spot.description} ${spot.magazineContext}`;

      // Generate embedding via OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: embeddingInput,
      });
      const embedding = embeddingResponse.data[0].embedding;

      // Insert spot with vector32() for F32_BLOB
      await tx.execute({
        sql: `INSERT INTO spots (name, lat, lng, category, description, magazine_context, embedding)
              VALUES (?, ?, ?, ?, ?, ?, vector32(?))`,
        args: [
          spot.name,
          spot.lat,
          spot.lng,
          spot.category,
          spot.description,
          spot.magazineContext,
          JSON.stringify(embedding),
        ],
      });

      console.log(`  [${i + 1}/${spotsData.length}] Inserted: ${spot.name}`);
    }

    await tx.commit();
    console.log(`\nSuccessfully seeded ${spotsData.length} spots.`);
  } catch (error) {
    await tx.rollback();
    console.error("Seed failed, transaction rolled back:", error);
    process.exit(1);
  }
}

seed();
```

### Step 3: Add npm script to `package.json`
Add to `"scripts"`:
```json
"seed": "npx tsx seed.ts"
```

### Step 4: Execute seed and verify
```bash
npm run seed
```

## Acceptance Criteria

- [x] AC-008: `npm run seed` executes successfully and inserts all spot data
- [x] Each spot has all required fields populated including embedding (F32_BLOB)
- [x] Transaction rollback on error -- no partial data in database
- [x] Console output confirms number of spots inserted (e.g., "Successfully seeded 30 spots.")
- [x] Data variety: at least 3 distinct categories, at least 2 distinct magazine contexts
- [x] Geographic spread: spots across at least 4 different Tokyo neighborhoods

## Verification Method

```bash
# 1. Run seed
npm run seed

# 2. Verify data count
npx tsx -e "
import { createClient } from '@libsql/client';
const client = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
const count = await client.execute('SELECT COUNT(*) as count FROM spots');
console.log('Spot count:', count.rows[0].count);
const categories = await client.execute('SELECT DISTINCT category FROM spots');
console.log('Categories:', categories.rows.map(r => r.category));
const contexts = await client.execute('SELECT DISTINCT magazine_context FROM spots WHERE magazine_context IS NOT NULL');
console.log('Magazine contexts:', contexts.rows.length);
"
```
