import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { SearchResult } from '@/types/spot';
import { createMockSearchResult } from '@/test-helpers';

// Track props passed to child components
const mockMapViewProps = vi.fn();
const mockSearchBarProps = vi.fn();

// Store onResults callback reference so we can invoke it in tests
let capturedOnResults: ((results: SearchResult[]) => void) | null = null;

// Mock next/dynamic to render the underlying component synchronously
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

// Mock SearchBar -- capture onResults callback
vi.mock('@/components/SearchBar', () => ({
  default: (props: Record<string, unknown>) => {
    mockSearchBarProps(props);
    capturedOnResults = props.onResults as (results: SearchResult[]) => void;
    return <div data-testid="search-bar" />;
  },
}));

// Mock actions
vi.mock('@/app/actions', () => ({
  searchSpots: vi.fn(),
}));

import Home from './page';

const mockResults: SearchResult[] = [
  createMockSearchResult({
    id: 1,
    name: 'Test Cafe',
    lat: 35.6812,
    lng: 139.7671,
    category: 'Cafe',
    description: 'A quiet cafe',
    magazineContext: 'BRUTUS 2024',
    createdAt: '2026-01-01',
    distance: 0.5,
  }),
  createMockSearchResult({
    id: 2,
    name: 'Test Bar',
    lat: 35.685,
    lng: 139.77,
    category: 'Bar',
    description: 'A cozy bar',
    magazineContext: null,
    createdAt: '2026-01-01',
    distance: 1.2,
  }),
];

describe('Home page search results to map integration', () => {
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

  it('passes searchResults to MapView', () => {
    render(<Home />);

    expect(mockMapViewProps).toHaveBeenCalledWith(
      expect.objectContaining({
        searchResults: [],
      })
    );
  });

  it('passes selectedSpot (null initially) to MapView', () => {
    render(<Home />);

    expect(mockMapViewProps).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedSpot: null,
      })
    );
  });

  it('passes onSpotSelect callback to MapView', () => {
    render(<Home />);

    expect(mockMapViewProps).toHaveBeenCalledWith(
      expect.objectContaining({
        onSpotSelect: expect.any(Function),
      })
    );
  });

  it('updates searchResults when onResults is called', async () => {
    render(<Home />);

    expect(capturedOnResults).not.toBeNull();

    act(() => {
      capturedOnResults!(mockResults);
    });

    await waitFor(() => {
      const lastCall = mockMapViewProps.mock.calls[mockMapViewProps.mock.calls.length - 1];
      expect(lastCall[0].searchResults).toEqual(mockResults);
    });
  });

  it('resets selectedSpot when new search results arrive', async () => {
    render(<Home />);

    // First, simulate selecting a spot via onSpotSelect
    const firstCall = mockMapViewProps.mock.calls[0];
    const onSpotSelect = firstCall[0].onSpotSelect as (spot: SearchResult) => void;

    act(() => {
      onSpotSelect(mockResults[0]);
    });

    // Then new search results arrive -- selectedSpot should reset to null
    act(() => {
      capturedOnResults!(mockResults);
    });

    await waitFor(() => {
      const lastCall = mockMapViewProps.mock.calls[mockMapViewProps.mock.calls.length - 1];
      expect(lastCall[0].selectedSpot).toBeNull();
    });
  });

  it('shows "No spots found" overlay when results are empty', async () => {
    render(<Home />);

    act(() => {
      capturedOnResults!([]);
    });

    await waitFor(() => {
      expect(screen.getByText('近くにスポットが見つかりませんでした')).toBeInTheDocument();
    });
  });

  it('hides "No spots found" overlay when results are non-empty', async () => {
    render(<Home />);

    // First, trigger zero results
    act(() => {
      capturedOnResults!([]);
    });

    await waitFor(() => {
      expect(screen.getByText('近くにスポットが見つかりませんでした')).toBeInTheDocument();
    });

    // Then trigger non-empty results
    act(() => {
      capturedOnResults!(mockResults);
    });

    await waitFor(() => {
      expect(screen.queryByText('近くにスポットが見つかりませんでした')).not.toBeInTheDocument();
    });
  });

  it('clears error message when new results arrive', async () => {
    render(<Home />);

    // Trigger error via onError
    const searchBarCall = mockSearchBarProps.mock.calls[0];
    const onError = searchBarCall[0].onError as (message: string) => void;

    act(() => {
      onError('Some error');
    });

    // Then successful results arrive
    act(() => {
      capturedOnResults!(mockResults);
    });

    await waitFor(() => {
      expect(screen.queryByText('Some error')).not.toBeInTheDocument();
    });
  });
});
