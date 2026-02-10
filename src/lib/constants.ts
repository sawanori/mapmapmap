// Search parameters
export const VECTOR_TOP_K = 50;
export const DEFAULT_RADIUS_KM = 10.0;
export const MAX_VECTOR_DISTANCE = 0.85; // cosine distance threshold (0=identical, 2=opposite)
export const MAX_QUERY_LENGTH = 200;
export const MIN_QUERY_LENGTH = 1;

// Geolocation fallback (Minatomirai, Yokohama)
export const DEFAULT_LAT = 35.4544;
export const DEFAULT_LNG = 139.6368;
export const DEFAULT_ZOOM = 14;

// OpenAI
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_TIMEOUT_MS = 5000;

// Mapbox
export const MAP_STYLE = 'mapbox://styles/mapbox/light-v11';
export const PIN_COLOR = '#1e40af'; // blue-800
export const THEME_COLOR = '#1e40af'; // main brand blue

// Google Places API
export const GOOGLE_PLACES_TYPE_MAP: Record<string, string> = {
  cafe: 'Cafe',
  coffee_shop: 'Cafe',
  restaurant: 'Restaurant',
  bar: 'Bar',
  park: 'Park',
  museum: 'Museum',
  art_gallery: 'Gallery',
  book_store: 'Bookstore',
  library: 'Library',
  tourist_attraction: 'Attraction',
  bakery: 'Cafe',
  night_club: 'Bar',
  spa: 'Wellness',
  shopping_mall: 'Shopping',
};

export function mapGoogleType(types: string[]): string {
  for (const t of types) {
    if (GOOGLE_PLACES_TYPE_MAP[t]) return GOOGLE_PLACES_TYPE_MAP[t];
  }
  return 'Other';
}

export const GOOGLE_PLACES_TYPES = [
  'cafe', 'restaurant', 'bar', 'park', 'museum',
  'art_gallery', 'book_store', 'library', 'tourist_attraction',
];
