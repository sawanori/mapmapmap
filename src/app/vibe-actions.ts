'use server';

import { searchByText, getPhotoUrl } from '@/lib/google-places';
import type { GooglePlace } from '@/lib/google-places';
import { isChainStore } from '@/lib/chain-filter';
import { batchConvertToVibe, resetCircuitBreaker } from '@/lib/gemini-vibe';
import { selectHeroPhoto } from '@/lib/photo-curator';
import { getDistanceFromLatLonInKm } from '@/lib/geo';
import { mapGoogleType, DEFAULT_RADIUS_KM } from '@/lib/constants';
import { MOOD_QUERIES } from '@/types/vibe';
import type { VibePlace, Mood } from '@/types/vibe';
import { createClient } from '@libsql/client';

const MAX_GEMINI_PLACES = 10;
const RADIUS_EXPANSION_FACTOR = 1.5;

interface VibeSearchResponse {
  success: boolean;
  data: VibePlace[];
  message?: string;
}

async function getCachedVibes(
  placeIds: string[],
  mood: Mood,
): Promise<Map<string, VibePlace>> {
  if (placeIds.length === 0) return new Map();

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    const placeholders = placeIds.map(() => '?').join(',');
    const result = await client.execute({
      sql: `SELECT place_id, vibe_json FROM vibe_places_cache
            WHERE mood = ? AND place_id IN (${placeholders})
            AND expires_at > datetime('now')`,
      args: [mood, ...placeIds],
    });

    const cached = new Map<string, VibePlace>();
    for (const row of result.rows) {
      try {
        const vibe = JSON.parse(row.vibe_json as string) as VibePlace;
        cached.set(row.place_id as string, vibe);
      } catch {
        // Skip corrupted cache entries
      }
    }
    return cached;
  } catch {
    return new Map();
  }
}

async function setCachedVibes(
  vibes: Array<{ placeId: string; mood: Mood; vibe: VibePlace }>,
): Promise<void> {
  if (vibes.length === 0) return;

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    for (const { placeId, mood, vibe } of vibes) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO vibe_places_cache (place_id, mood, vibe_json, expires_at)
              VALUES (?, ?, ?, datetime('now', '+7 days'))`,
        args: [placeId, mood, JSON.stringify(vibe)],
      });
    }
  } catch {
    // Cache write failures are non-critical
  }
}

function buildVibePlace(
  place: GooglePlace,
  vibeResult: {
    catchphrase: string;
    vibe_tags: string[];
    mood_score: { chill: number; party: number; focus: number };
    hidden_gems_info: string;
    is_rejected: boolean;
  },
  userLat: number,
  userLng: number,
  apiKey: string,
): VibePlace {
  const heroPhoto = selectHeroPhoto(place.photos);
  const heroImageUrl = heroPhoto
    ? getPhotoUrl(heroPhoto.name, apiKey)
    : '';

  return {
    id: place.id,
    name: place.displayName.text,
    catchphrase: vibeResult.catchphrase,
    vibeTags: vibeResult.vibe_tags,
    heroImageUrl,
    moodScore: vibeResult.mood_score,
    hiddenGemsInfo: vibeResult.hidden_gems_info,
    isRejected: vibeResult.is_rejected,
    lat: place.location.latitude,
    lng: place.location.longitude,
    category: mapGoogleType(place.types),
    rating: place.rating ?? null,
    address: place.formattedAddress ?? null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions ?? null,
    distance: getDistanceFromLatLonInKm(
      userLat,
      userLng,
      place.location.latitude,
      place.location.longitude,
    ),
  };
}

export async function searchByMood(
  mood: Mood,
  lat: number,
  lng: number,
): Promise<VibeSearchResponse> {
  const placesApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!placesApiKey || !openaiApiKey) {
    return { success: false, data: [], message: 'API keys not configured.' };
  }

  resetCircuitBreaker();

  const textQuery = MOOD_QUERIES[mood];
  const radiusMeters = DEFAULT_RADIUS_KM * 1000;

  // 1. Google Places Text Search
  let places = await searchByText(
    placesApiKey,
    textQuery,
    { lat, lng },
    radiusMeters,
    20,
  );

  // 2. Chain store pre-filter
  places = places.filter((p) => !isChainStore(p.displayName.text));

  // 3. If all filtered out, expand radius and retry once
  if (places.length === 0) {
    places = await searchByText(
      placesApiKey,
      textQuery,
      { lat, lng },
      radiusMeters * RADIUS_EXPANSION_FACTOR,
      20,
    );
    places = places.filter((p) => !isChainStore(p.displayName.text));
  }

  if (places.length === 0) {
    return {
      success: true,
      data: [],
      message: '近くにスポットが見つかりませんでした',
    };
  }

  // 4. Limit to MAX_GEMINI_PLACES for cost control
  const placesToConvert = places.slice(0, MAX_GEMINI_PLACES);

  // 5. Check cache
  const placeIds = placesToConvert.map((p) => p.id);
  const cached = await getCachedVibes(placeIds, mood);

  // 6. Convert uncached places via Gemini
  const uncachedPlaces = placesToConvert.filter((p) => !cached.has(p.id));

  let geminiResults = new Map<
    string,
    {
      catchphrase: string;
      vibe_tags: string[];
      mood_score: { chill: number; party: number; focus: number };
      hidden_gems_info: string;
      is_rejected: boolean;
    }
  >();

  if (uncachedPlaces.length > 0) {
    geminiResults = await batchConvertToVibe(uncachedPlaces, openaiApiKey, 5);
  }

  // 7. Build VibePlace results
  const vibes: VibePlace[] = [];
  const toCache: Array<{ placeId: string; mood: Mood; vibe: VibePlace }> = [];

  for (const place of placesToConvert) {
    const cachedVibe = cached.get(place.id);
    if (cachedVibe) {
      // Recalculate distance from current position
      cachedVibe.distance = getDistanceFromLatLonInKm(
        lat,
        lng,
        cachedVibe.lat,
        cachedVibe.lng,
      );
      vibes.push(cachedVibe);
      continue;
    }

    const vibeResult = geminiResults.get(place.id);
    if (!vibeResult) continue;

    const vibe = buildVibePlace(place, vibeResult, lat, lng, placesApiKey);
    vibes.push(vibe);
    toCache.push({ placeId: place.id, mood, vibe });
  }

  // 8. Cache new results (fire and forget)
  setCachedVibes(toCache).catch(() => {});

  // 9. Filter rejected + sort by mood score descending
  const filtered = vibes
    .filter((v) => !v.isRejected)
    .sort((a, b) => b.moodScore[mood] - a.moodScore[mood]);

  return { success: true, data: filtered };
}
