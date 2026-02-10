import { describe, it, expect } from 'vitest';
import { isChainStore, filterChainStores } from './chain-filter';

describe('isChainStore', () => {
  it.each([
    'スターバックス コーヒー 渋谷店',
    'マクドナルド 新宿東口店',
    'サイゼリヤ 池袋店',
    'ガスト 品川駅前店',
    'ジョナサン 恵比寿店',
    'デニーズ 六本木店',
    'ドトールコーヒーショップ',
    'タリーズコーヒー 丸の内店',
    'コメダ珈琲店 横浜西口店',
    '吉野家 渋谷店',
    'すき家 新橋店',
    '松屋 秋葉原店',
    // Phase 4 additions
    'サンマルクカフェ 池袋店',
    'エクセルシオール カフェ',
    'プロント 東京駅店',
    'ベローチェ 新橋店',
    'バーガーキング 渋谷センター街店',
    'サブウェイ 新宿三丁目店',
    'なか卯 秋葉原店',
    'CoCo壱番屋 渋谷店',
    'スシロー 品川店',
    'くら寿司 新宿店',
    'はま寿司 池袋店',
    'セブンイレブン 渋谷道玄坂店',
    'ファミリーマート 新宿三丁目店',
    'ローソン 六本木店',
    '鳥貴族 新宿東口店',
    'ワタミ 渋谷店',
    '一蘭 渋谷店',
    '一風堂 新宿店',
    '日高屋 秋葉原店',
    'ジョイフル 横浜店',
  ])('should detect Japanese chain: %s', (name) => {
    expect(isChainStore(name)).toBe(true);
  });

  it.each([
    'Starbucks Reserve Roastery',
    "McDonald's Shibuya",
    "Denny's Roppongi",
    "Tully's Coffee",
    'Komeda Coffee',
    'KFC Shinjuku',
    // Phase 4 additions
    'Burger King Shibuya',
    'Subway Shinjuku',
    'Seven-Eleven Tokyo',
    'FamilyMart Shibuya',
    'Lawson Roppongi',
    'Sushiro Shinagawa',
    'CoCo Ichibanya Shibuya',
    'Ichiran Ramen',
    'Ippudo Shinjuku',
  ])('should detect English chain: %s', (name) => {
    expect(isChainStore(name)).toBe(true);
  });

  it.each([
    '珈琲の店 Jonathan Artisan',
    'カフェ ド フロール',
    '古民家カフェ 和',
    'Blue Bottle Coffee',
    'Fuglen Tokyo',
    'Bear Pond Espresso',
    "Dennis's Craft Bar",
    // Phase 4: ensure no false positives
    '寿司 匠',
    'AFURI',
    '焼鳥 おみ乃',
    'Savor Coffee Roasters',
  ])('should NOT flag independent shop: %s', (name) => {
    expect(isChainStore(name)).toBe(false);
  });
});

describe('filterChainStores', () => {
  it('should filter out chain stores from array', () => {
    const places = [
      { name: 'スターバックス 渋谷店', id: '1' },
      { name: 'Fuglen Tokyo', id: '2' },
      { name: 'マクドナルド 新宿店', id: '3' },
      { name: 'カフェ ド フロール', id: '4' },
    ];

    const result = filterChainStores(places);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.name)).toEqual([
      'Fuglen Tokyo',
      'カフェ ド フロール',
    ]);
  });

  it('should return empty array when all are chains', () => {
    const places = [
      { name: 'スターバックス', id: '1' },
      { name: 'マクドナルド', id: '2' },
    ];
    expect(filterChainStores(places)).toHaveLength(0);
  });

  it('should return all when none are chains', () => {
    const places = [
      { name: 'Bear Pond Espresso', id: '1' },
      { name: 'Fuglen Tokyo', id: '2' },
    ];
    expect(filterChainStores(places)).toHaveLength(2);
  });
});
