import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchNearbyPlaces } from './google-places';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('searchNearbyPlaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns places from API response', async () => {
    const mockPlaces = [
      {
        id: 'ChIJtest1',
        displayName: { text: 'Test Cafe', languageCode: 'en' },
        location: { latitude: 35.68, longitude: 139.77 },
        types: ['cafe'],
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ places: mockPlaces }),
    });

    const result = await searchNearbyPlaces('fake-key', { lat: 35.68, lng: 139.77 }, 3000, ['cafe']);

    expect(result).toEqual(mockPlaces);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://places.googleapis.com/v1/places:searchNearby');
    expect(options.method).toBe('POST');
    expect(options.headers['X-Goog-Api-Key']).toBe('fake-key');
    expect(options.headers['X-Goog-FieldMask']).toContain('places.id');
    expect(options.headers['X-Goog-FieldMask']).toContain('places.displayName');

    const body = JSON.parse(options.body);
    expect(body.includedTypes).toEqual(['cafe']);
    expect(body.maxResultCount).toBe(20);
    expect(body.locationRestriction.circle.center.latitude).toBe(35.68);
    expect(body.locationRestriction.circle.radius).toBe(3000);
  });

  it('returns empty array when API returns no places', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    const result = await searchNearbyPlaces('fake-key', { lat: 35.68, lng: 139.77 }, 3000, ['cafe']);
    expect(result).toEqual([]);
  });

  it('throws on 403 permission denied', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Permission denied'),
    });

    await expect(
      searchNearbyPlaces('fake-key', { lat: 35.68, lng: 139.77 }, 3000, ['cafe']),
    ).rejects.toThrow('permission denied (403)');
  });

  it('throws on 400 bad request', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Invalid request'),
    });

    await expect(
      searchNearbyPlaces('fake-key', { lat: 35.68, lng: 139.77 }, 3000, ['cafe']),
    ).rejects.toThrow('bad request (400)');
  });

  it('retries on 429 rate limit with exponential backoff', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ places: [] }),
      });

    const result = await searchNearbyPlaces('fake-key', { lat: 35.68, lng: 139.77 }, 3000, ['cafe']);

    expect(result).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  }, 15000);

  it('throws after exhausting retries on persistent 429', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited'),
    });

    await expect(
      searchNearbyPlaces('fake-key', { lat: 35.68, lng: 139.77 }, 3000, ['cafe']),
    ).rejects.toThrow('Places API error 429');

    // 1 initial + 3 retries = 4 calls
    expect(mockFetch).toHaveBeenCalledTimes(4);
  }, 30000);

  it('throws on generic HTTP errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server error'),
    });

    await expect(
      searchNearbyPlaces('fake-key', { lat: 35.68, lng: 139.77 }, 3000, ['cafe']),
    ).rejects.toThrow('Places API error 500');
  });
});
