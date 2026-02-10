import type { VibePlace, Mood } from '@/types/vibe';

/**
 * Calculate a weighted score for ranking places.
 * Weights: distance 0.45, openNow 0.25, rating 0.20, moodScore 0.10
 */
export function calculateScore(
  place: VibePlace,
  mood: Mood,
  maxDistanceKm: number,
): number {
  // distance: closer is better (0-1 normalized)
  const distScore = Math.max(0, 1 - place.distance / maxDistanceKm);

  // open_now: open=1, closed=0, unknown=0.5
  const openScore = place.openNow === true ? 1 : place.openNow === false ? 0 : 0.5;

  // rating: normalized to 0-1 (unknown = 0.5)
  const ratingScore = place.rating != null ? place.rating / 5 : 0.5;

  // mood_match: AI-generated mood score (0-100 → 0-1)
  const moodScore = place.moodScore[mood] / 100;

  return distScore * 0.45 + openScore * 0.25 + ratingScore * 0.20 + moodScore * 0.10;
}
