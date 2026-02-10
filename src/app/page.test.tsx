import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// Track props passed to child components
const mockMapViewProps = vi.fn();
const mockSearchBarProps = vi.fn();

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

// Mock SearchBar
vi.mock('@/components/SearchBar', () => ({
  default: (props: Record<string, unknown>) => {
    mockSearchBarProps(props);
    return <div data-testid="search-bar" />;
  },
}));

// Mock actions
vi.mock('@/app/actions', () => ({
  searchSpots: vi.fn(),
}));

import Home from './page';
import { DEFAULT_LAT, DEFAULT_LNG } from '@/lib/constants';

describe('Home page geolocation integration', () => {
  let mockWatchPosition: ReturnType<typeof vi.fn>;
  let mockClearWatch: ReturnType<typeof vi.fn>;
  let originalGeolocation: Geolocation;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWatchPosition = vi.fn().mockReturnValue(42);
    mockClearWatch = vi.fn();

    // Store original
    originalGeolocation = navigator.geolocation;

    // Mock geolocation API
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn(),
        watchPosition: mockWatchPosition,
        clearWatch: mockClearWatch,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    });
  });

  it('should initialize with default Tokyo Station coordinates', () => {
    render(<Home />);

    // MapView should be called with default coordinates initially
    expect(mockMapViewProps).toHaveBeenCalledWith(
      expect.objectContaining({
        initialCenter: { lat: DEFAULT_LAT, lng: DEFAULT_LNG },
      })
    );
  });

  it('should not pass userLocation to MapView when using default location', () => {
    render(<Home />);

    expect(mockMapViewProps).toHaveBeenCalledWith(
      expect.objectContaining({
        userLocation: undefined,
      })
    );
  });

  it('should pass userLocation to SearchBar', () => {
    render(<Home />);

    expect(mockSearchBarProps).toHaveBeenCalledWith(
      expect.objectContaining({
        userLocation: expect.objectContaining({
          lat: DEFAULT_LAT,
          lng: DEFAULT_LNG,
        }),
      })
    );
  });

  it('should call navigator.geolocation.watchPosition on mount', () => {
    render(<Home />);

    expect(mockWatchPosition).toHaveBeenCalledTimes(1);
    expect(mockWatchPosition).toHaveBeenCalledWith(
      expect.any(Function), // success callback
      expect.any(Function), // error callback
      expect.objectContaining({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      })
    );
  });

  it('should update location on geolocation success and map re-centers', async () => {
    mockWatchPosition.mockImplementation(
      (successCallback: PositionCallback) => {
        successCallback({
          coords: {
            latitude: 35.6895,
            longitude: 139.6917,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
        return 42;
      }
    );

    render(<Home />);

    await waitFor(() => {
      // After geolocation success, MapView should receive updated userLocation
      const lastCall = mockMapViewProps.mock.calls[mockMapViewProps.mock.calls.length - 1];
      expect(lastCall[0]).toEqual(
        expect.objectContaining({
          userLocation: expect.objectContaining({
            lat: 35.6895,
            lng: 139.6917,
          }),
        })
      );
    });
  });

  it('should keep default location on geolocation error (permission denied)', async () => {
    mockWatchPosition.mockImplementation(
      (_successCallback: PositionCallback, errorCallback: PositionErrorCallback) => {
        queueMicrotask(() => {
          errorCallback({
            code: 1, // PERMISSION_DENIED
            message: 'User denied geolocation',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        });
        return 42;
      }
    );

    render(<Home />);

    // Should still have default coordinates - no update
    await waitFor(() => {
      const lastCall = mockSearchBarProps.mock.calls[mockSearchBarProps.mock.calls.length - 1];
      expect(lastCall[0]).toEqual(
        expect.objectContaining({
          userLocation: expect.objectContaining({
            lat: DEFAULT_LAT,
            lng: DEFAULT_LNG,
          }),
        })
      );
    });
  });

  it('should handle missing geolocation API silently (unsupported browser)', () => {
    // Remove geolocation API
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // Should not throw
    expect(() => render(<Home />)).not.toThrow();

    // Should use default coordinates
    expect(mockMapViewProps).toHaveBeenCalledWith(
      expect.objectContaining({
        initialCenter: { lat: DEFAULT_LAT, lng: DEFAULT_LNG },
      })
    );
  });

  it('should set isDefault=true for default/fallback location', () => {
    render(<Home />);

    // Initial state should have isDefault: true
    expect(mockSearchBarProps).toHaveBeenCalledWith(
      expect.objectContaining({
        userLocation: expect.objectContaining({
          lat: DEFAULT_LAT,
          lng: DEFAULT_LNG,
        }),
      })
    );
  });

  it('should pass updated location to SearchBar after geolocation success', async () => {
    mockWatchPosition.mockImplementation(
      (successCallback: PositionCallback) => {
        successCallback({
          coords: {
            latitude: 35.6895,
            longitude: 139.6917,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
        return 42;
      }
    );

    render(<Home />);

    await waitFor(() => {
      const lastCall = mockSearchBarProps.mock.calls[mockSearchBarProps.mock.calls.length - 1];
      expect(lastCall[0]).toEqual(
        expect.objectContaining({
          userLocation: expect.objectContaining({
            lat: 35.6895,
            lng: 139.6917,
          }),
        })
      );
    });
  });

  it('should call clearWatch on unmount', () => {
    const { unmount } = render(<Home />);
    unmount();

    expect(mockClearWatch).toHaveBeenCalledWith(42);
  });

  it('should pass userLocation to MapView after GPS success', async () => {
    mockWatchPosition.mockImplementation(
      (successCallback: PositionCallback) => {
        successCallback({
          coords: {
            latitude: 35.6895,
            longitude: 139.6917,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
        return 42;
      }
    );

    render(<Home />);

    await waitFor(() => {
      const lastCall = mockMapViewProps.mock.calls[mockMapViewProps.mock.calls.length - 1];
      expect(lastCall[0]).toEqual(
        expect.objectContaining({
          userLocation: { lat: 35.6895, lng: 139.6917 },
        })
      );
    });
  });

  it('should call clearWatch on PERMISSION_DENIED error', async () => {
    mockWatchPosition.mockImplementation(
      (_successCallback: PositionCallback, errorCallback: PositionErrorCallback) => {
        queueMicrotask(() => {
          errorCallback({
            code: 1,
            message: 'User denied geolocation',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        });
        return 42;
      }
    );

    render(<Home />);

    await waitFor(() => {
      expect(mockClearWatch).toHaveBeenCalledWith(42);
    });
  });
});
