import { create } from 'zustand';
import type { VibePlace, Mood, SearchFilters } from '@/types/vibe';
import { searchByMood } from '@/app/vibe-actions';

interface Filters {
  radiusMeters: number;       // default 900 (徒歩10分)
  openNow: boolean;           // default false
  maxPriceLevel: number | null; // default null (指定なし)
  keyword: string | null;      // default null
}

interface VibeState {
  // Intent
  currentMood: Mood | null;

  // Location
  locationMode: 'geo' | 'station' | null;
  coords: { lat: number; lng: number } | null;

  // Filters (radiusMeters is client-side only, not sent to API)
  filters: Filters;

  // Results
  results: VibePlace[];
  displayCount: number;
  isLoading: boolean;
  errorMessage: string | null;

  // Saved (localStorage persisted)
  savedPlaceIds: string[];

  // Actions
  setMood: (mood: Mood) => void;
  setLocation: (mode: 'geo' | 'station', lat: number, lng: number) => void;
  updateFilter: (partial: Partial<Filters>) => void;
  loadResults: () => Promise<void>;
  loadMore: () => void;
  toggleSaved: (placeId: string) => void;
  reset: () => void;
}

function loadSavedPlaceIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('saved_place_ids') ?? '[]');
  } catch {
    return [];
  }
}

export const useVibeStore = create<VibeState>((set, get) => ({
  currentMood: null,
  locationMode: null,
  coords: null,
  filters: {
    radiusMeters: 900,
    openNow: false,
    maxPriceLevel: null,
    keyword: null,
  },
  results: [],
  displayCount: 3,
  isLoading: false,
  errorMessage: null,
  savedPlaceIds: loadSavedPlaceIds(),

  setMood: (mood) => {
    set({ currentMood: mood, results: [], displayCount: 3, errorMessage: null, savedPlaceIds: [] });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('saved_place_ids');
    }
  },

  setLocation: (mode, lat, lng) => {
    set({ locationMode: mode, coords: { lat, lng } });
  },

  updateFilter: (partial) => {
    const { filters } = get();
    set({ filters: { ...filters, ...partial }, displayCount: 3 });
  },

  loadResults: async () => {
    const { currentMood, coords, filters } = get();
    if (!currentMood || !coords) return; // C4 guard

    set({ isLoading: true, errorMessage: null, displayCount: 3 });

    try {
      const apiFilters: SearchFilters = {
        openNow: filters.openNow || undefined,
        maxPriceLevel: filters.maxPriceLevel,
        keyword: filters.keyword,
      };

      const result = await searchByMood(currentMood, coords.lat, coords.lng, apiFilters);

      if (!result.success) {
        set({ isLoading: false, errorMessage: result.message ?? 'エラーが発生しました', results: [] });
        return;
      }

      // C1: radius filtering is client-side only
      const radiusKm = filters.radiusMeters / 1000;
      const filtered = result.data.filter((p) => p.distance <= radiusKm);

      set({
        results: filtered,
        isLoading: false,
        errorMessage: filtered.length === 0 ? '近くで条件に合う候補が見つかりませんでした' : null,
      });
    } catch {
      set({ isLoading: false, errorMessage: '通信エラーが発生しました', results: [] });
    }
  },

  loadMore: () => {
    const { displayCount, results } = get();
    set({ displayCount: Math.min(displayCount + 3, results.length) });
  },

  toggleSaved: (placeId) => {
    const { savedPlaceIds } = get();
    const updated = savedPlaceIds.includes(placeId)
      ? savedPlaceIds.filter((id) => id !== placeId)
      : [...savedPlaceIds, placeId];
    set({ savedPlaceIds: updated });
    if (typeof window !== 'undefined') {
      localStorage.setItem('saved_place_ids', JSON.stringify(updated));
    }
  },

  reset: () => {
    set({
      currentMood: null,
      locationMode: null,
      coords: null,
      filters: {
        radiusMeters: 900,
        openNow: false,
        maxPriceLevel: null,
        keyword: null,
      },
      results: [],
      displayCount: 3,
      isLoading: false,
      errorMessage: null,
      savedPlaceIds: [],
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('saved_place_ids');
    }
  },
}));
