/** AI が採点するムード次元。UI の Mood 選択肢と 1:1 対応する。 */
export interface MoodScore {
  chill: number; // 0-100
  party: number; // 0-100
  focus: number; // 0-100
}

/** Google の生データを AI が『意訳』した表示用データ */
export interface VibePlace {
  // --- AI 生成フィールド ---
  id: string; // Google Place ID
  name: string;
  catchphrase: string; // AI 生成: 30 文字以内
  vibeTags: string[]; // AI 生成: 3 つ
  heroImageUrl: string; // Google Photos から PhotoCurator で選別
  moodScore: MoodScore;
  hiddenGemsInfo: string; // レビューから抽出
  isRejected: boolean; // チェーン店 = true

  // --- Google Places API 直接取得フィールド ---
  lat: number;
  lng: number;
  category: string;
  rating: number | null;
  address: string | null;
  openingHours: string[] | null;

  // --- Google Places API 追加フィールド ---
  openNow: boolean | null;     // regularOpeningHours.openNow
  priceLevel: number | null;   // Google Places priceLevel (0-4)

  // --- クライアント側算出フィールド ---
  distance: number; // km (Haversine)
  // NOTE: walkTimeSeconds は持たない。表示時に geo.ts の distanceToWalkMinutes() で算出
}

/** UI のムード選択肢。MoodScore のキーと一致する。 */
export type Mood = 'chill' | 'party' | 'focus';

/** Gemini API 失敗時のフォールバック用 */
export interface DegradedVibePlace extends VibePlace {
  isDegraded: true;
}

/** 位置情報ステータス (page.tsx, LocationPrompt.tsx で共有) */
export type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';

/** サーバーアクションに渡すフィルター (radiusMeters はフロントサイドのみ) */
export interface SearchFilters {
  openNow?: boolean;
  maxPriceLevel?: number | null;
  keyword?: string | null;
}

/** Mood → Google Places Text Search クエリ (日本語) */
export const MOOD_QUERIES: Record<Mood, string> = {
  chill: '静かな カフェ 落ち着いた雰囲気',
  party: 'にぎやか バー ナイトライフ 音楽',
  focus: '作業 カフェ ワークスペース 静か',
};

/** Mood の表示ラベル */
export const MOOD_LABELS: Record<Mood, { en: string; ja: string }> = {
  chill: { en: 'Chill', ja: 'まったり' },
  party: { en: 'Party', ja: 'ワイワイ' },
  focus: { en: 'Focus', ja: '集中' },
};
