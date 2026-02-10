import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GooglePlace } from './google-places';

const VALID_RESPONSE = JSON.stringify({
  catchphrase: '夜に溶ける珈琲の香り',
  vibe_tags: ['#深夜の読書', '#照明暗め', '#一人時間'],
  mood_score: { chill: 85, party: 10, focus: 70 },
  hidden_gems_info: '奥の席にコンセントあり',
  is_rejected: false,
});

let mockGenerateContent = vi.fn().mockResolvedValue({ text: VALID_RESPONSE });

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    };
  },
}));

function makeMockPlace(id: string, name: string): GooglePlace {
  return {
    id,
    displayName: { text: name, languageCode: 'ja' },
    location: { latitude: 35.65, longitude: 139.7 },
    types: ['cafe'],
    rating: 4.2,
    formattedAddress: '東京都渋谷区',
    reviews: [
      {
        name: `places/${id}/reviews/1`,
        relativePublishTimeDescription: '1か月前',
        rating: 5,
        text: { text: '静かで落ち着ける場所です', languageCode: 'ja' },
        authorAttribution: { displayName: 'User1' },
      },
    ],
    photos: [],
  };
}

describe('convertToVibe', () => {
  beforeEach(async () => {
    mockGenerateContent = vi.fn().mockResolvedValue({ text: VALID_RESPONSE });
    const { resetCircuitBreaker } = await import('./gemini-vibe');
    resetCircuitBreaker();
  });

  it('should convert a place to vibe result', async () => {
    const { convertToVibe } = await import('./gemini-vibe');
    const place = makeMockPlace('place_1', 'カフェ モカ');
    const result = await convertToVibe(place, 'test-api-key');

    expect(result.catchphrase).toBe('夜に溶ける珈琲の香り');
    expect(result.vibe_tags).toHaveLength(3);
    expect(result.mood_score.chill).toBe(85);
    expect(result.mood_score.party).toBe(10);
    expect(result.mood_score.focus).toBe(70);
    expect(result.hidden_gems_info).toBe('奥の席にコンセントあり');
    expect(result.is_rejected).toBe(false);
  });

  it('should return degraded result on invalid JSON structure', async () => {
    mockGenerateContent = vi
      .fn()
      .mockResolvedValue({ text: '{"invalid": true}' });

    const { convertToVibe } = await import('./gemini-vibe');
    const place = makeMockPlace('place_2', 'テスト店');
    const result = await convertToVibe(place, 'test-api-key');

    expect(result.catchphrase).toBe('ここにしかない空気がある');
    expect(result.mood_score.chill).toBe(50);
  });

  it('should return degraded result on API error after retries', async () => {
    mockGenerateContent = vi
      .fn()
      .mockRejectedValue(new Error('500 Internal Server Error'));

    const { convertToVibe } = await import('./gemini-vibe');
    const place = makeMockPlace('place_3', 'エラー店');
    const result = await convertToVibe(place, 'test-api-key');

    expect(result.catchphrase).toBe('ここにしかない空気がある');
    expect(mockGenerateContent).toHaveBeenCalledTimes(3); // initial + 2 retries
  }, 15_000);
});

describe('batchConvertToVibe', () => {
  beforeEach(async () => {
    mockGenerateContent = vi.fn().mockResolvedValue({ text: VALID_RESPONSE });
    const { resetCircuitBreaker } = await import('./gemini-vibe');
    resetCircuitBreaker();
  });

  it('should convert multiple places', async () => {
    const { batchConvertToVibe } = await import('./gemini-vibe');
    const places = [
      makeMockPlace('p1', 'カフェA'),
      makeMockPlace('p2', 'カフェB'),
      makeMockPlace('p3', 'カフェC'),
    ];

    const results = await batchConvertToVibe(places, 'test-key', 2);

    expect(results.size).toBe(3);
    expect(results.get('p1')?.catchphrase).toBe('夜に溶ける珈琲の香り');
    expect(results.get('p2')?.catchphrase).toBe('夜に溶ける珈琲の香り');
    expect(results.get('p3')?.catchphrase).toBe('夜に溶ける珈琲の香り');
  });

  it('should handle empty places array', async () => {
    const { batchConvertToVibe } = await import('./gemini-vibe');
    const results = await batchConvertToVibe([], 'test-key');
    expect(results.size).toBe(0);
  });
});
