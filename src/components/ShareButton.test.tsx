import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareButton from './ShareButton';
import type { VibePlace } from '@/types/vibe';

vi.mock('@/lib/share', () => ({
  buildPlaceShareUrl: vi.fn().mockReturnValue('https://vibe-map.app/share?mock=true'),
  shareOrCopy: vi.fn().mockResolvedValue('copied'),
}));

import { shareOrCopy } from '@/lib/share';

function makeMockPlace(): VibePlace {
  return {
    id: 'p1',
    name: 'カフェ モカ',
    catchphrase: '夜に溶ける珈琲の香り',
    vibeTags: ['#深夜の読書', '#照明暗め', '#一人時間'],
    heroImageUrl: 'https://photo.url/hero.jpg',
    moodScore: { chill: 85, party: 10, focus: 70 },
    hiddenGemsInfo: '',
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

describe('ShareButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render share button', () => {
    render(<ShareButton place={makeMockPlace()} mood="chill" />);
    expect(screen.getByText('シェア')).toBeInTheDocument();
  });

  it('should have aria-label', () => {
    render(<ShareButton place={makeMockPlace()} mood="chill" />);
    expect(screen.getByLabelText('カフェ モカをシェアする')).toBeInTheDocument();
  });

  it('should call shareOrCopy when clicked', async () => {
    const user = userEvent.setup();
    render(<ShareButton place={makeMockPlace()} mood="chill" />);

    await user.click(screen.getByText('シェア'));

    expect(shareOrCopy).toHaveBeenCalledWith(
      'カフェ モカ - MAPMAPMAP!!!',
      '夜に溶ける珈琲の香り',
      'https://vibe-map.app/share?mock=true',
    );
  });

  it('should show "コピー済み" after clipboard copy', async () => {
    const user = userEvent.setup();
    vi.mocked(shareOrCopy).mockResolvedValue('copied');

    render(<ShareButton place={makeMockPlace()} mood="chill" />);
    await user.click(screen.getByText('シェア'));

    expect(await screen.findByText('コピー済み')).toBeInTheDocument();
  });
});
