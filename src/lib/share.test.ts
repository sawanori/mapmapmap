import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildPlaceShareUrl,
  buildSummaryShareUrl,
  buildOgImageUrl,
  shareOrCopy,
} from './share';
import type { VibePlace } from '@/types/vibe';

function makeMockPlace(overrides: Partial<VibePlace> = {}): VibePlace {
  return {
    id: 'place_1',
    name: 'カフェ モカ',
    catchphrase: '夜に溶ける珈琲の香り',
    vibeTags: ['#深夜の読書', '#照明暗め', '#一人時間'],
    heroImageUrl: 'https://photo.url/hero.jpg',
    moodScore: { chill: 85, party: 10, focus: 70 },
    hiddenGemsInfo: '奥の席にコンセントあり',
    isRejected: false,
    lat: 35.65,
    lng: 139.7,
    category: 'Cafe',
    rating: 4.2,
    address: '東京都渋谷区',
    openingHours: null,
    distance: 0.5,
    ...overrides,
  };
}

describe('buildPlaceShareUrl', () => {
  it('should build a share URL with all parameters', () => {
    const place = makeMockPlace();
    const url = buildPlaceShareUrl('https://vibe-map.app', place, 'chill');

    expect(url).toContain('https://vibe-map.app/share?');
    expect(url).toContain('name=');
    expect(url).toContain('catchphrase=');
    expect(url).toContain('mood=chill');
    expect(url).toContain('tags=');
    expect(url).toContain('image=');
    expect(url).toContain('lat=35.65');
    expect(url).toContain('lng=139.7');
  });

  it('should omit image when heroImageUrl is empty', () => {
    const place = makeMockPlace({ heroImageUrl: '' });
    const url = buildPlaceShareUrl('https://vibe-map.app', place, 'party');

    expect(url).not.toContain('image=');
  });
});

describe('buildSummaryShareUrl', () => {
  it('should build a summary URL with count', () => {
    const places = [
      makeMockPlace({ id: 'p1', name: 'カフェA' }),
      makeMockPlace({ id: 'p2', name: 'カフェB' }),
    ];
    const url = buildSummaryShareUrl('https://vibe-map.app', 'chill', places);

    expect(url).toContain('mood=chill');
    expect(url).toContain('count=2');
    expect(url).toContain('name=');
  });

  it('should handle empty places array', () => {
    const url = buildSummaryShareUrl('https://vibe-map.app', 'focus', []);
    expect(url).toContain('count=0');
  });
});

describe('buildOgImageUrl', () => {
  it('should build OG image URL from params', () => {
    const params = new URLSearchParams({ name: 'Test', mood: 'chill' });
    const url = buildOgImageUrl('https://vibe-map.app', params);

    expect(url).toBe('https://vibe-map.app/api/og?name=Test&mood=chill');
  });
});

describe('shareOrCopy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should use Web Share API when available', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    const result = await shareOrCopy('Title', 'Text', 'https://example.com');

    expect(result).toBe('shared');
    expect(mockShare).toHaveBeenCalledWith({
      title: 'Title',
      text: 'Text',
      url: 'https://example.com',
    });

    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('should fallback to clipboard when share is not available', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    const result = await shareOrCopy('Title', 'Text', 'https://example.com');

    expect(result).toBe('copied');
    expect(mockWriteText).toHaveBeenCalledWith('https://example.com');
  });

  it('should return failed when share is cancelled', async () => {
    const abortError = new Error('Share cancelled');
    abortError.name = 'AbortError';
    const mockShare = vi.fn().mockRejectedValue(abortError);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    const result = await shareOrCopy('Title', 'Text', 'https://example.com');

    expect(result).toBe('failed');

    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });
});
