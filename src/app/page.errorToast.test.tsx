import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { SearchResult } from '@/types/spot';
import { createMockSearchResult } from '@/test-helpers';

// ============================================================
// Tests for Task 13: Error Handling Integration
// Part 3: Page-level error toast display and auto-dismiss
// ============================================================

const mockMapViewProps = vi.fn();
const mockSearchBarProps = vi.fn();
let capturedOnResults: ((results: SearchResult[]) => void) | null = null;
let capturedOnError: ((message: string) => void) | null = null;

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

vi.mock('@/components/SearchBar', () => ({
  default: (props: Record<string, unknown>) => {
    mockSearchBarProps(props);
    capturedOnResults = props.onResults as (results: SearchResult[]) => void;
    capturedOnError = props.onError as (message: string) => void;
    return <div data-testid="search-bar" />;
  },
}));

vi.mock('@/app/actions', () => ({
  searchSpots: vi.fn(),
}));

import Home from './page';

describe('Page: error toast display and auto-dismiss', () => {
  let mockGetCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnResults = null;
    capturedOnError = null;
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

  it('shows error toast when onError is called', async () => {
    render(<Home />);

    act(() => {
      capturedOnError!('Search failed. Please try again.');
    });

    await waitFor(() => {
      expect(screen.getByText('Search failed. Please try again.')).toBeInTheDocument();
    });
  });

  it('auto-dismisses error toast after 5 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<Home />);

    act(() => {
      capturedOnError!('Search failed. Please try again.');
    });

    expect(screen.getByText('Search failed. Please try again.')).toBeInTheDocument();

    // Advance timers past the auto-dismiss timeout (5 seconds)
    act(() => {
      vi.advanceTimersByTime(5100);
    });

    await waitFor(() => {
      expect(screen.queryByText('Search failed. Please try again.')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('clears error toast when new successful results arrive', async () => {
    render(<Home />);

    act(() => {
      capturedOnError!('Some error');
    });

    expect(screen.getByText('Some error')).toBeInTheDocument();

    act(() => {
      capturedOnResults!([
        createMockSearchResult({
          id: 1, name: 'Cafe', lat: 35.68, lng: 139.77,
          category: 'Cafe', description: null, magazineContext: null,
          createdAt: null, distance: 0.5,
        }),
      ]);
    });

    await waitFor(() => {
      expect(screen.queryByText('Some error')).not.toBeInTheDocument();
    });
  });

  it('displays error toast with role="alert" for accessibility', async () => {
    render(<Home />);

    act(() => {
      capturedOnError!('Search failed. Please try again.');
    });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Search failed. Please try again.');
  });

  it('displays error toast in a styled container with z-50', async () => {
    render(<Home />);

    act(() => {
      capturedOnError!('Search failed. Please try again.');
    });

    const toast = screen.getByText('Search failed. Please try again.');
    const container = toast.closest('div');
    expect(container).toBeInTheDocument();
    expect(container!.className).toContain('z-50');
  });

  it('does not show error toast initially', () => {
    render(<Home />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
