import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoring';
import type { VibePlace } from '@/types/vibe';

function makePlace(overrides: Partial<VibePlace> = {}): VibePlace {
  return {
    id: 'test',
    name: 'Test Place',
    catchphrase: '',
    vibeTags: [],
    heroImageUrl: '',
    moodScore: { chill: 80, party: 20, focus: 60 },
    hiddenGemsInfo: '',
    isRejected: false,
    lat: 35.65,
    lng: 139.7,
    category: 'Cafe',
    rating: 4.0,
    address: null,
    openingHours: null,
    openNow: true,
    priceLevel: null,
    distance: 1.0,
    ...overrides,
  };
}

describe('calculateScore', () => {
  it('should return a score between 0 and 1 for typical place', () => {
    const score = calculateScore(makePlace(), 'chill', 10);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should give higher score to closer places', () => {
    const close = calculateScore(makePlace({ distance: 0.5 }), 'chill', 10);
    const far = calculateScore(makePlace({ distance: 8 }), 'chill', 10);
    expect(close).toBeGreaterThan(far);
  });

  it('should give higher score to open places', () => {
    const open = calculateScore(makePlace({ openNow: true }), 'chill', 10);
    const closed = calculateScore(makePlace({ openNow: false }), 'chill', 10);
    expect(open).toBeGreaterThan(closed);
  });

  it('should treat null openNow as 0.5 (between open and closed)', () => {
    const open = calculateScore(makePlace({ openNow: true }), 'chill', 10);
    const unknown = calculateScore(makePlace({ openNow: null }), 'chill', 10);
    const closed = calculateScore(makePlace({ openNow: false }), 'chill', 10);
    expect(unknown).toBeLessThan(open);
    expect(unknown).toBeGreaterThan(closed);
  });

  it('should give higher score to higher-rated places', () => {
    const good = calculateScore(makePlace({ rating: 4.5 }), 'chill', 10);
    const bad = calculateScore(makePlace({ rating: 2.0 }), 'chill', 10);
    expect(good).toBeGreaterThan(bad);
  });

  it('should treat null rating as 0.5 (middle)', () => {
    const rated = calculateScore(makePlace({ rating: 5.0 }), 'chill', 10);
    const unrated = calculateScore(makePlace({ rating: null }), 'chill', 10);
    expect(unrated).toBeLessThan(rated);
  });

  it('should clamp distance score at 0 for places beyond maxDistance', () => {
    const beyond = calculateScore(makePlace({ distance: 15 }), 'chill', 10);
    const atEdge = calculateScore(makePlace({ distance: 10 }), 'chill', 10);
    // distance beyond max → distScore = 0, atEdge → distScore = 0
    // both should have same distance contribution (0)
    expect(beyond).toBe(atEdge);
  });
});
