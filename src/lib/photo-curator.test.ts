import { describe, it, expect } from 'vitest';
import { selectBestPhotos, selectHeroPhoto } from './photo-curator';
import type { GooglePlacePhoto } from './google-places';

function makePhoto(
  name: string,
  widthPx: number,
  heightPx: number,
): GooglePlacePhoto {
  return {
    name,
    widthPx,
    heightPx,
    authorAttributions: [{ displayName: 'test' }],
  };
}

describe('selectBestPhotos', () => {
  it('should return empty array for undefined photos', () => {
    expect(selectBestPhotos(undefined)).toEqual([]);
  });

  it('should return empty array for empty photos', () => {
    expect(selectBestPhotos([])).toEqual([]);
  });

  it('should prioritize landscape (wide) photos', () => {
    const photos = [
      makePhoto('portrait', 600, 800), // portrait
      makePhoto('landscape', 1200, 800), // landscape + high-res
      makePhoto('square', 800, 800), // square
    ];

    const result = selectBestPhotos(photos, 3);
    expect(result[0].name).toBe('landscape');
  });

  it('should respect maxPhotos limit', () => {
    const photos = [
      makePhoto('a', 1200, 800),
      makePhoto('b', 1200, 800),
      makePhoto('c', 1200, 800),
      makePhoto('d', 1200, 800),
      makePhoto('e', 1200, 800),
    ];

    expect(selectBestPhotos(photos, 3)).toHaveLength(3);
    expect(selectBestPhotos(photos, 1)).toHaveLength(1);
  });

  it('should prefer high-res photos', () => {
    const photos = [
      makePhoto('low-res', 400, 300),
      makePhoto('high-res', 1200, 900),
    ];

    const result = selectBestPhotos(photos, 1);
    expect(result[0].name).toBe('high-res');
  });

  it('should use Google order as tiebreaker', () => {
    // Same dimensions, first in array should win
    const photos = [
      makePhoto('first', 800, 600),
      makePhoto('second', 800, 600),
    ];

    const result = selectBestPhotos(photos, 1);
    expect(result[0].name).toBe('first');
  });
});

describe('selectHeroPhoto', () => {
  it('should return null for undefined photos', () => {
    expect(selectHeroPhoto(undefined)).toBeNull();
  });

  it('should return null for empty photos', () => {
    expect(selectHeroPhoto([])).toBeNull();
  });

  it('should return the best single photo', () => {
    const photos = [
      makePhoto('portrait', 600, 800),
      makePhoto('hero', 1200, 800),
    ];

    const result = selectHeroPhoto(photos);
    expect(result?.name).toBe('hero');
  });
});
