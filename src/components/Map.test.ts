import { describe, it, expect } from 'vitest';
import { MAP_STYLE, DEFAULT_ZOOM } from '@/lib/constants';

describe('Map component configuration', () => {
  it('uses monochrome/white Mapbox style (light-v11)', () => {
    expect(MAP_STYLE).toBe('mapbox://styles/mapbox/light-v11');
  });

  it('uses DEFAULT_ZOOM of 14 for initial viewport', () => {
    expect(DEFAULT_ZOOM).toBe(14);
  });

  it('MAP_STYLE is a valid mapbox style URL', () => {
    expect(MAP_STYLE).toMatch(/^mapbox:\/\/styles\//);
  });
});
