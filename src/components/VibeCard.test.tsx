import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VibeCard from './VibeCard';
import { makeMockVibePlace as _makeMock } from '@/test-utils/mock-data';
import type { VibePlace } from '@/types/vibe';

/** VibeCard tests use specific default values */
function makeMockVibePlace(overrides: Partial<VibePlace> = {}): VibePlace {
  return _makeMock('place_1', 'カフェ モカ', {
    catchphrase: '夜に溶ける珈琲の香り',
    vibeTags: ['#深夜の読書', '#照明暗め', '#一人時間'],
    heroImageUrl: 'https://photo.url/hero.jpg',
    moodScore: { chill: 85, party: 10, focus: 70 },
    hiddenGemsInfo: '奥の席にコンセントあり',
    ...overrides,
  });
}

const defaultProps = {
  isSaved: false,
  onStartRoute: vi.fn(),
  onToggleSaved: vi.fn(),
};

describe('VibeCard', () => {
  it('should render place name', () => {
    render(<VibeCard place={makeMockVibePlace()} {...defaultProps} />);
    expect(screen.getByText('カフェ モカ')).toBeInTheDocument();
  });

  it('should render catchphrase', () => {
    render(<VibeCard place={makeMockVibePlace()} {...defaultProps} />);
    expect(screen.getByText('夜に溶ける珈琲の香り')).toBeInTheDocument();
  });

  it('should render all vibe tags', () => {
    render(<VibeCard place={makeMockVibePlace()} {...defaultProps} />);
    expect(screen.getByText('#深夜の読書')).toBeInTheDocument();
    expect(screen.getByText('#照明暗め')).toBeInTheDocument();
    expect(screen.getByText('#一人時間')).toBeInTheDocument();
  });

  it('should render category badge', () => {
    render(<VibeCard place={makeMockVibePlace()} {...defaultProps} />);
    expect(screen.getByText('Cafe')).toBeInTheDocument();
  });

  it('should render distance in meters when < 1km', () => {
    render(<VibeCard place={makeMockVibePlace({ distance: 0.5 })} {...defaultProps} />);
    expect(screen.getByText('500m')).toBeInTheDocument();
  });

  it('should render distance in km when >= 1km', () => {
    render(<VibeCard place={makeMockVibePlace({ distance: 2.3 })} {...defaultProps} />);
    expect(screen.getByText('2.3km')).toBeInTheDocument();
  });

  it('should render walk time', () => {
    render(<VibeCard place={makeMockVibePlace({ distance: 0.8 })} {...defaultProps} />);
    // 0.8km = 800m / 80m/min = 10min
    expect(screen.getByText('徒歩10分')).toBeInTheDocument();
  });

  it('should render rating when available', () => {
    render(<VibeCard place={makeMockVibePlace({ rating: 4.2 })} {...defaultProps} />);
    expect(screen.getByText('★ 4.2')).toBeInTheDocument();
  });

  it('should not render rating when null', () => {
    render(<VibeCard place={makeMockVibePlace({ rating: null })} {...defaultProps} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it('should show 営業中 badge when openNow is true', () => {
    render(<VibeCard place={makeMockVibePlace({ openNow: true })} {...defaultProps} />);
    expect(screen.getByText('営業中')).toBeInTheDocument();
  });

  it('should show 営業時間外 badge when openNow is false', () => {
    render(<VibeCard place={makeMockVibePlace({ openNow: false })} {...defaultProps} />);
    expect(screen.getByText('営業時間外')).toBeInTheDocument();
  });

  it('should not show open status badge when openNow is null', () => {
    render(<VibeCard place={makeMockVibePlace({ openNow: null })} {...defaultProps} />);
    expect(screen.queryByText('営業中')).not.toBeInTheDocument();
    expect(screen.queryByText('営業時間外')).not.toBeInTheDocument();
  });

  it('should render hero image when URL is provided', () => {
    render(<VibeCard place={makeMockVibePlace()} {...defaultProps} />);
    const img = screen.getByAltText('カフェ モカ');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://photo.url/hero.jpg');
  });

  it('should render gradient fallback when no hero image', () => {
    const { container } = render(
      <VibeCard place={makeMockVibePlace({ heroImageUrl: '' })} {...defaultProps} />,
    );
    expect(container.querySelector('.bg-gradient-to-br')).toBeInTheDocument();
  });

  it('should have aria-label with name and catchphrase', () => {
    render(<VibeCard place={makeMockVibePlace()} {...defaultProps} />);
    expect(
      screen.getByRole('article', { name: 'カフェ モカ - 夜に溶ける珈琲の香り' }),
    ).toBeInTheDocument();
  });

  it('should call onSelect when image area clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<VibeCard place={makeMockVibePlace()} {...defaultProps} onSelect={onSelect} />);

    await user.click(screen.getByText('カフェ モカ'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should call onStartRoute when ルート開始 clicked', async () => {
    const user = userEvent.setup();
    const onStartRoute = vi.fn();
    render(<VibeCard place={makeMockVibePlace()} {...defaultProps} onStartRoute={onStartRoute} />);

    await user.click(screen.getByText('ルート開始'));
    expect(onStartRoute).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleSaved when 行きたい clicked', async () => {
    const user = userEvent.setup();
    const onToggleSaved = vi.fn();
    render(<VibeCard place={makeMockVibePlace()} {...defaultProps} onToggleSaved={onToggleSaved} />);

    await user.click(screen.getByLabelText('行きたい'));
    expect(onToggleSaved).toHaveBeenCalledTimes(1);
  });

  it('should show filled heart when isSaved is true', () => {
    render(<VibeCard place={makeMockVibePlace()} {...defaultProps} isSaved={true} />);
    expect(screen.getByLabelText('行きたいを解除')).toBeInTheDocument();
  });
});
