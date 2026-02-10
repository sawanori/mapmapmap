import { createClient } from "@libsql/client";
import OpenAI from "openai";
import { searchNearbyPlaces } from "./src/lib/google-places";
import { mapGoogleType, GOOGLE_PLACES_TYPES, EMBEDDING_MODEL } from "./src/lib/constants";

// --- CLI argument parsing ---
function parseArgs(): { lat: number; lng: number; radius: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  let lat: number | undefined;
  let lng: number | undefined;
  let radius = 3000;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--lat":
        lat = parseFloat(args[++i]);
        break;
      case "--lng":
        lng = parseFloat(args[++i]);
        break;
      case "--radius":
        radius = parseInt(args[++i], 10);
        break;
      case "--dry-run":
        dryRun = true;
        break;
    }
  }

  if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
    console.error("Usage: npm run seed:places -- --lat <lat> --lng <lng> [--radius <meters>] [--dry-run]");
    process.exit(1);
  }

  return { lat, lng, radius, dryRun };
}

// --- Environment variable validation ---
const requiredEnvVars = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "OPENAI_API_KEY",
  "GOOGLE_PLACES_API_KEY",
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    console.error("Ensure .env.local is populated or environment variables are set.");
    process.exit(1);
  }
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY!;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function seedPlaces() {
  const { lat, lng, radius, dryRun } = parseArgs();

  console.log(`Fetching places near (${lat}, ${lng}) within ${radius}m...`);
  if (dryRun) console.log("[DRY RUN] No data will be written to the database.\n");

  // 1. Fetch places for each category type
  const allPlaces = new Map<string, Awaited<ReturnType<typeof searchNearbyPlaces>>[number]>();
  let totalFetched = 0;

  for (const type of GOOGLE_PLACES_TYPES) {
    try {
      console.log(`  Fetching type: ${type}...`);
      const places = await searchNearbyPlaces(googleApiKey, { lat, lng }, radius, [type]);
      console.log(`    Found ${places.length} places`);
      totalFetched += places.length;

      for (const place of places) {
        if (!allPlaces.has(place.id)) {
          allPlaces.set(place.id, place);
        }
      }

      // Rate limit delay between requests
      await delay(300);
    } catch (error) {
      console.error(`    Error fetching type ${type}:`, error instanceof Error ? error.message : error);
    }
  }

  const uniquePlaces = Array.from(allPlaces.values());
  console.log(`\nTotal fetched: ${totalFetched}, After dedup: ${uniquePlaces.length}`);

  // 2. Check existing places in DB
  let skipCount = 0;
  let insertCount = 0;
  let errorCount = 0;
  const toInsert: typeof uniquePlaces = [];

  for (const place of uniquePlaces) {
    const existing = await client.execute({
      sql: "SELECT id FROM spots WHERE google_place_id = ?",
      args: [place.id],
    });

    if (existing.rows.length > 0) {
      skipCount++;
    } else {
      toInsert.push(place);
    }
  }

  console.log(`Existing (skip): ${skipCount}, New to insert: ${toInsert.length}\n`);

  // 3. Generate embeddings and insert
  for (let i = 0; i < toInsert.length; i++) {
    const place = toInsert[i];
    const name = place.displayName.text;
    const category = mapGoogleType(place.types);
    const description = place.editorialSummary?.text ?? null;
    const address = place.formattedAddress ?? null;
    const openingHours = place.regularOpeningHours?.weekdayDescriptions
      ? JSON.stringify(place.regularOpeningHours.weekdayDescriptions)
      : null;
    const rating = place.rating ?? null;

    // Build embedding input
    const embeddingInput = description
      ? `${name} ${description} ${place.types.join(" ")}`
      : `${name} ${address ?? ""} ${place.types.join(" ")}`;

    if (dryRun) {
      console.log(`  [${i + 1}/${toInsert.length}] ${name}`);
      console.log(`    Category: ${category}, Rating: ${rating}`);
      console.log(`    Address: ${address}`);
      console.log(`    Description: ${description}`);
      console.log(`    Embedding input: ${embeddingInput}`);
      console.log();
      insertCount++;
      continue;
    }

    try {
      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: embeddingInput,
      });
      const embedding = embeddingResponse.data[0].embedding;

      // Insert into DB
      await client.execute({
        sql: `INSERT INTO spots (name, lat, lng, category, description, magazine_context,
                embedding, google_place_id, rating, address, opening_hours, source)
              VALUES (?, ?, ?, ?, ?, NULL, vector32(?), ?, ?, ?, ?, 'google_places')`,
        args: [
          name,
          place.location.latitude,
          place.location.longitude,
          category,
          description,
          JSON.stringify(embedding),
          place.id,
          rating,
          address,
          openingHours,
        ],
      });

      insertCount++;
      console.log(`  [${i + 1}/${toInsert.length}] Inserted: ${name}`);

      // Rate limit delay between embedding requests
      await delay(200);
    } catch (error) {
      errorCount++;
      console.error(`  [${i + 1}/${toInsert.length}] Error inserting ${name}:`,
        error instanceof Error ? error.message : error);
    }
  }

  console.log(`\nDone! Fetched: ${totalFetched}, Inserted: ${insertCount}, Skipped: ${skipCount}, Errors: ${errorCount}`);
}

seedPlaces();
