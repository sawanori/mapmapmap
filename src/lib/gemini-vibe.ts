import { GoogleGenAI } from '@google/genai';
import type { GooglePlace } from './google-places';
import type { MoodScore } from '@/types/vibe';

const MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 2;
const TIMEOUT_MS = 10_000;
const CIRCUIT_BREAKER_THRESHOLD = 5;

const SYSTEM_PROMPT = `You are a specialized 'City Curator' editor for a high-end lifestyle magazine.

Analyze the raw Google Maps data (reviews, photos, attributes) and output a JSON object describing the 'Vibe' of the place.

Rules:
- Ignore generic praises like 'good food' or 'nice staff'. Focus on ATMOSPHERE.
- Catchphrase must be poetic, emotional, and short (max 30 chars in Japanese).
- If the place is a chain store or fast food, set 'is_rejected' to true.
- Extract 3 hashtags that describe the *situation* to use this place (e.g., #FirstDate, #SoloWork, #DeepTalk).
- mood_score must include 'chill', 'party', 'focus' dimensions (each 0-100).

Output ONLY a valid JSON object with this exact schema:
{
  "catchphrase": "string (max 30 chars in Japanese)",
  "vibe_tags": ["string", "string", "string"],
  "mood_score": { "chill": number, "party": number, "focus": number },
  "hidden_gems_info": "string",
  "is_rejected": boolean
}`;

export interface GeminiVibeResult {
  catchphrase: string;
  vibe_tags: string[];
  mood_score: MoodScore;
  hidden_gems_info: string;
  is_rejected: boolean;
}

function validateVibeResult(data: unknown): data is GeminiVibeResult {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.catchphrase !== 'string') return false;
  if (!Array.isArray(obj.vibe_tags) || obj.vibe_tags.length === 0) return false;
  if (typeof obj.is_rejected !== 'boolean') return false;
  if (typeof obj.hidden_gems_info !== 'string') return false;

  const ms = obj.mood_score;
  if (typeof ms !== 'object' || ms === null) return false;
  const mood = ms as Record<string, unknown>;
  if (
    typeof mood.chill !== 'number' ||
    typeof mood.party !== 'number' ||
    typeof mood.focus !== 'number'
  )
    return false;

  return true;
}

function createDegradedResult(): GeminiVibeResult {
  return {
    catchphrase: 'ここにしかない空気がある',
    vibe_tags: ['#隠れ家', '#散策', '#発見'],
    mood_score: { chill: 50, party: 50, focus: 50 },
    hidden_gems_info: '',
    is_rejected: false,
  };
}

function buildPlacePrompt(place: GooglePlace): string {
  const reviewTexts = (place.reviews ?? [])
    .slice(0, 5)
    .map(
      (r) =>
        `[${r.rating}★] ${r.text?.text ?? '(no text)'}`,
    )
    .join('\n');

  return JSON.stringify({
    name: place.displayName.text,
    types: place.types,
    rating: place.rating,
    address: place.formattedAddress,
    editorial_summary: place.editorialSummary?.text,
    reviews: reviewTexts || '(no reviews)',
    photo_count: place.photos?.length ?? 0,
  });
}

let consecutiveRateLimits = 0;

export async function convertToVibe(
  place: GooglePlace,
  apiKey: string,
): Promise<GeminiVibeResult> {
  if (consecutiveRateLimits >= CIRCUIT_BREAKER_THRESHOLD) {
    console.warn('Gemini circuit breaker open. Returning degraded result.');
    return createDegradedResult();
  }

  const client = new GoogleGenAI({ apiKey });
  const placeData = buildPlacePrompt(place);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await client.models.generateContent({
          model: MODEL,
          contents: `Analyze this place and output JSON:\n\n${placeData}`,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
          },
        });

        consecutiveRateLimits = 0;

        const text = response.text ?? '';
        const parsed = JSON.parse(text);

        if (validateVibeResult(parsed)) {
          return parsed;
        }

        console.warn('Gemini returned invalid structure, using degraded result');
        return createDegradedResult();
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: unknown) {
      const isRateLimit =
        error instanceof Error && error.message.includes('429');

      if (isRateLimit) {
        consecutiveRateLimits++;
        if (consecutiveRateLimits >= CIRCUIT_BREAKER_THRESHOLD) {
          console.warn('Gemini circuit breaker triggered.');
          return createDegradedResult();
        }
      }

      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      console.error('Gemini conversion failed after retries:', error);
      return createDegradedResult();
    }
  }

  return createDegradedResult();
}

/**
 * 複数の場所をバッチ変換する。並列数を制限して Rate Limit を回避。
 */
export async function batchConvertToVibe(
  places: GooglePlace[],
  apiKey: string,
  concurrency = 5,
): Promise<Map<string, GeminiVibeResult>> {
  const results = new Map<string, GeminiVibeResult>();

  for (let i = 0; i < places.length; i += concurrency) {
    const batch = places.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (place) => {
        const result = await convertToVibe(place, apiKey);
        return { id: place.id, result };
      }),
    );

    for (const { id, result } of batchResults) {
      results.set(id, result);
    }

    // Circuit breaker が開いていたら残りスキップ
    if (consecutiveRateLimits >= CIRCUIT_BREAKER_THRESHOLD) {
      for (let j = i + concurrency; j < places.length; j++) {
        results.set(places[j].id, createDegradedResult());
      }
      break;
    }
  }

  return results;
}

/** テスト用: circuit breaker をリセット */
export function resetCircuitBreaker(): void {
  consecutiveRateLimits = 0;
}
