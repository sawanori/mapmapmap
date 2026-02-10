import type { SearchResult } from '@/types/spot';

export function createMockSearchResult(overrides?: Partial<SearchResult>): SearchResult {
  return {
    id: 1,
    name: 'Test Spot',
    lat: 35.6812,
    lng: 139.7671,
    category: 'Cafe',
    description: 'A test spot',
    magazineContext: null,
    createdAt: null,
    distance: 0.5,
    vectorDistance: 0.3,
    googlePlaceId: null,
    rating: null,
    address: null,
    openingHours: null,
    source: 'manual',
    ...overrides,
  };
}
