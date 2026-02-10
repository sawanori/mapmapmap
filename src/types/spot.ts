export interface SpotRecord {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string;
  description: string | null;
  magazineContext: string | null;
  createdAt: string | null;
  googlePlaceId: string | null;
  rating: number | null;
  address: string | null;
  openingHours: string | null;
  source: 'manual' | 'google_places';
}

export interface SearchResult extends SpotRecord {
  distance: number; // km
  vectorDistance: number; // cosine distance (0=identical, 2=opposite)
}

export type SortBy = 'relevance' | 'distance' | 'rating';

export interface UserLocation {
  lat: number;
  lng: number;
  isDefault: boolean; // true = Tokyo Station fallback
}
