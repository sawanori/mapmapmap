import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock function references
const mockEmbeddingsCreate = vi.fn();
const mockClientExecute = vi.fn();

// Mock OpenAI before importing actions
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      embeddings = {
        create: mockEmbeddingsCreate,
      };
    },
  };
});

// Mock @libsql/client before importing actions
vi.mock('@libsql/client', () => {
  return {
    createClient: function createClient() {
      return {
        execute: mockClientExecute,
      };
    },
  };
});

// Need to import after mocks are set up
import { searchSpots } from './actions';

describe('searchSpots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should return VALIDATION_ERROR for empty query', async () => {
      const result = await searchSpots('', 35.6812, 139.7671);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return VALIDATION_ERROR for whitespace-only query', async () => {
      const result = await searchSpots('   ', 35.6812, 139.7671);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return VALIDATION_ERROR for query exceeding 200 characters', async () => {
      const longQuery = 'a'.repeat(201);
      const result = await searchSpots(longQuery, 35.6812, 139.7671);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return VALIDATION_ERROR for latitude out of range (>90)', async () => {
      const result = await searchSpots('test', 91, 139.7671);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('Invalid coordinates.');
      }
    });

    it('should return VALIDATION_ERROR for latitude below -90', async () => {
      const result = await searchSpots('test', -91, 139.7671);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return VALIDATION_ERROR for longitude out of range (>180)', async () => {
      const result = await searchSpots('test', 35.6812, 181);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return VALIDATION_ERROR for longitude below -180', async () => {
      const result = await searchSpots('test', 35.6812, -181);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should accept a valid 1-character query', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      mockClientExecute.mockResolvedValue({ rows: [] });

      const result = await searchSpots('a', 35.6812, 139.7671);
      expect(result.success).toBe(true);
    });

    it('should accept a valid 200-character query', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      mockClientExecute.mockResolvedValue({ rows: [] });

      const result = await searchSpots('a'.repeat(200), 35.6812, 139.7671);
      expect(result.success).toBe(true);
    });

    it('should accept boundary coordinates (-90, 90, -180, 180)', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      mockClientExecute.mockResolvedValue({ rows: [] });

      const result = await searchSpots('test', 90, 180);
      expect(result.success).toBe(true);
    });
  });

  describe('OpenAI Embedding Errors', () => {
    it('should return EMBEDDING_ERROR when OpenAI API fails', async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error('API Error'));

      const result = await searchSpots('test query', 35.6812, 139.7671);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('EMBEDDING_ERROR');
        expect(result.error.message).toBe('Search failed. Please try again.');
      }
    });

    it('should not expose technical details in EMBEDDING_ERROR', async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error('Detailed technical error: API key invalid'));

      const result = await searchSpots('test query', 35.6812, 139.7671);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).not.toContain('API key');
        expect(result.error.message).not.toContain('technical');
      }
    });
  });

  describe('Turso DB Errors', () => {
    it('should return DB_ERROR when Turso query fails', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      mockClientExecute.mockRejectedValue(new Error('Connection refused'));

      const result = await searchSpots('test query', 35.6812, 139.7671);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DB_ERROR');
        expect(result.error.message).toBe('Search failed. Please try again.');
      }
    });

    it('should not expose technical details in DB_ERROR', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      mockClientExecute.mockRejectedValue(new Error('Connection refused to libsql://xxx'));

      const result = await searchSpots('test query', 35.6812, 139.7671);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).not.toContain('Connection refused');
        expect(result.error.message).not.toContain('libsql');
      }
    });
  });

  describe('Successful Search with Distance Filtering', () => {
    it('should return empty array when no DB results', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      mockClientExecute.mockResolvedValue({ rows: [] });

      const result = await searchSpots('test query', 35.6812, 139.7671);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should filter out spots beyond 3km radius', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      // Osaka is far beyond 10km from Tokyo Station - should be filtered out
      mockClientExecute.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Far Spot',
            lat: 34.6937,
            lng: 135.5023,
            category: 'Cafe',
            description: 'A far away cafe',
            magazine_context: 'BRUTUS 2024',
            google_place_id: null,
            rating: null,
            address: null,
            opening_hours: null,
            source: 'manual',
            vector_distance: 0.3,
          },
        ],
      });

      const result = await searchSpots('test query', 35.6812, 139.7671);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('should include spots within 3km radius', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      // A point approximately 0.4km from Tokyo Station
      mockClientExecute.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Nearby Spot',
            lat: 35.6850,
            lng: 139.7671,
            category: 'Cafe',
            description: 'A nearby cafe',
            magazine_context: 'BRUTUS 2024',
            google_place_id: null,
            rating: null,
            address: null,
            opening_hours: null,
            source: 'manual',
            vector_distance: 0.3,
          },
        ],
      });

      const result = await searchSpots('test query', 35.6812, 139.7671);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Nearby Spot');
        expect(result.data[0].distance).toBeGreaterThan(0);
        expect(result.data[0].distance).toBeLessThan(3);
      }
    });

    it('should sort results by vectorDistance ascending (relevance order)', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      // Two points within radius, different vector distances
      // "Less Relevant" has higher vector_distance (less similar)
      // "More Relevant" has lower vector_distance (more similar)
      mockClientExecute.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Less Relevant',
            lat: 35.6820,
            lng: 139.7671,
            category: 'Bar',
            description: null,
            magazine_context: null,
            google_place_id: null,
            rating: null,
            address: null,
            opening_hours: null,
            source: 'manual',
            vector_distance: 0.6,
          },
          {
            id: 2,
            name: 'More Relevant',
            lat: 35.6820,
            lng: 139.7671,
            category: 'Cafe',
            description: 'Close cafe',
            magazine_context: 'Hanako',
            google_place_id: null,
            rating: null,
            address: null,
            opening_hours: null,
            source: 'manual',
            vector_distance: 0.2,
          },
        ],
      });

      const result = await searchSpots('test query', 35.6812, 139.7671);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeGreaterThanOrEqual(2);
        expect(result.data[0].name).toBe('More Relevant');
        expect(result.data[1].name).toBe('Less Relevant');
        // Verify ascending vectorDistance order
        for (let i = 1; i < result.data.length; i++) {
          expect(result.data[i].vectorDistance).toBeGreaterThanOrEqual(result.data[i - 1].vectorDistance);
        }
      }
    });

    it('should map DB fields to SearchResult correctly', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      mockClientExecute.mockResolvedValue({
        rows: [
          {
            id: 42,
            name: 'Test Cafe',
            lat: 35.6820,
            lng: 139.7680,
            category: 'Cafe',
            description: 'A wonderful cafe',
            magazine_context: 'BRUTUS 2024/02',
            google_place_id: 'ChIJtest123',
            rating: 4.5,
            address: '1-1 Marunouchi, Chiyoda-ku',
            opening_hours: '["Monday: 9:00 AM - 5:00 PM"]',
            source: 'google_places',
            vector_distance: 0.25,
          },
        ],
      });

      const result = await searchSpots('test query', 35.6812, 139.7671);
      expect(result.success).toBe(true);
      if (result.success && result.data.length > 0) {
        const spot = result.data[0];
        expect(spot.id).toBe(42);
        expect(spot.name).toBe('Test Cafe');
        expect(spot.lat).toBe(35.6820);
        expect(spot.lng).toBe(139.7680);
        expect(spot.category).toBe('Cafe');
        expect(spot.description).toBe('A wonderful cafe');
        expect(spot.magazineContext).toBe('BRUTUS 2024/02');
        expect(typeof spot.distance).toBe('number');
        expect(spot.createdAt).toBeNull();
        expect(spot.googlePlaceId).toBe('ChIJtest123');
        expect(spot.rating).toBe(4.5);
        expect(spot.address).toBe('1-1 Marunouchi, Chiyoda-ku');
        expect(spot.openingHours).toBe('["Monday: 9:00 AM - 5:00 PM"]');
        expect(spot.source).toBe('google_places');
        expect(spot.vectorDistance).toBe(0.25);
      }
    });

    it('should handle null description and magazine_context', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      mockClientExecute.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Minimal Spot',
            lat: 35.6820,
            lng: 139.7680,
            category: 'Park',
            description: null,
            magazine_context: null,
            google_place_id: null,
            rating: null,
            address: null,
            opening_hours: null,
            source: 'manual',
            vector_distance: 0.4,
          },
        ],
      });

      const result = await searchSpots('test query', 35.6812, 139.7671);
      expect(result.success).toBe(true);
      if (result.success && result.data.length > 0) {
        expect(result.data[0].description).toBeNull();
        expect(result.data[0].magazineContext).toBeNull();
      }
    });
  });

  describe('SearchResponse type correctness', () => {
    it('should return success: true with data array on success', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }],
      });
      mockClientExecute.mockResolvedValue({ rows: [] });

      const result = await searchSpots('test', 35.6812, 139.7671);
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });

    it('should return success: false with error object on validation failure', async () => {
      const result = await searchSpots('', 35.6812, 139.7671);
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      if (!result.success) {
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
      }
    });
  });
});
