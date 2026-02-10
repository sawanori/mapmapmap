import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VibeCard from './VibeCard';
import type { VibePlace } from '@/types/vibe';

function makeMockVibePlace(overrides: Partial<VibePlace> = {}): VibePlace {
  return {
    id: 'place_1',
    name: 'カフェ モカ',
    catchphrase: '夜に溶ける珈琲の香り',
    vibeTags: ['#深夜の読書', '#照明暗め', '#一人時間'],
    heroImageUrl: 'https://photo.url/hero.jpg',
    moodScore: { chill: 85, party: 10, focus: 70 },
    hiddenGemsInfo: '奥の席にコンセントあり',
    isRejected: false,
    lat: 35.65,
    lng: 139.7,
    category: 'Cafe',
    rating: 4.2,
    address: '東京都渋谷区',
    openingHours: null,
    distance: 0.5,
    ...overrides,
  };
}

describe('VibeCard', () => {
  it('should render place name', () => {
    render(<VibeCard place={makeMockVibePlace()} />);
    expect(screen.getByText('カフェ モカ')).toBeInTheDocument();
  });

  it('should render catchphrase', () => {
    render(<VibeCard place={makeMockVibePlace()} />);
    expect(screen.getByText('夜に溶ける珈琲の香り')).toBeInTheDocument();
  });

  it('should render all vibe tags', () => {
    render(<VibeCard place={makeMockVibePlace()} />);
    expect(screen.getByText('#深夜の読書')).toBeInTheDocument();
    expect(screen.getByText('#照明暗め')).toBeInTheDocument();
    expect(screen.getByText('#一人時間')).toBeInTheDocument();
  });

  it('should render category badge', () => {
    render(<VibeCard place={makeMockVibePlace()} />);
    expect(screen.getByText('Cafe')).toBeInTheDocument();
  });

  it('should render distance in meters when < 1km', () => {
    render(<VibeCard place={makeMockVibePlace({ distance: 0.5 })} />);
    expect(screen.getByText('500m')).toBeInTheDocument();
  });

  it('should render distance in km when >= 1km', () => {
    render(<VibeCard place={makeMockVibePlace({ distance: 2.3 })} />);
    expect(screen.getByText('2.3km')).toBeInTheDocument();
  });

  it('should render rating when available', () => {
    render(<VibeCard place={makeMockVibePlace({ rating: 4.2 })} />);
    expect(screen.getByText('★ 4.2')).toBeInTheDocument();
  });

  it('should not render rating when null', () => {
    render(<VibeCard place={makeMockVibePlace({ rating: null })} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it('should render hidden gems info', () => {
    render(<VibeCard place={makeMockVibePlace()} />);
    expect(screen.getByText('奥の席にコンセントあり')).toBeInTheDocument();
  });

  it('should not render hidden gems when empty', () => {
    render(<VibeCard place={makeMockVibePlace({ hiddenGemsInfo: '' })} />);
    expect(screen.queryByText('💎')).not.toBeInTheDocument();
  });

  it('should render hero image when URL is provided', () => {
    render(<VibeCard place={makeMockVibePlace()} />);
    const img = screen.getByAltText('カフェ モカ');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://photo.url/hero.jpg');
  });

  it('should render gradient fallback when no hero image', () => {
    const { container } = render(
      <VibeCard place={makeMockVibePlace({ heroImageUrl: '' })} />,
    );
    expect(container.querySelector('.bg-gradient-to-br')).toBeInTheDocument();
  });

  it('should have aria-label with name and catchphrase', () => {
    render(<VibeCard place={makeMockVibePlace()} />);
    expect(
      screen.getByRole('article', { name: 'カフェ モカ - 夜に溶ける珈琲の香り' }),
    ).toBeInTheDocument();
  });

  it('should call onTap when clicked', async () => {
    const user = userEvent.setup();
    const onTap = vi.fn();
    render(<VibeCard place={makeMockVibePlace()} onTap={onTap} />);

    await user.click(screen.getByRole('article'));
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
