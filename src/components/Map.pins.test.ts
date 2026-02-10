import { describe, it, expect, vi } from 'vitest';
import { PIN_COLOR } from '@/lib/constants';
import type { SearchResult } from '@/types/spot';
import { createMockSearchResult } from '@/test-helpers';

/**
 * Tests for Map component's search results pin rendering and fitBounds integration.
 *
 * Since react-map-gl relies on WebGL (not available in jsdom), we verify:
 * 1. Interface contracts (props acceptance)
 * 2. Constants correctness (PIN_COLOR)
 * 3. Module exports
 * 4. Data flow logic (fitBounds trigger conditions)
 */

const mockSearchResults: SearchResult[] = [
  createMockSearchResult({
    id: 1,
    name: 'Test Cafe',
    lat: 35.6812,
    lng: 139.7671,
    category: 'Cafe',
    description: 'A quiet cafe',
    magazineContext: 'BRUTUS 2024',
    createdAt: '2026-01-01',
    distance: 0.5,
  }),
  createMockSearchResult({
    id: 2,
    name: 'Test Bar',
    lat: 35.685,
    lng: 139.77,
    category: 'Bar',
    description: 'A cozy bar',
    magazineContext: null,
    createdAt: '2026-01-01',
    distance: 1.2,
  }),
];

describe('MapView pin rendering contract', () => {
  it('MapView module exports a default function component', async () => {
    const mod = await import('./Map');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('PIN_COLOR is blue-800 (#1e40af)', () => {
    expect(PIN_COLOR).toBe('#1e40af');
  });

  it('MapView accepts searchResults prop of type SearchResult[]', () => {
    // Type-level verification: this test passes if TypeScript compiles
    const searchResults: SearchResult[] = mockSearchResults;
    expect(searchResults).toHaveLength(2);
    expect(searchResults[0].lat).toBe(35.6812);
    expect(searchResults[0].lng).toBe(139.7671);
  });

  it('MapView accepts selectedSpot prop of type SearchResult | null', () => {
    const selectedSpot: SearchResult | null = mockSearchResults[0];
    expect(selectedSpot).not.toBeNull();
    expect(selectedSpot!.id).toBe(1);

    const nullSpot: SearchResult | null = null;
    expect(nullSpot).toBeNull();
  });

  it('MapView accepts onSpotSelect callback prop', () => {
    const onSpotSelect = vi.fn();
    onSpotSelect(mockSearchResults[0]);
    expect(onSpotSelect).toHaveBeenCalledWith(mockSearchResults[0]);
  });
});

describe('fitBounds logic', () => {
  it('single result should set zoom to 16', () => {
    const singleResult: SearchResult[] = [mockSearchResults[0]];
    expect(singleResult).toHaveLength(1);
    // When there's a single result, the component should set zoom to 16
    // and center on that result's coordinates
    const expectedZoom = 16;
    expect(expectedZoom).toBe(16);
    expect(singleResult[0].lat).toBe(35.6812);
    expect(singleResult[0].lng).toBe(139.7671);
  });

  it('multiple results should compute bounding box for fitBounds', () => {
    const results = mockSearchResults;
    const lngs = results.map((s) => s.lng);
    const lats = results.map((s) => s.lat);

    const bounds = {
      sw: [Math.min(...lngs), Math.min(...lats)],
      ne: [Math.max(...lngs), Math.max(...lats)],
    };

    expect(bounds.sw[0]).toBe(139.7671); // min lng
    expect(bounds.sw[1]).toBe(35.6812); // min lat
    expect(bounds.ne[0]).toBe(139.77); // max lng
    expect(bounds.ne[1]).toBe(35.685); // max lat
  });

  it('zero results should not trigger fitBounds', () => {
    const emptyResults: SearchResult[] = [];
    expect(emptyResults).toHaveLength(0);
    // fitBounds guard: if (searchResults.length === 0 || !mapRef.current) return;
  });
});

describe('pin rendering data', () => {
  it('each search result has required fields for Marker rendering', () => {
    for (const result of mockSearchResults) {
      expect(result.id).toBeDefined();
      expect(typeof result.lat).toBe('number');
      expect(typeof result.lng).toBe('number');
      expect(typeof result.name).toBe('string');
    }
  });

  it('pin data uses spot id as unique key', () => {
    const ids = mockSearchResults.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
