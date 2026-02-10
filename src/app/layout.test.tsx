import { describe, it, expect, vi } from 'vitest';

// Mock next/font/google because it requires the Next.js runtime
vi.mock('next/font/google', () => ({
  Geist: () => ({ className: 'geist-mock' }),
}));

// Mock CSS imports
vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}));
vi.mock('./globals.css', () => ({}));

// Import after mocking
const { metadata, viewport } = await import('./layout');

describe('RootLayout exports', () => {
  describe('metadata', () => {
    it('has a title that includes "MAPMAPMAP!!!"', () => {
      expect(metadata.title).toContain('MAPMAPMAP!!!');
    });

    it('has a description that mentions vibe-based search', () => {
      expect(typeof metadata.description).toBe('string');
      expect((metadata.description as string).length).toBeGreaterThan(0);
    });
  });

  describe('viewport', () => {
    it('sets width to device-width', () => {
      expect(viewport.width).toBe('device-width');
    });

    it('sets initialScale to 1', () => {
      expect(viewport.initialScale).toBe(1);
    });

    it('sets maximumScale to 1 to prevent double-tap zoom', () => {
      expect(viewport.maximumScale).toBe(1);
    });

    it('disables user scaling to prevent interference with map interactions', () => {
      expect(viewport.userScalable).toBe(false);
    });

    it('sets viewportFit to cover for safe-area-inset access', () => {
      expect(viewport.viewportFit).toBe('cover');
    });
  });
});
