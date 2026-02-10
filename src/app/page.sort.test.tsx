import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SearchResult } from '@/types/spot';
import { createMockSearchResult } from '@/test-helpers';

// Track props passed to child components
const mockMapViewProps = vi.fn();
const mockSearchBarProps = vi.fn();
const mockSpotCardProps = vi.fn();

let capturedOnResults: ((results: SearchResult[]) => void) | null = null;

// Mock next/dynamic
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockMap = (props: Record<string, unknown>) => {
      mockMapViewProps(props);
      return <div data-testid="map-view" />;
    };
    MockMap.displayName = 'MockMap';
    return MockMap;
  },
}));

// Mock SearchBar
vi.mock('@/components/SearchBar', () => ({
  default: (props: Record<string, unknown>) => {
    mockSearchBarProps(props);
    capturedOnResults = props.onResults as (results: SearchResult[]) => void;
    return <div data-testid="search-bar" />;
  },
}));

// Mock SpotCard
vi.mock('@/components/SpotCard', () => ({
  default: (props: Record<string, unknown>) => {
    mockSpotCardProps(props);
    return <div data-testid="spot-card" />;
  },
}));

// Mock actions
vi.mock('@/app/actions', () => ({
  searchSpots: vi.fn(),
}));

import Home from './page';

const mixedResults: SearchResult[] = [
  createMockSearchResult({ id: 1, name: 'Near Low', distance: 0.5, rating: 3.5 }),
  createMockSearchResult({ id: 2, name: 'Far High', distance: 1.0, rating: 4.8 }),
  createMockSearchResult({ id: 3, name: 'Mid Null', distance: 0.8, rating: null }),
];

const allNullRating: SearchResult[] = [
  createMockSearchResult({ id: 1, name: 'A', distance: 0.5, rating: null }),
  createMockSearchResult({ id: 2, name: 'B', distance: 1.0, rating: null }),
  createMockSearchResult({ id: 3, name: 'C', distance: 0.8, rating: null }),
];

describe('Home page sort toggle', () => {
  let mockGetCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnResults = null;
    mockGetCurrentPosition = vi.fn();

    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  it('does not show SortToggle when there are no results', () => {
    render(<Home />);
    expect(screen.queryByRole('button', { name: /ソート切り替え/ })).not.toBeInTheDocument();
  });

  it('shows SortToggle after search results arrive', async () => {
    render(<Home />);

    act(() => {
      capturedOnResults!(mixedResults);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ソート切り替え/ })).toBeInTheDocument();
    });
  });

  it('defaults to 距離順', async () => {
    render(<Home />);

    act(() => {
      capturedOnResults!(mixedResults);
    });

    await waitFor(() => {
      expect(screen.getByText('距離順')).toBeInTheDocument();
    });
  });

  it('sorts by rating descending with null at end when toggled to 評価順', async () => {
    render(<Home />);

    act(() => {
      capturedOnResults!(mixedResults);
    });

    await waitFor(() => {
      expect(screen.getByText('距離順')).toBeInTheDocument();
    });

    // Toggle to rating sort
    await userEvent.click(screen.getByRole('button', { name: /ソート切り替え/ }));

    await waitFor(() => {
      expect(screen.getByText('評価順')).toBeInTheDocument();
    });

    // MapView should still receive original searchResults (not sorted)
    const lastMapCall = mockMapViewProps.mock.calls[mockMapViewProps.mock.calls.length - 1];
    expect(lastMapCall[0].searchResults).toEqual(mixedResults);
  });

  it('returns to server order when toggled back to 距離順', async () => {
    render(<Home />);

    act(() => {
      capturedOnResults!(mixedResults);
    });

    // Toggle to rating
    await userEvent.click(screen.getByRole('button', { name: /ソート切り替え/ }));
    await waitFor(() => {
      expect(screen.getByText('評価順')).toBeInTheDocument();
    });

    // Toggle back to distance
    await userEvent.click(screen.getByRole('button', { name: /ソート切り替え/ }));
    await waitFor(() => {
      expect(screen.getByText('距離順')).toBeInTheDocument();
    });
  });

  it('handles all null ratings without error', async () => {
    render(<Home />);

    act(() => {
      capturedOnResults!(allNullRating);
    });

    // Toggle to rating -- should not throw
    await userEvent.click(screen.getByRole('button', { name: /ソート切り替え/ }));

    await waitFor(() => {
      expect(screen.getByText('評価順')).toBeInTheDocument();
    });
  });

  it('shows SortToggle for single result', async () => {
    render(<Home />);

    act(() => {
      capturedOnResults!([mixedResults[0]]);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ソート切り替え/ })).toBeInTheDocument();
    });
  });

  it('preserves sortBy across new searches', async () => {
    render(<Home />);

    act(() => {
      capturedOnResults!(mixedResults);
    });

    // Toggle to rating
    await userEvent.click(screen.getByRole('button', { name: /ソート切り替え/ }));
    await waitFor(() => {
      expect(screen.getByText('評価順')).toBeInTheDocument();
    });

    // New search arrives
    act(() => {
      capturedOnResults!([
        createMockSearchResult({ id: 10, name: 'New Place', distance: 2.0, rating: 4.0 }),
      ]);
    });

    // sortBy should still be rating
    await waitFor(() => {
      expect(screen.getByText('評価順')).toBeInTheDocument();
    });
  });

  it('does not pass sortedResults to MapView (always original searchResults)', async () => {
    render(<Home />);

    act(() => {
      capturedOnResults!(mixedResults);
    });

    // After results, MapView gets the original array
    await waitFor(() => {
      const lastMapCall = mockMapViewProps.mock.calls[mockMapViewProps.mock.calls.length - 1];
      expect(lastMapCall[0].searchResults).toEqual(mixedResults);
    });

    // Toggle to rating
    await userEvent.click(screen.getByRole('button', { name: /ソート切り替え/ }));

    // MapView still gets original searchResults
    await waitFor(() => {
      const lastMapCall = mockMapViewProps.mock.calls[mockMapViewProps.mock.calls.length - 1];
      expect(lastMapCall[0].searchResults).toEqual(mixedResults);
    });
  });
});
