import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies
vi.mock('@/lib/google-places', () => ({
  searchByText: vi.fn(),
  getPhotoUrl: vi.fn().mockReturnValue('https://photo.url/test.jpg'),
}));

vi.mock('@/lib/chain-filter', () => ({
  isChainStore: vi.fn(() => false),
}));

vi.mock('@/lib/gemini-vibe', () => ({
  batchConvertToVibe: vi.fn(),
  resetCircuitBreaker: vi.fn(),
}));

vi.mock('@/lib/photo-curator', () => ({
  selectHeroPhoto: vi.fn().mockReturnValue({ name: 'photo1', widthPx: 800, heightPx: 600, authorAttributions: [] }),
}));

vi.mock('@libsql/client', () => ({
  createClient: vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  }),
}));

import { searchByMood } from './vibe-actions';
import { searchByText } from '@/lib/google-places';
import { isChainStore } from '@/lib/chain-filter';
import { batchConvertToVibe } from '@/lib/gemini-vibe';
import type { GooglePlace } from '@/lib/google-places';

function makeMockGooglePlace(id: string, name: string): GooglePlace {
  return {
    id,
    displayName: { text: name, languageCode: 'ja' },
    location: { latitude: 35.65, longitude: 139.7 },
    types: ['cafe'],
    rating: 4.2,
    formattedAddress: '東京都渋谷区',
    reviews: [],
    photos: [{ name: `places/${id}/photos/1`, widthPx: 800, heightPx: 600, authorAttributions: [] }],
  };
}

const MOCK_VIBE_RESULT = {
  catchphrase: '静寂の中の小さな幸せ',
  vibe_tags: ['#一人時間', '#読書', '#珈琲'],
  mood_score: { chill: 90, party: 10, focus: 75 },
  hidden_gems_info: 'テラス席が穴場',
  is_rejected: false,
};

describe('searchByMood', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_PLACES_API_KEY = 'test-places-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io';
    process.env.TURSO_AUTH_TOKEN = 'test-token';
  });

  it('should return vibe places sorted by mood score', async () => {
    const places = [
      makeMockGooglePlace('p1', 'カフェA'),
      makeMockGooglePlace('p2', 'カフェB'),
    ];

    vi.mocked(searchByText).mockResolvedValue(places);

    const vibeMap = new Map();
    vibeMap.set('p1', { ...MOCK_VIBE_RESULT, mood_score: { chill: 80, party: 20, focus: 60 } });
    vibeMap.set('p2', { ...MOCK_VIBE_RESULT, mood_score: { chill: 95, party: 5, focus: 50 } });
    vi.mocked(batchConvertToVibe).mockResolvedValue(vibeMap);

    const result = await searchByMood('chill', 35.65, 139.7);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    // Sorted by chill score descending: p2 (95) > p1 (80)
    expect(result.data[0].id).toBe('p2');
    expect(result.data[1].id).toBe('p1');
  });

  it('should return empty with message when no places found', async () => {
    vi.mocked(searchByText).mockResolvedValue([]);

    const result = await searchByMood('party', 35.65, 139.7);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
    expect(result.message).toContain('見つかりませんでした');
  });

  it('should filter out rejected places', async () => {
    const places = [makeMockGooglePlace('p1', 'カフェA')];
    vi.mocked(searchByText).mockResolvedValue(places);

    const vibeMap = new Map();
    vibeMap.set('p1', { ...MOCK_VIBE_RESULT, is_rejected: true });
    vi.mocked(batchConvertToVibe).mockResolvedValue(vibeMap);

    const result = await searchByMood('focus', 35.65, 139.7);
    expect(result.data).toHaveLength(0);
  });

  it('should expand radius when all places are chain stores', async () => {
    vi.mocked(searchByText)
      .mockResolvedValueOnce([makeMockGooglePlace('chain1', 'スターバックス')])
      .mockResolvedValueOnce([makeMockGooglePlace('p1', 'Fuglen')]);

    // First call: スターバックス is chain → true; Second call: Fuglen → false
    vi.mocked(isChainStore)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const vibeMap = new Map();
    vibeMap.set('p1', MOCK_VIBE_RESULT);
    vi.mocked(batchConvertToVibe).mockResolvedValue(vibeMap);

    const result = await searchByMood('chill', 35.65, 139.7);

    expect(searchByText).toHaveBeenCalledTimes(2);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Fuglen');
  });

  it('should return error when API keys not configured', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;

    const result = await searchByMood('chill', 35.65, 139.7);
    expect(result.success).toBe(false);
    expect(result.message).toContain('API keys');
  });
});
