/**
 * チェーン店判定フィルタ。
 * 日本語名は substring match、英語名は \b 語境界付き正規表現で偽陽性を低減。
 */

const CHAIN_PATTERNS: Array<{ ja: string; en: RegExp }> = [
  // --- カフェチェーン ---
  { ja: 'スターバックス', en: /\bStarbucks\b/i },
  { ja: 'ドトール', en: /\bDoutor\b/i },
  { ja: 'タリーズ', en: /\bTully'?s?\b/i },
  { ja: 'コメダ', en: /\bKomeda\b/i },
  { ja: 'サンマルクカフェ', en: /\bSt\. Marc Caf[eé]\b/i },
  { ja: 'エクセルシオール', en: /\bExcelsior Caff[eé]\b/i },
  { ja: 'プロント', en: /\bPRONTO\b/i },
  { ja: 'ベローチェ', en: /\bVeloce\b/i },
  { ja: 'カフェ・ド・クリエ', en: /\bCaf[eé] de Cri[eé]\b/i },

  // --- ファストフード ---
  { ja: 'マクドナルド', en: /\bMcDonald'?s?\b/i },
  { ja: 'ケンタッキー', en: /\bKFC\b/i },
  { ja: 'モスバーガー', en: /\bMos Burger\b/i },
  { ja: 'ロッテリア', en: /\bLotteria\b/i },
  { ja: 'バーガーキング', en: /\bBurger King\b/i },
  { ja: 'ウェンディーズ', en: /\bWendy'?s?\b/i },
  { ja: 'サブウェイ', en: /\bSubway\b/i },
  { ja: 'フレッシュネスバーガー', en: /\bFreshness Burger\b/i },

  // --- ファミレス ---
  { ja: 'サイゼリヤ', en: /\bSaizeriya\b/i },
  { ja: 'ガスト', en: /\bGusto\b/i },
  { ja: 'ジョナサン', en: /\bJonathan'?s\b/i },
  { ja: 'デニーズ', en: /\bDenny'?s?\b/i },
  { ja: 'バーミヤン', en: /\bBarmiyan\b/i },
  { ja: 'ココス', en: /\bCocos\b/i },
  { ja: 'ロイヤルホスト', en: /\bRoyal Host\b/i },
  { ja: 'ジョイフル', en: /\bJoyfull?\b/i },
  { ja: 'ビッグボーイ', en: /\bBig Boy\b/i },

  // --- 牛丼・カレー ---
  { ja: '吉野家', en: /\bYoshinoya\b/i },
  { ja: 'すき家', en: /\bSukiya\b/i },
  { ja: '松屋', en: /\bMatsuya\b/i },
  { ja: 'なか卯', en: /\bNakau\b/i },
  { ja: 'CoCo壱番屋', en: /\bCoCo Ichibanya\b/i },
  { ja: 'ココイチ', en: /\bCoCo Ichi\b/i },

  // --- 回転寿司 ---
  { ja: 'スシロー', en: /\bSushiro\b/i },
  { ja: 'くら寿司', en: /\bKura Sushi\b/i },
  { ja: 'はま寿司', en: /\bHama Sushi\b/i },
  { ja: 'かっぱ寿司', en: /\bKappa Sushi\b/i },

  // --- コンビニ ---
  { ja: 'セブンイレブン', en: /\bSeven.?Eleven\b/i },
  { ja: 'ファミリーマート', en: /\bFamilyMart\b/i },
  { ja: 'ローソン', en: /\bLawson\b/i },
  { ja: 'ミニストップ', en: /\bMinistop\b/i },

  // --- 居酒屋チェーン ---
  { ja: '鳥貴族', en: /\bTorikizoku\b/i },
  { ja: 'ワタミ', en: /\bWatami\b/i },
  { ja: '白木屋', en: /\bShirokiya\b/i },
  { ja: '魚民', en: /\bUotami\b/i },
  { ja: '笑笑', en: /\bWarawara\b/i },
  { ja: '和民', en: /\bWatami\b/i },

  // --- ラーメンチェーン ---
  { ja: '一蘭', en: /\bIchiran\b/i },
  { ja: '一風堂', en: /\bIppudo\b/i },
  { ja: '天下一品', en: /\bTenkaippin\b/i },
  { ja: '幸楽苑', en: /\bKourakuen\b/i },
  { ja: '日高屋', en: /\bHidakaya\b/i },
];

export function isChainStore(name: string): boolean {
  return CHAIN_PATTERNS.some(
    ({ ja, en }) => name.includes(ja) || en.test(name)
  );
}

export function filterChainStores<T extends { name: string }>(
  places: T[]
): T[] {
  return places.filter((place) => !isChainStore(place.name));
}
