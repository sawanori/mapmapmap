import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock motion/react — filter motion-specific props from DOM elements
vi.mock('motion/react', () => {
  const filterMotionProps = (props: Record<string, unknown>) => {
    const motionKeys = [
      'drag', 'dragConstraints', 'dragElastic', 'onDragEnd',
      'initial', 'animate', 'exit', 'transition', 'whileDrag',
      'style', 'layout',
    ];
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!motionKeys.includes(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  };

  const MotionDiv = React.forwardRef<HTMLDivElement, Record<string, unknown>>((props, ref) => {
    const { children, ...rest } = filterMotionProps(props);
    return React.createElement('div', { ...rest, ref }, children as React.ReactNode);
  });
  MotionDiv.displayName = 'MotionDiv';

  return {
    motion: { div: MotionDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    useMotionValue: (initial: number) => ({ get: () => initial, set: () => {} }),
    useTransform: () => ({ get: () => 0, set: () => {} }),
  };
});

import SwipeIntro from './SwipeIntro';
import { makeMockVibePlace } from '@/test-utils/mock-data';

function makePlaces(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makeMockVibePlace(`p${i + 1}`, `Place ${i + 1}`),
  );
}

describe('SwipeIntro', () => {
  const defaultProps = {
    savedPlaceIds: [] as string[],
    onLike: vi.fn(),
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render first card', () => {
    render(<SwipeIntro places={makePlaces(3)} {...defaultProps} />);
    expect(screen.getByText('Place 1')).toBeInTheDocument();
  });

  it('should show progress indicators for 3 cards', () => {
    const { container } = render(<SwipeIntro places={makePlaces(3)} {...defaultProps} />);
    // 3 progress dots (h-1 distinguishes them from buttons)
    const dots = container.querySelectorAll('.h-1.rounded-full');
    expect(dots.length).toBe(3);
  });

  it('should show empty state when no places', () => {
    render(<SwipeIntro places={[]} {...defaultProps} />);
    expect(screen.getByText(/条件に合う候補が見つかりませんでした/)).toBeInTheDocument();
  });

  it('should show like/pass buttons', () => {
    render(<SwipeIntro places={makePlaces(3)} {...defaultProps} />);
    expect(screen.getByLabelText('お気に入りに追加')).toBeInTheDocument();
    expect(screen.getByLabelText('パスする')).toBeInTheDocument();
  });

  it('should call onLike when like button clicked', async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    render(<SwipeIntro places={makePlaces(3)} {...defaultProps} onLike={onLike} />);

    await user.click(screen.getByLabelText('お気に入りに追加'));
    expect(onLike).toHaveBeenCalledWith('p1');
  });

  it('should advance to next card after like', async () => {
    const user = userEvent.setup();
    render(<SwipeIntro places={makePlaces(3)} {...defaultProps} />);

    await user.click(screen.getByLabelText('お気に入りに追加'));
    expect(screen.getByText('Place 2')).toBeInTheDocument();
  });

  it('should advance to next card after pass', async () => {
    const user = userEvent.setup();
    render(<SwipeIntro places={makePlaces(3)} {...defaultProps} />);

    await user.click(screen.getByLabelText('パスする'));
    expect(screen.getByText('Place 2')).toBeInTheDocument();
  });

  it('should not call onLike when pass clicked', async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    render(<SwipeIntro places={makePlaces(3)} {...defaultProps} onLike={onLike} />);

    await user.click(screen.getByLabelText('パスする'));
    expect(onLike).not.toHaveBeenCalled();
  });

  it('should call onComplete after all cards are swiped', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SwipeIntro places={makePlaces(2)} {...defaultProps} onComplete={onComplete} />);

    await user.click(screen.getByLabelText('パスする'));
    await user.click(screen.getByLabelText('パスする'));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should handle keyboard ArrowRight as like', async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    render(<SwipeIntro places={makePlaces(3)} {...defaultProps} onLike={onLike} />);

    await user.keyboard('{ArrowRight}');
    expect(onLike).toHaveBeenCalledWith('p1');
    expect(screen.getByText('Place 2')).toBeInTheDocument();
  });

  it('should handle keyboard ArrowLeft as pass', async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    render(<SwipeIntro places={makePlaces(3)} {...defaultProps} onLike={onLike} />);

    await user.keyboard('{ArrowLeft}');
    expect(onLike).not.toHaveBeenCalled();
    expect(screen.getByText('Place 2')).toBeInTheDocument();
  });

  it('should have swipe card region', () => {
    render(<SwipeIntro places={makePlaces(3)} {...defaultProps} />);
    expect(screen.getByRole('region', { name: 'スワイプカード' })).toBeInTheDocument();
  });
});
