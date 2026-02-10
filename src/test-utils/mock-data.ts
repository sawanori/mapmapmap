import type { VibePlace } from '@/types/vibe';

export function makeMockVibePlace(
  id: string,
  name: string,
  overrides?: Partial<VibePlace>,
): VibePlace {
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
    openNow: true,
    priceLevel: 1,
    distance: 0.5,
    ...overrides,
  };
}
