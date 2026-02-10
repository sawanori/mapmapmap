import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => '[]'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

vi.mock('@/app/vibe-actions', () => ({
  searchByMood: vi.fn(),
}));

import { useVibeStore } from './vibe-store';
import { searchByMood } from '@/app/vibe-actions';
import { makeMockVibePlace as _makeMock } from '@/test-utils/mock-data';

function makeMockVibePlace(id: string, name: string, chillScore = 50) {
  return _makeMock(id, name, { moodScore: { chill: chillScore, party: 30, focus: 60 } });
}

describe('vibe-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useVibeStore.getState().reset();
    });
  });

  it('should have correct initial state', () => {
    const state = useVibeStore.getState();
    expect(state.currentMood).toBeNull();
    expect(state.results).toEqual([]);
    expect(state.displayCount).toBe(3);
    expect(state.filters).toEqual({
      radiusMeters: 900,
      openNow: false,
      maxPriceLevel: null,
      keyword: null,
    });
    expect(state.savedPlaceIds).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.errorMessage).toBeNull();
    expect(state.locationMode).toBeNull();
    expect(state.coords).toBeNull();
  });

  it('should set mood and reset results/displayCount', () => {
    // Pre-populate some results to verify they get cleared
    act(() => {
      useVibeStore.setState({ results: [makeMockVibePlace('p1', 'A')], displayCount: 9 });
    });

    act(() => {
      useVibeStore.getState().setMood('chill');
    });

    const state = useVibeStore.getState();
    expect(state.currentMood).toBe('chill');
    expect(state.results).toEqual([]);
    expect(state.displayCount).toBe(3);
    expect(state.errorMessage).toBeNull();
  });

  it('should set coords and locationMode', () => {
    act(() => {
      useVibeStore.getState().setLocation('geo', 35.65, 139.7);
    });

    const state = useVibeStore.getState();
    expect(state.locationMode).toBe('geo');
    expect(state.coords).toEqual({ lat: 35.65, lng: 139.7 });
  });

  it('should set station location mode', () => {
    act(() => {
      useVibeStore.getState().setLocation('station', 35.68, 139.76);
    });

    const state = useVibeStore.getState();
    expect(state.locationMode).toBe('station');
    expect(state.coords).toEqual({ lat: 35.68, lng: 139.76 });
  });

  it('should call searchByMood with store coords and mood', async () => {
    const places = [
      makeMockVibePlace('p1', 'CafeA', 90),
      makeMockVibePlace('p2', 'CafeB', 80),
    ];
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: places,
    });

    act(() => {
      useVibeStore.getState().setMood('chill');
    });
    act(() => {
      useVibeStore.getState().setLocation('geo', 35.65, 139.7);
    });

    await act(async () => {
      await useVibeStore.getState().loadResults();
    });

    expect(searchByMood).toHaveBeenCalledWith('chill', 35.65, 139.7, {
      openNow: undefined,
      maxPriceLevel: null,
      keyword: null,
    });

    const state = useVibeStore.getState();
    expect(state.results).toHaveLength(2);
    expect(state.isLoading).toBe(false);
  });

  it('should not call searchByMood if mood is null', async () => {
    act(() => {
      useVibeStore.getState().setLocation('geo', 35.65, 139.7);
    });

    await act(async () => {
      await useVibeStore.getState().loadResults();
    });

    expect(searchByMood).not.toHaveBeenCalled();
  });

  it('should not call searchByMood if coords is null', async () => {
    act(() => {
      useVibeStore.getState().setMood('chill');
    });

    await act(async () => {
      await useVibeStore.getState().loadResults();
    });

    expect(searchByMood).not.toHaveBeenCalled();
  });

  it('should apply radius filter client-side', async () => {
    const nearby = makeMockVibePlace('p1', 'Nearby');
    // distance defaults to 0.5 km from mock-data
    const farAway = _makeMock('p2', 'FarAway', { distance: 5.0 });

    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: [nearby, farAway],
    });

    act(() => {
      useVibeStore.getState().setMood('chill');
    });
    act(() => {
      useVibeStore.getState().setLocation('geo', 35.65, 139.7);
    });
    // default radiusMeters is 900 => 0.9 km; farAway (5.0 km) should be excluded

    await act(async () => {
      await useVibeStore.getState().loadResults();
    });

    const state = useVibeStore.getState();
    expect(state.results).toHaveLength(1);
    expect(state.results[0].id).toBe('p1');
  });

  it('should set error message when all results are filtered out by radius', async () => {
    const farPlace = _makeMock('p1', 'Far', { distance: 5.0 });

    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: [farPlace],
    });

    act(() => {
      useVibeStore.getState().setMood('chill');
    });
    act(() => {
      useVibeStore.getState().setLocation('geo', 35.65, 139.7);
    });

    await act(async () => {
      await useVibeStore.getState().loadResults();
    });

    const state = useVibeStore.getState();
    expect(state.results).toHaveLength(0);
    expect(state.errorMessage).toBe('近くで条件に合う候補が見つかりませんでした');
  });

  it('should handle API errors', async () => {
    vi.mocked(searchByMood).mockResolvedValue({
      success: false,
      data: [],
      message: 'API keys not configured.',
    });

    act(() => {
      useVibeStore.getState().setMood('party');
    });
    act(() => {
      useVibeStore.getState().setLocation('geo', 35.65, 139.7);
    });

    await act(async () => {
      await useVibeStore.getState().loadResults();
    });

    const state = useVibeStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.errorMessage).toBe('API keys not configured.');
    expect(state.results).toEqual([]);
  });

  it('should handle network errors', async () => {
    vi.mocked(searchByMood).mockRejectedValue(new Error('Network error'));

    act(() => {
      useVibeStore.getState().setMood('chill');
    });
    act(() => {
      useVibeStore.getState().setLocation('geo', 35.65, 139.7);
    });

    await act(async () => {
      await useVibeStore.getState().loadResults();
    });

    const state = useVibeStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.errorMessage).toBe('通信エラーが発生しました');
    expect(state.results).toEqual([]);
  });

  it('should increment displayCount with loadMore', () => {
    const places = Array.from({ length: 9 }, (_, i) =>
      makeMockVibePlace(`p${i}`, `Place${i}`),
    );

    act(() => {
      useVibeStore.setState({ results: places, displayCount: 3 });
    });

    act(() => {
      useVibeStore.getState().loadMore();
    });

    expect(useVibeStore.getState().displayCount).toBe(6);

    act(() => {
      useVibeStore.getState().loadMore();
    });

    expect(useVibeStore.getState().displayCount).toBe(9);
  });

  it('should cap displayCount at results length', () => {
    const places = [makeMockVibePlace('p1', 'A'), makeMockVibePlace('p2', 'B')];

    act(() => {
      useVibeStore.setState({ results: places, displayCount: 2 });
    });

    act(() => {
      useVibeStore.getState().loadMore();
    });

    // 2 + 3 = 5, but capped at results.length = 2
    expect(useVibeStore.getState().displayCount).toBe(2);
  });

  it('should update filters and reset displayCount to 3', () => {
    act(() => {
      useVibeStore.setState({ displayCount: 9 });
    });

    act(() => {
      useVibeStore.getState().updateFilter({ openNow: true, radiusMeters: 1500 });
    });

    const state = useVibeStore.getState();
    expect(state.filters.openNow).toBe(true);
    expect(state.filters.radiusMeters).toBe(1500);
    // Other filters remain at defaults
    expect(state.filters.maxPriceLevel).toBeNull();
    expect(state.filters.keyword).toBeNull();
    expect(state.displayCount).toBe(3);
  });

  it('should add a place ID with toggleSaved', () => {
    act(() => {
      useVibeStore.getState().toggleSaved('place-1');
    });

    expect(useVibeStore.getState().savedPlaceIds).toEqual(['place-1']);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'saved_place_ids',
      JSON.stringify(['place-1']),
    );
  });

  it('should remove a place ID with toggleSaved', () => {
    act(() => {
      useVibeStore.setState({ savedPlaceIds: ['place-1', 'place-2'] });
    });

    act(() => {
      useVibeStore.getState().toggleSaved('place-1');
    });

    expect(useVibeStore.getState().savedPlaceIds).toEqual(['place-2']);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'saved_place_ids',
      JSON.stringify(['place-2']),
    );
  });

  it('should fully reset state', () => {
    act(() => {
      useVibeStore.setState({
        currentMood: 'chill',
        locationMode: 'geo',
        coords: { lat: 35.65, lng: 139.7 },
        filters: { radiusMeters: 1500, openNow: true, maxPriceLevel: 2, keyword: 'test' },
        results: [makeMockVibePlace('p1', 'A')],
        displayCount: 9,
        isLoading: true,
        errorMessage: 'some error',
        savedPlaceIds: ['p1'],
      });
    });

    act(() => {
      useVibeStore.getState().reset();
    });

    const state = useVibeStore.getState();
    expect(state.currentMood).toBeNull();
    expect(state.locationMode).toBeNull();
    expect(state.coords).toBeNull();
    expect(state.filters).toEqual({
      radiusMeters: 900,
      openNow: false,
      maxPriceLevel: null,
      keyword: null,
    });
    expect(state.results).toEqual([]);
    expect(state.displayCount).toBe(3);
    expect(state.isLoading).toBe(false);
    expect(state.errorMessage).toBeNull();
  });

  it('should clear savedPlaceIds on reset', () => {
    act(() => {
      useVibeStore.setState({ savedPlaceIds: ['p1', 'p2'] });
    });

    act(() => {
      useVibeStore.getState().reset();
    });

    expect(useVibeStore.getState().savedPlaceIds).toEqual([]);
  });
});
