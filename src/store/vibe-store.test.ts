import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@/app/vibe-actions', () => ({
  searchByMood: vi.fn(),
}));

import { useVibeStore } from './vibe-store';
import { searchByMood } from '@/app/vibe-actions';
import type { VibePlace } from '@/types/vibe';

function makeMockVibePlace(id: string, name: string, chillScore = 50): VibePlace {
  return {
    id,
    name,
    catchphrase: '静寂の中の小さな幸せ',
    vibeTags: ['#一人時間', '#読書', '#珈琲'],
    heroImageUrl: 'https://photo.url/test.jpg',
    moodScore: { chill: chillScore, party: 30, focus: 60 },
    hiddenGemsInfo: 'テラス席が穴場',
    isRejected: false,
    lat: 35.65,
    lng: 139.7,
    category: 'Cafe',
    rating: 4.2,
    address: '東京都渋谷区',
    openingHours: null,
    distance: 0.5,
  };
}

describe('vibe-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    act(() => {
      useVibeStore.getState().reset();
    });
  });

  it('should have correct initial state', () => {
    const state = useVibeStore.getState();
    expect(state.currentMood).toBeNull();
    expect(state.cards).toEqual([]);
    expect(state.currentIndex).toBe(0);
    expect(state.likedPlaces).toEqual([]);
    expect(state.passedIds).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isExhausted).toBe(false);
    expect(state.errorMessage).toBeNull();
  });

  it('should set mood and reset card state', () => {
    act(() => {
      useVibeStore.getState().setMood('chill');
    });

    const state = useVibeStore.getState();
    expect(state.currentMood).toBe('chill');
    expect(state.cards).toEqual([]);
    expect(state.currentIndex).toBe(0);
    expect(state.isExhausted).toBe(false);
  });

  it('should load cards from searchByMood', async () => {
    const places = [
      makeMockVibePlace('p1', 'カフェA', 90),
      makeMockVibePlace('p2', 'カフェB', 80),
    ];
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: places,
    });

    act(() => {
      useVibeStore.getState().setMood('chill');
    });

    await act(async () => {
      await useVibeStore.getState().loadCards(35.65, 139.7);
    });

    const state = useVibeStore.getState();
    expect(state.cards).toHaveLength(2);
    expect(state.isLoading).toBe(false);
    expect(state.isExhausted).toBe(false);
    expect(searchByMood).toHaveBeenCalledWith('chill', 35.65, 139.7);
  });

  it('should filter already seen places when loading', async () => {
    const places = [
      makeMockVibePlace('p1', 'カフェA'),
      makeMockVibePlace('p2', 'カフェB'),
      makeMockVibePlace('p3', 'カフェC'),
    ];
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: places,
    });

    // Pre-populate passed and liked
    act(() => {
      useVibeStore.getState().setMood('chill');
      useVibeStore.setState({ passedIds: ['p1'], likedPlaces: [makeMockVibePlace('p2', 'カフェB')] });
    });

    await act(async () => {
      await useVibeStore.getState().loadCards(35.65, 139.7);
    });

    const state = useVibeStore.getState();
    expect(state.cards).toHaveLength(1);
    expect(state.cards[0].id).toBe('p3');
  });

  it('should set isExhausted when no new cards available', async () => {
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: [],
      message: '近くにスポットが見つかりませんでした',
    });

    act(() => {
      useVibeStore.getState().setMood('focus');
    });

    await act(async () => {
      await useVibeStore.getState().loadCards(35.65, 139.7);
    });

    const state = useVibeStore.getState();
    expect(state.isExhausted).toBe(true);
    expect(state.cards).toHaveLength(0);
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(searchByMood).mockResolvedValue({
      success: false,
      data: [],
      message: 'API keys not configured.',
    });

    act(() => {
      useVibeStore.getState().setMood('party');
    });

    await act(async () => {
      await useVibeStore.getState().loadCards(35.65, 139.7);
    });

    const state = useVibeStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.errorMessage).toBe('API keys not configured.');
  });

  it('should handle network errors', async () => {
    vi.mocked(searchByMood).mockRejectedValue(new Error('Network error'));

    act(() => {
      useVibeStore.getState().setMood('chill');
    });

    await act(async () => {
      await useVibeStore.getState().loadCards(35.65, 139.7);
    });

    const state = useVibeStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.errorMessage).toBe('通信エラーが発生しました');
  });

  it('should like a place and advance to next card', () => {
    const places = [
      makeMockVibePlace('p1', 'カフェA'),
      makeMockVibePlace('p2', 'カフェB'),
    ];

    act(() => {
      useVibeStore.setState({ cards: places, currentIndex: 0 });
      useVibeStore.getState().like(places[0]);
    });

    const state = useVibeStore.getState();
    expect(state.likedPlaces).toHaveLength(1);
    expect(state.likedPlaces[0].id).toBe('p1');
    expect(state.currentIndex).toBe(1);
  });

  it('should not duplicate likes', () => {
    const place = makeMockVibePlace('p1', 'カフェA');

    act(() => {
      useVibeStore.setState({
        cards: [place, makeMockVibePlace('p2', 'カフェB')],
        currentIndex: 0,
        likedPlaces: [place],
      });
      useVibeStore.getState().like(place);
    });

    expect(useVibeStore.getState().likedPlaces).toHaveLength(1);
  });

  it('should pass a place and advance to next card', () => {
    const places = [
      makeMockVibePlace('p1', 'カフェA'),
      makeMockVibePlace('p2', 'カフェB'),
    ];

    act(() => {
      useVibeStore.setState({ cards: places, currentIndex: 0 });
      useVibeStore.getState().pass('p1');
    });

    const state = useVibeStore.getState();
    expect(state.passedIds).toContain('p1');
    expect(state.currentIndex).toBe(1);
  });

  it('should not duplicate passes', () => {
    act(() => {
      useVibeStore.setState({
        cards: [makeMockVibePlace('p1', 'A'), makeMockVibePlace('p2', 'B')],
        currentIndex: 0,
        passedIds: ['p1'],
      });
      useVibeStore.getState().pass('p1');
    });

    expect(useVibeStore.getState().passedIds).toEqual(['p1']);
  });

  it('should set isExhausted when last card is swiped', () => {
    const places = [makeMockVibePlace('p1', 'カフェA')];

    act(() => {
      useVibeStore.setState({ cards: places, currentIndex: 0 });
      useVibeStore.getState().like(places[0]);
    });

    expect(useVibeStore.getState().isExhausted).toBe(true);
  });

  it('should not load if mood is null', async () => {
    await act(async () => {
      await useVibeStore.getState().loadCards(35.65, 139.7);
    });

    expect(searchByMood).not.toHaveBeenCalled();
  });

  it('should fully reset state', () => {
    act(() => {
      useVibeStore.setState({
        currentMood: 'chill',
        cards: [makeMockVibePlace('p1', 'A')],
        currentIndex: 1,
        likedPlaces: [makeMockVibePlace('p1', 'A')],
        passedIds: ['p2'],
        isLoading: true,
        isExhausted: true,
        errorMessage: 'error',
      });
      useVibeStore.getState().reset();
    });

    const state = useVibeStore.getState();
    expect(state.currentMood).toBeNull();
    expect(state.cards).toEqual([]);
    expect(state.currentIndex).toBe(0);
    expect(state.likedPlaces).toEqual([]);
    expect(state.passedIds).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isExhausted).toBe(false);
    expect(state.errorMessage).toBeNull();
  });
});
