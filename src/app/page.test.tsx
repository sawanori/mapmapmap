import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';

// Mock vibe-actions
vi.mock('@/app/vibe-actions', () => ({
  searchByMood: vi.fn(),
}));

// Mock geocoding-actions
vi.mock('@/app/geocoding-actions', () => ({
  geocodeStation: vi.fn(),
}));

// Mock route helper
vi.mock('@/lib/route', () => ({
  openRoute: vi.fn(),
}));

// Mock next/dynamic for LikedMap
vi.mock('next/dynamic', () => ({
  default: () => {
    const Mock = (props: Record<string, unknown>) => (
      <div data-testid="liked-map">
        <button onClick={props.onBack as () => void}>← 戻る</button>
      </div>
    );
    Mock.displayName = 'MockLikedMap';
    return Mock;
  },
}));

import Home from './page';
import { useVibeStore } from '@/store/vibe-store';
import { searchByMood } from '@/app/vibe-actions';
import { makeMockVibePlace } from '@/test-utils/mock-data';

describe('Home page - Vibe flow', () => {
  let originalGeolocation: Geolocation;

  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useVibeStore.getState().reset();
    });
    originalGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn(),
        watchPosition: vi.fn().mockReturnValue(42),
        clearWatch: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    });
  });

  it('should show MoodSelector on initial load', () => {
    render(<Home />);
    expect(screen.getByText('今の気分は？')).toBeInTheDocument();
    expect(screen.getByText('まったり')).toBeInTheDocument();
    expect(screen.getByText('ワイワイ')).toBeInTheDocument();
    expect(screen.getByText('集中')).toBeInTheDocument();
  });

  it('should show MAPMAPMAP!!! heading', () => {
    render(<Home />);
    expect(screen.getByText('MAPMAPMAP!!!')).toBeInTheDocument();
  });

  it('should NOT call geolocation on mount', () => {
    render(<Home />);
    expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('should show Permission Gate after mood selection (first time)', async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByText('まったり'));
    expect(screen.getByText('近くのスポットを出すために位置情報を使います')).toBeInTheDocument();
    expect(screen.getByText('駅名で探す')).toBeInTheDocument();
  });

  it('should show results after geolocation grant', async () => {
    const user = userEvent.setup();
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: [makeMockVibePlace('p1', 'カフェA')],
    });

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (success) => {
        success({
          coords: { latitude: 35.68, longitude: 139.76 },
        } as GeolocationPosition);
      },
    );

    render(<Home />);
    await user.click(screen.getByText('まったり'));
    await user.click(screen.getByText('位置情報を許可して探す'));

    await waitFor(() => {
      expect(screen.getByText('カフェA')).toBeInTheDocument();
    });
  });

  it('should show no results message when API returns empty', async () => {
    const user = userEvent.setup();
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: [],
    });

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (success) => {
        success({
          coords: { latitude: 35.68, longitude: 139.76 },
        } as GeolocationPosition);
      },
    );

    render(<Home />);
    await user.click(screen.getByText('まったり'));
    await user.click(screen.getByText('位置情報を許可して探す'));

    await waitFor(() => {
      expect(screen.getByText(/条件に合う候補が見つかりませんでした/)).toBeInTheDocument();
    });
  });

  it('should show "気分を変える" button when mood is selected', async () => {
    const user = userEvent.setup();
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: [makeMockVibePlace('p1', 'カフェA')],
    });

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (success) => {
        success({
          coords: { latitude: 35.68, longitude: 139.76 },
        } as GeolocationPosition);
      },
    );

    render(<Home />);
    await user.click(screen.getByText('まったり'));
    await user.click(screen.getByText('位置情報を許可して探す'));

    await waitFor(() => {
      expect(screen.getByText('気分を変える')).toBeInTheDocument();
    });
  });

  it('should return to mood selector when changing mood', async () => {
    const user = userEvent.setup();
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: [makeMockVibePlace('p1', 'カフェA')],
    });

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (success) => {
        success({
          coords: { latitude: 35.68, longitude: 139.76 },
        } as GeolocationPosition);
      },
    );

    render(<Home />);
    await user.click(screen.getByText('まったり'));
    await user.click(screen.getByText('位置情報を許可して探す'));

    await waitFor(() => {
      expect(screen.getByText('カフェA')).toBeInTheDocument();
    });

    await user.click(screen.getByText('気分を変える'));
    expect(screen.getByText('今の気分は？')).toBeInTheDocument();
  });

  it('should handle missing geolocation API gracefully', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(() => render(<Home />)).not.toThrow();
    expect(screen.getByText('今の気分は？')).toBeInTheDocument();
  });

  it('should show idle header text before geolocation', () => {
    render(<Home />);
    expect(screen.getByText('気分に合ったスポットを見つけよう')).toBeInTheDocument();
  });
});
