import { create } from 'zustand';
import type { VibePlace, Mood } from '@/types/vibe';
import { searchByMood } from '@/app/vibe-actions';

interface VibeState {
  currentMood: Mood | null;
  cards: VibePlace[];
  currentIndex: number;
  likedPlaces: VibePlace[];
  passedIds: string[];
  isLoading: boolean;
  isExhausted: boolean;
  errorMessage: string | null;

  setMood: (mood: Mood) => void;
  loadCards: (lat: number, lng: number) => Promise<void>;
  like: (place: VibePlace) => void;
  pass: (placeId: string) => void;
  nextCard: () => void;
  reset: () => void;
}

export const useVibeStore = create<VibeState>((set, get) => ({
  currentMood: null,
  cards: [],
  currentIndex: 0,
  likedPlaces: [],
  passedIds: [],
  isLoading: false,
  isExhausted: false,
  errorMessage: null,

  setMood: (mood) => {
    set({ currentMood: mood, cards: [], currentIndex: 0, isExhausted: false, errorMessage: null });
  },

  loadCards: async (lat, lng) => {
    const { currentMood } = get();
    if (!currentMood) return;

    set({ isLoading: true, errorMessage: null });

    try {
      const result = await searchByMood(currentMood, lat, lng);

      if (!result.success) {
        set({ isLoading: false, errorMessage: result.message ?? 'エラーが発生しました' });
        return;
      }

      const { passedIds, likedPlaces } = get();
      const seenIds = new Set([...passedIds, ...likedPlaces.map((p) => p.id)]);
      const newCards = result.data.filter((p) => !seenIds.has(p.id));

      set({
        cards: newCards,
        currentIndex: 0,
        isLoading: false,
        isExhausted: newCards.length === 0,
        errorMessage: newCards.length === 0 ? result.message : null,
      });
    } catch {
      set({ isLoading: false, errorMessage: '通信エラーが発生しました' });
    }
  },

  like: (place) => {
    const { likedPlaces } = get();
    if (likedPlaces.some((p) => p.id === place.id)) return;
    set({ likedPlaces: [...likedPlaces, place] });
    get().nextCard();
  },

  pass: (placeId) => {
    const { passedIds } = get();
    if (passedIds.includes(placeId)) return;
    set({ passedIds: [...passedIds, placeId] });
    get().nextCard();
  },

  nextCard: () => {
    const { currentIndex, cards } = get();
    const next = currentIndex + 1;
    if (next >= cards.length) {
      set({ currentIndex: next, isExhausted: true });
    } else {
      set({ currentIndex: next });
    }
  },

  reset: () => {
    set({
      currentMood: null,
      cards: [],
      currentIndex: 0,
      likedPlaces: [],
      passedIds: [],
      isLoading: false,
      isExhausted: false,
      errorMessage: null,
    });
  },
}));
