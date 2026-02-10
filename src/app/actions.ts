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
  MAX_VECTOR_DISTANCE,
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
      const timeoutId = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);
      try {
        const embeddingResponse = await openai.embeddings.create(
          { model: EMBEDDING_MODEL, input: trimmedQuery },
          { signal: controller.signal }
        );
        embedding = embeddingResponse.data[0].embedding;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (_e) {
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
        sql: `SELECT s.id, s.name, s.lat, s.lng, s.category, s.description, s.magazine_context,
                     s.google_place_id, s.rating, s.address, s.opening_hours, s.source,
                     v.distance AS vector_distance
              FROM vector_top_k('spots_idx', vector32(?), ?) AS v
              JOIN spots AS s ON s.rowid = v.id
              WHERE v.distance < ?`,
        args: [JSON.stringify(embedding), VECTOR_TOP_K, MAX_VECTOR_DISTANCE],
      });
      rows = result.rows as unknown as Array<Record<string, unknown>>;
    } catch (_e) {
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: 'Search failed. Please try again.',
        },
      };
    }

    // 4. Haversine distance calculation + filter + sort by relevance then distance
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
          googlePlaceId: (row.google_place_id as string) ?? null,
          rating: (row.rating as number) ?? null,
          address: (row.address as string) ?? null,
          openingHours: (row.opening_hours as string) ?? null,
          source: ((row.source as string) ?? 'manual') as SearchResult['source'],
          vectorDistance: row.vector_distance as number,
        };
      })
      .filter((spot) => spot.distance <= DEFAULT_RADIUS_KM)
      .sort((a, b) => a.vectorDistance - b.vectorDistance);

    return { success: true, data: results };
  } catch (_e) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
    };
  }
}
