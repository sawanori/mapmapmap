import { createClient } from "@libsql/client";
import OpenAI from "openai";
import spotsData from "./src/data/spots.json";
import { EMBEDDING_MODEL } from "./src/lib/constants";

// Validate required environment variables
const requiredEnvVars = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "OPENAI_API_KEY"] as const;
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
