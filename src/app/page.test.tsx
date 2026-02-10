import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';

// Mock vibe-actions
vi.mock('@/app/vibe-actions', () => ({
  searchByMood: vi.fn(),
}));

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (!['drag', 'dragConstraints', 'dragElastic', 'initial', 'animate', 'exit', 'transition', 'whileDrag', 'onDragEnd', 'style'].includes(k)) {
          safe[k] = v;
        }
      }
      return <div {...safe}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useMotionValue: (initial: number) => ({ get: () => initial, set: () => {} }),
  useTransform: () => ({ get: () => 0 }),
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
import type { VibePlace } from '@/types/vibe';

function makeMockVibePlace(id: string, name: string): VibePlace {
  return {
    id,
    name,
    catchphrase: '素敵な空間',
    vibeTags: ['#tag1', '#tag2', '#tag3'],
    heroImageUrl: 'https://photo.url/test.jpg',
    moodScore: { chill: 80, party: 20, focus: 60 },
    hiddenGemsInfo: 'テラス席',
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

/** Helper: select a mood then go through the LocationPrompt by clicking skip */
async function selectMoodAndLocate(user: ReturnType<typeof userEvent.setup>, moodLabel: string) {
  await user.click(screen.getByText(moodLabel));
  await user.click(screen.getByText('みなとみらいで探す'));
}

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

  it('should show LocationPrompt after mood selection (first time)', async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByText('まったり'));
    expect(screen.getByText('現在地を使ってもいい？')).toBeInTheDocument();
    expect(screen.getByText('みなとみらいで探す')).toBeInTheDocument();
  });

  it('should show loading state after mood selection and location skip', async () => {
    const user = userEvent.setup();
    vi.mocked(searchByMood).mockImplementation(
      () => new Promise(() => {}), // never resolves - keeps loading state
    );

    render(<Home />);
    await selectMoodAndLocate(user, 'まったり');

    expect(screen.getByText('スポットを探しています...')).toBeInTheDocument();
  });

  it('should show cards after successful load', async () => {
    const user = userEvent.setup();
    const places = [
      makeMockVibePlace('p1', 'カフェA'),
      makeMockVibePlace('p2', 'カフェB'),
    ];
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: places,
    });

    render(<Home />);
    await selectMoodAndLocate(user, 'まったり');

    await waitFor(() => {
      expect(screen.getByText('カフェA')).toBeInTheDocument();
    });
  });

  it('should show no results message when API returns empty', async () => {
    const user = userEvent.setup();
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: [],
      message: '近くにスポットが見つかりませんでした',
    });

    render(<Home />);
    await selectMoodAndLocate(user, 'まったり');

    await waitFor(() => {
      expect(screen.getByText('近くにスポットが見つかりませんでした')).toBeInTheDocument();
    });
  });

  it('should show "気分を変える" button when mood is selected', async () => {
    const user = userEvent.setup();
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: [makeMockVibePlace('p1', 'カフェA')],
    });

    render(<Home />);
    await selectMoodAndLocate(user, 'まったり');

    await waitFor(() => {
      expect(screen.getByLabelText('ムードを変更')).toBeInTheDocument();
    });
  });

  it('should return to mood selector when changing mood', async () => {
    const user = userEvent.setup();
    vi.mocked(searchByMood).mockResolvedValue({
      success: true,
      data: [makeMockVibePlace('p1', 'カフェA')],
    });

    render(<Home />);
    await selectMoodAndLocate(user, 'まったり');

    await waitFor(() => {
      expect(screen.getByText('カフェA')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('ムードを変更'));

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
