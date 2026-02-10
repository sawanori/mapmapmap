export interface GooglePlaceReview {
  name: string;
  relativePublishTimeDescription: string;
  rating: number;
  text?: { text: string; languageCode: string };
  authorAttribution: {
    displayName: string;
    uri?: string;
    photoUri?: string;
  };
}

export interface GooglePlacePhoto {
  name: string; // "places/{place_id}/photos/{photo_reference}"
  widthPx: number;
  heightPx: number;
  authorAttributions: Array<{
    displayName: string;
    uri?: string;
    photoUri?: string;
  }>;
}

export interface GooglePlace {
  id: string;
  displayName: { text: string; languageCode: string };
  location: { latitude: number; longitude: number };
  types: string[];
  editorialSummary?: { text: string; languageCode: string };
  rating?: number;
  formattedAddress?: string;
  regularOpeningHours?: {
    openNow?: boolean;
    periods?: unknown[];
    weekdayDescriptions: string[];
  };
  priceLevel?: string; // "PRICE_LEVEL_FREE" | "PRICE_LEVEL_INEXPENSIVE" | "PRICE_LEVEL_MODERATE" | "PRICE_LEVEL_EXPENSIVE" | "PRICE_LEVEL_VERY_EXPENSIVE"
  reviews?: GooglePlaceReview[];
  photos?: GooglePlacePhoto[];
}

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.types',
  'places.editorialSummary',
  'places.rating',
  'places.formattedAddress',
  'places.regularOpeningHours',
  'places.priceLevel',
].join(',');

/** reviews と photos を含む拡張フィールドマスク (追加課金あり) */
const FIELD_MASK_EXTENDED = [
  FIELD_MASK,
  'places.reviews',
  'places.photos',
].join(',');

const MAX_RETRIES = 3;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429 && attempt < retries) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.warn(`Rate limited (429). Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (response.status === 403) {
      const errorText = await response.text();
      throw new Error(
        `Places API permission denied (403). Check your API key permissions. ${errorText}`,
      );
    }

    if (response.status === 400) {
      const errorText = await response.text();
      throw new Error(`Places API bad request (400): ${errorText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Places API error ${response.status}: ${errorText}`);
    }

    return response;
  }

  throw new Error('Places API: max retries exceeded');
}

export async function searchNearbyPlaces(
  apiKey: string,
  center: { lat: number; lng: number },
  radiusMeters: number,
  includedTypes: string[],
): Promise<GooglePlace[]> {
  const response = await fetchWithRetry(
    'https://places.googleapis.com/v1/places:searchNearby',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 20,
        languageCode: 'ja',
        locationRestriction: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: radiusMeters,
          },
        },
      }),
    },
  );

  const data = await response.json();
  return data.places ?? [];
}

/**
 * Text Search (New) API でムードクエリベースの検索を実行。
 * reviews, photos を含む拡張フィールドマスクを使用。
 */
export async function searchByText(
  apiKey: string,
  textQuery: string,
  center: { lat: number; lng: number },
  radiusMeters: number,
  maxResults = 20,
): Promise<GooglePlace[]> {
  const response = await fetchWithRetry(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK_EXTENDED,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: maxResults,
        languageCode: 'ja',
        locationBias: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: radiusMeters,
          },
        },
      }),
    },
  );

  const data = await response.json();
  return data.places ?? [];
}

/**
 * Google Places Photo の URL を構築する。
 * https://places.googleapis.com/v1/{photo_name}/media?maxWidthPx=WIDTH&key=API_KEY
 */
export function getPhotoUrl(
  photoName: string,
  apiKey: string,
  maxWidthPx = 800,
): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}`;
}
