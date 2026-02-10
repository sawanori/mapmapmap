import type { VibePlace, Mood } from '@/types/vibe';

/**
 * Generate a share URL for a single place.
 */
export function buildPlaceShareUrl(
  baseUrl: string,
  place: VibePlace,
  mood: Mood,
): string {
  const params = new URLSearchParams({
    name: place.name,
    catchphrase: place.catchphrase,
    mood,
    tags: place.vibeTags.join(','),
    lat: String(place.lat),
    lng: String(place.lng),
  });
  if (place.heroImageUrl) {
    params.set('image', place.heroImageUrl);
  }
  return `${baseUrl}/share?${params.toString()}`;
}

/**
 * Generate a share URL for a liked places summary.
 */
export function buildSummaryShareUrl(
  baseUrl: string,
  mood: Mood,
  likedPlaces: VibePlace[],
): string {
  const first = likedPlaces[0];
  const params = new URLSearchParams({
    mood,
    count: String(likedPlaces.length),
  });
  if (first) {
    params.set('name', first.name);
    params.set('catchphrase', first.catchphrase);
    if (first.heroImageUrl) {
      params.set('image', first.heroImageUrl);
    }
  }
  return `${baseUrl}/share?${params.toString()}`;
}

/**
 * Build the OG image URL from share parameters.
 */
export function buildOgImageUrl(
  baseUrl: string,
  params: URLSearchParams,
): string {
  return `${baseUrl}/api/og?${params.toString()}`;
}

/**
 * Share using Web Share API or fallback to clipboard.
 */
export async function shareOrCopy(
  title: string,
  text: string,
  url: string,
): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (error: unknown) {
      // User cancelled share - not an error
      if (error instanceof Error && error.name === 'AbortError') {
        return 'failed';
      }
    }
  }

  // Fallback: copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
