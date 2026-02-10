import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VibePlace } from '@/types/vibe';

// Mock motion/react to avoid animation complexity in tests
vi.mock('motion/react', () => ({
  motion: {
    div: ({
      children,
      onDragEnd: _onDragEnd,
      ...props
    }: {
      children?: React.ReactNode;
      onDragEnd?: (e: unknown, info: unknown) => void;
      [key: string]: unknown;
    }) => (
      <div data-testid="motion-card" {...filterDomProps(props)}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// Filter out motion-specific props that shouldn't be on DOM elements
function filterDomProps(props: Record<string, unknown>): Record<string, unknown> {
  const motionProps = [
    'drag', 'dragConstraints', 'dragElastic', 'initial', 'animate',
    'exit', 'transition', 'whileDrag', 'onDragEnd',
  ];
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!motionProps.includes(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

import CardStack from './CardStack';

function makeMockVibePlace(id: string, name: string): VibePlace {
  return {
    id,
    name,
    catchphrase: '素敵な空間',
    vibeTags: ['#tag1', '#tag2', '#tag3'],
    heroImageUrl: 'https://photo.url/test.jpg',
    moodScore: { chill: 80, party: 20, focus: 60 },
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

describe('CardStack', () => {
  const cards = [
    makeMockVibePlace('p1', 'カフェA'),
    makeMockVibePlace('p2', 'カフェB'),
    makeMockVibePlace('p3', 'カフェC'),
  ];

  it('should render the current card', () => {
    render(
      <CardStack
        cards={cards}
        currentIndex={0}
        onLike={vi.fn()}
        onPass={vi.fn()}
      />,
    );
    expect(screen.getByText('カフェA')).toBeInTheDocument();
  });

  it('should render next card preview', () => {
    render(
      <CardStack
        cards={cards}
        currentIndex={0}
        onLike={vi.fn()}
        onPass={vi.fn()}
      />,
    );
    // Both current and next card render their names
    expect(screen.getByText('カフェB')).toBeInTheDocument();
  });

  it('should render like/pass buttons', () => {
    render(
      <CardStack
        cards={cards}
        currentIndex={0}
        onLike={vi.fn()}
        onPass={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('お気に入りに追加')).toBeInTheDocument();
    expect(screen.getByLabelText('パスする')).toBeInTheDocument();
  });

  it('should call onLike when like button is clicked', async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    render(
      <CardStack
        cards={cards}
        currentIndex={0}
        onLike={onLike}
        onPass={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('お気に入りに追加'));
    expect(onLike).toHaveBeenCalledWith(cards[0]);
  });

  it('should call onPass when pass button is clicked', async () => {
    const user = userEvent.setup();
    const onPass = vi.fn();
    render(
      <CardStack
        cards={cards}
        currentIndex={0}
        onLike={vi.fn()}
        onPass={onPass}
      />,
    );

    await user.click(screen.getByLabelText('パスする'));
    expect(onPass).toHaveBeenCalledWith('p1');
  });

  it('should call onLike on ArrowRight key', () => {
    const onLike = vi.fn();
    render(
      <CardStack
        cards={cards}
        currentIndex={0}
        onLike={onLike}
        onPass={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(onLike).toHaveBeenCalledWith(cards[0]);
  });

  it('should call onPass on ArrowLeft key', () => {
    const onPass = vi.fn();
    render(
      <CardStack
        cards={cards}
        currentIndex={0}
        onLike={vi.fn()}
        onPass={onPass}
      />,
    );

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(onPass).toHaveBeenCalledWith('p1');
  });

  it('should call onTap on Enter key', () => {
    const onTap = vi.fn();
    render(
      <CardStack
        cards={cards}
        currentIndex={0}
        onLike={vi.fn()}
        onPass={vi.fn()}
        onTap={onTap}
      />,
    );

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onTap).toHaveBeenCalledWith(cards[0]);
  });

  it('should call onTap on Space key', () => {
    const onTap = vi.fn();
    render(
      <CardStack
        cards={cards}
        currentIndex={0}
        onLike={vi.fn()}
        onPass={vi.fn()}
        onTap={onTap}
      />,
    );

    fireEvent.keyDown(document, { key: ' ' });
    expect(onTap).toHaveBeenCalledWith(cards[0]);
  });

  it('should return null when currentIndex is out of bounds', () => {
    const { container } = render(
      <CardStack
        cards={cards}
        currentIndex={10}
        onLike={vi.fn()}
        onPass={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should not render next card preview on last card', () => {
    render(
      <CardStack
        cards={cards}
        currentIndex={2}
        onLike={vi.fn()}
        onPass={vi.fn()}
      />,
    );
    expect(screen.getByText('カフェC')).toBeInTheDocument();
    // カフェC should be the only card visible (no next card)
    expect(screen.queryByText('カフェA')).not.toBeInTheDocument();
  });

  it('should have touch-action: none for iOS Safari compatibility', () => {
    render(
      <CardStack
        cards={cards}
        currentIndex={0}
        onLike={vi.fn()}
        onPass={vi.fn()}
      />,
    );
    const region = screen.getByRole('region', { name: 'スワイプカード' });
    expect(region.style.touchAction).toBe('none');
  });

  it('should have aria-label on card region', () => {
    render(
      <CardStack
        cards={cards}
        currentIndex={0}
        onLike={vi.fn()}
        onPass={vi.fn()}
      />,
    );
    expect(screen.getByRole('region', { name: 'スワイプカード' })).toBeInTheDocument();
  });
});
