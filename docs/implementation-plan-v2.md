# MAPMAPMAP 実装計画書 V2 — Mood-to-Route リファクタ

> **Opus 4.6 レビュー済み** (2026-02-10): 20件の問題を検出し修正反映済み

## 概要

スワイプ型カード発見UI (Phase 3) → **3カード即決UI + フィルターチップ** へフルリファクタ。
ゴール: **ムード選択 → 10秒以内にルート開始**。

---

## レビューで発見した問題と対策

### Critical (6件)

**C1: radiusチップ vs Google API検索半径の混同**
計画書原案: `filters.radiusMeters` (900/1800) をGoogle Places API の `locationBias.radius` に渡す設計。
問題: 900mでは特に郊外で結果がほぼゼロになる。
対策: **Google API検索半径は常に `DEFAULT_RADIUS_KM * 1000` (10km) を維持**。`filters.radiusMeters` は取得後のクライアントサイドフィルタとして `place.distance <= radiusMeters / 1000` で適用。サーバーアクションの引数からは除外し、ソート後にフィルタする。

**C2: 位置情報拒否時の1.5秒自動リダイレクトが駅名検索フローと矛盾**
現状: LocationPromptは拒否時に1.5秒後にデフォルト位置で自動遷移。
Brief: 拒否時は `STATION_SEARCH` に遷移すべき。
対策: 拒否時の自動リダイレクトを削除。代わりに「位置情報が利用できませんでした」メッセージ + 「駅名で探す」ボタンを表示。`onStationSearch()` コールバックを呼ぶ。

**C3: `walkTimeSeconds` はユーザー位置依存なのにキャッシュから復元できない**
`distance` と同様、`walkTimeSeconds` はユーザー座標から算出。キャッシュ復元時に `distance` は再計算されているが、`walkTimeSeconds` も再計算が必要。
対策: `walkTimeSeconds` を VibePlace フィールドとして持たず、表示時に `distance` から算出するユーティリティ関数にする。
```typescript
// src/lib/geo.ts に追加
export function distanceToWalkMinutes(distanceKm: number): number {
  return Math.round((distanceKm * 1000) / 80); // 80m/min
}
```

**C4: `loadResults()` がパラメータなしだが `coords` が null の可能性**
ストアの `loadResults` は引数なしで `get().coords` を使う設計。しかし初期値は `null`。
対策: `loadResults` 内で `if (!coords || !currentMood) return;` のガード追加を明記。

**C5: `geocoding.ts` をサーバーアクションにする場所が不適切**
`src/lib/` は通常のライブラリ。サーバーアクションは `src/app/` に置く規約。
対策: `src/app/geocoding-actions.ts` に `'use server'` 付きで配置。`GOOGLE_PLACES_API_KEY` はサーバー側環境変数のため。

**C6: Phase 2 (page.tsx) が Phase 3 (ResultsScreen等) に依存**
page.tsx のフロー実装には ResultsScreen 等のコンポーネントが必要。順次実装不可。
対策: 実装順序を変更。Phase 2と3を統合し、コンポーネント単位のボトムアップで実装。page.tsx は最後に配線。

### Medium (7件)

**M1: MoodSelector のスポット例がbriefと不一致**
Brief: party → `["居酒屋", "カラオケ", "イベント"]`, focus → `["コワーキング", "電源カフェ", "図書館"]`
現在: party → `'ライブバー・クラブ・居酒屋'`, focus → `'ワークスペース・図書館・書店'`
対策: briefに合わせて更新。

**M2: サブタイトルコピーがbriefと差異**
Brief: `気分を選ぶだけ。近くの「ちょうどいい場所」を3つ出す。`
現在: `気分を選ぶだけ。近くの"ちょうどいい場所"を見つける。`
対策: 「3つ出す」に変更（3カード即決UIのユーザー期待を設定）。

**M3: `GeoStatus` 型が page.tsx と LocationPrompt.tsx で重複定義**
対策: `src/types/vibe.ts` に `GeoStatus` を export し、両方から import。

**M4: `makeMockVibePlace` が複数テストファイルに重複**
page.test.tsx, LikedMap.test.tsx 等に同一ヘルパーが散在。新フィールド追加時に全箇所更新が必要。
対策: `src/test-utils/mock-data.ts` に共通ヘルパーを抽出。

**M5: スコアリングの `mood_category_match` がbriefと計画で異なる**
Brief: `mood_category_match` (0.10) = カテゴリデータに基づくマッチング
計画: `moodScore[mood]` (Gemini AI生成) を使用
対策: 意図的な逸脱として記録。Gemini生成の `moodScore` はカテゴリマッチングより高精度。briefのweightは維持するが、入力値をAI生成スコアに置き換える。

**M6: `FIELD_MASK` vs `FIELD_MASK_EXTENDED` への priceLevel 追加位置が曖昧**
`searchByText` は `FIELD_MASK_EXTENDED` を使用。`priceLevel` は追加課金フィールドではないので `FIELD_MASK` (基底) に追加すべき。
対策: `FIELD_MASK` に `'places.priceLevel'` を追加（searchNearbyPlaces でも利用可能に）。

**M7: 結果なし・通信エラーのUI設計が計画に欠落**
Brief の failure_states (no_results, network_error, permission_denied) に対応するUIが ResultsScreen の設計に含まれていない。
対策: ResultsScreen に失敗状態セクションを追加。no_results: 3つのアクションボタン（半径拡大、営業中フィルタ解除、駅名検索）。network_error: 再試行 + 駅名検索。

### Low (7件)

**L1: briefの `distance_meters` と既存の `distance` (km) の単位不一致**
対策: 既存の `distance` (km) を維持。briefとの差異はドキュメントで記録。表示時に `formatDistance()` で適切に変換済み。

**L2: briefの `source` フィールドが VibePlace に未定義**
対策: 現時点では全データがGoogle Places由来。将来の複数ソース対応時に追加。今は対象外。

**L3: Load More の動作が未定義**
Brief: `"load_more": "User-initiated"`
対策: Google Places API は最大20件返す → Gemini変換は MAX_GEMINI_PLACES=10件。初期表示3件、「もっと見る」で残り7件を表示（追加APIコール不要）。フロントエンドの `displayCount` state で管理。

**L4: ジオコーディングAPIキー互換性**
`GOOGLE_PLACES_API_KEY` が Geocoding API にも有効とは限らない。
対策: 実装時に Google Cloud Console で Geocoding API の有効化を確認。README にセットアップ手順を追加。

**L5: イベント計測（instrumentation）が計画に欠落**
Brief: 11イベント定義あり。
対策: MVP ではコンソールログで実装。`src/lib/analytics.ts` に薄い抽象層を作り、後からプロバイダ差し替え可能にする。Phase 1 では `mood_selected`, `permission_allowed`, `permission_denied`, `route_started` の4イベントのみ。

**L6: priceLevel のフィルタ値マッピングが不明確**
Google Places API の priceLevel: `PRICE_LEVEL_INEXPENSIVE`(1) ~ `PRICE_LEVEL_VERY_EXPENSIVE`(4)
Brief: ~¥1000 = 1, ~¥3000 = 2, 指定なし = null
対策: `maxPriceLevel: 1` → priceLevel <= 1 のみ、`maxPriceLevel: 2` → priceLevel <= 2 のみ、`null` → フィルタなし。`priceLevel === null` の店舗は常に表示（データ欠落は除外しない）。

**L7: 旧コンポーネント削除と import 整理**
CardStack, LikePassButtons, CardsExhausted 削除時に、page.tsx や他ファイルの import が残る可能性。
対策: 削除時に `grep -r` で全参照を確認してから削除。

---

## 現状 vs 目標のギャップ

| 項目 | 現状 | 目標 | 差分 |
|------|------|------|------|
| 結果表示 | スワイプCardStack (全件) | 3カード即決 + Load More | **大改修** |
| フィルター | なし | 距離・営業中・(価格帯)チップ | **新規** |
| 位置情報拒否時 | デフォルト位置で検索 | 駅名検索フォールバック | **新規** |
| スコアリング | mood_score降順のみ | 距離0.45 + 営業中0.25 + 評価0.20 + ムード0.10 | **新規** |
| ルート案内 | Google Mapsリンク (LikedMap内) | 「ルート開始」ボタン (カード・詳細) | **新規** |
| 保存機能 | セッション内likedPlacesのみ | localStorage永続化「行きたい」 | **新規** |
| キーワード検索 | なし | 結果画面下部に控えめ配置 | **新規 (Phase 2)** |
| データフィールド | distance, rating, openingHours[] | + openNow, priceLevel | **拡張** |

---

## 再利用可能な資産

### そのまま再利用
- `google-places.ts` — API通信基盤 (`openNow`は取得済み、未抽出)
- `gemini-vibe.ts` — AI解釈パイプライン (OpenAI gpt-4o-mini)
- `chain-filter.ts` — チェーン店フィルタ
- `photo-curator.ts` — 写真選定
- `geo.ts` — Haversine距離計算
- `constants.ts` — DEFAULT_LAT/LNG, MAP_STYLE等
- `VibeBadge.tsx` — バッジ表示

### 改修して再利用
- `MoodSelector.tsx` — コピー更新 (briefのsubheadline + examples に合わせる)
- `LocationPrompt.tsx` → Permission Gate化 (「駅名で探す」追加、自動リダイレクト削除)
- `VibeCard.tsx` → ResultCard化 (「ルート開始」「行きたい」ボタン追加)
- `LikedMap.tsx` → オプション地図表示として再利用
- `vibe-actions.ts` — フィルターパラメータ追加、スコアリング変更
- `vibe-store.ts` — ストア形状を大幅変更

### 削除対象
- `CardStack.tsx` + テスト — スワイプUI廃止
- `LikePassButtons.tsx` + テスト — スワイプ用ボタン廃止
- `CardsExhausted.tsx` + テスト — 全件表示廃止

---

## Phase 1: データ層 + スコアリング (Must Have)

### Step 1-1: 共通型の整理

**修正:** `src/types/vibe.ts`

```typescript
// 追加フィールド
export interface VibePlace {
  // ... existing fields ...
  openNow: boolean | null;       // regularOpeningHours.openNow
  priceLevel: number | null;     // Google Places priceLevel (1-4)
  // NOTE: walkTimeSeconds は持たない。表示時に geo.ts の distanceToWalkMinutes() で算出
}

// GeoStatus型を共通化 (page.tsx, LocationPrompt.tsx から移動)
export type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';

// SearchFilters型
export interface SearchFilters {
  openNow?: boolean;
  maxPriceLevel?: number | null;
  keyword?: string | null;
}
```

**注意:** `radiusMeters` は SearchFilters に含めない (C1対策)。radiusフィルタはフロントエンドで `place.distance` に対して適用。

### Step 1-2: Google Places データ抽出拡張

**修正:** `src/lib/google-places.ts`

```typescript
// GooglePlace型に追加
export interface GooglePlace {
  // ... existing ...
  priceLevel?: string; // "PRICE_LEVEL_INEXPENSIVE" etc.
}

// FIELD_MASK に追加 (基底マスク — searchNearbyPlaces でも利用可能)
const FIELD_MASK = [
  // ... existing ...
  'places.priceLevel',  // 追加
].join(',');
```

**修正:** `src/app/vibe-actions.ts` の `buildVibePlace`

```typescript
// openNow と priceLevel を抽出
openNow: place.regularOpeningHours?.openNow ?? null,
priceLevel: parsePriceLevel(place.priceLevel),  // "PRICE_LEVEL_INEXPENSIVE" → 1 等
```

`parsePriceLevel` ヘルパー:
```typescript
function parsePriceLevel(raw?: string): number | null {
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return raw ? (map[raw] ?? null) : null;
}
```

**修正:** `src/lib/geo.ts`

```typescript
// 追加
export function distanceToWalkMinutes(distanceKm: number): number {
  return Math.round((distanceKm * 1000) / 80); // 80m/min = 4.8km/h
}
```

**キャッシュ互換:** 既存キャッシュの `vibe_json` には `openNow`, `priceLevel` がない → JSON.parse 後に `?? null` でフォールバック。キャッシュ復元コードに追加:
```typescript
// 既存の distance 再計算の直後に追加
cachedVibe.openNow = cachedVibe.openNow ?? null;
cachedVibe.priceLevel = cachedVibe.priceLevel ?? null;
```

### Step 1-3: スコアリングロジック

**新規:** `src/lib/scoring.ts`

```typescript
import type { VibePlace, Mood } from '@/types/vibe';

export function calculateScore(
  place: VibePlace,
  mood: Mood,
  maxDistanceKm: number,
): number {
  // distance: 0.45 — closer is better (0-1 normalized)
  const distScore = Math.max(0, 1 - place.distance / maxDistanceKm);

  // open_now: 0.25 — open gets full score, closed gets 0, unknown gets 0.5
  const openScore = place.openNow === true ? 1 : place.openNow === false ? 0 : 0.5;

  // rating: 0.20 — normalized to 0-1 (unknown = 0.5)
  const ratingScore = place.rating != null ? place.rating / 5 : 0.5;

  // mood_match: 0.10 — AI-generated mood score (brief says "mood_category_match" but
  //   Gemini moodScore is higher precision than rule-based category matching)
  const moodScore = place.moodScore[mood] / 100;

  return distScore * 0.45 + openScore * 0.25 + ratingScore * 0.20 + moodScore * 0.10;
}
```

**Fallback (briefの指示通り):**
- rating が null → 0.5 (中間値、実質的にdistance/openNowに重み再配分)
- openNow が null → 0.5 (同上)

### Step 1-4: サーバーアクション フィルター対応

**修正:** `src/app/vibe-actions.ts`

```typescript
import type { SearchFilters } from '@/types/vibe';
import { calculateScore } from '@/lib/scoring';

export async function searchByMood(
  mood: Mood,
  lat: number,
  lng: number,
  filters?: SearchFilters,     // 後方互換: undefined ならフィルタなし
): Promise<VibeSearchResponse>
```

変更ロジック:
1. Google API検索半径: **常に `DEFAULT_RADIUS_KM * 1000`** (C1対策: 変更しない)
2. Gemini変換後、フィルタ適用:
   - `filters?.openNow === true` → `place.openNow !== false` のみ (null=不明は残す)
   - `filters?.maxPriceLevel != null` → `place.priceLevel == null || place.priceLevel <= maxPriceLevel` (L6対策: null店舗は除外しない)
   - `filters?.keyword` → `place.name` に部分一致 (case-insensitive)
3. ソート: `calculateScore(place, mood, DEFAULT_RADIUS_KM)` 降順
4. `isRejected` フィルタは既存通り維持

---

## Phase 2: ストア + コンポーネント + フロー (Must Have)

> C6対策: Phase 2 と Phase 3 を統合。コンポーネントはボトムアップで実装し、page.tsx は最後に配線。

### Step 2-1: テストヘルパー共通化

**新規:** `src/test-utils/mock-data.ts` (M4対策)

```typescript
export function makeMockVibePlace(id: string, name: string, overrides?: Partial<VibePlace>): VibePlace {
  return {
    id, name,
    catchphrase: '素敵な空間',
    vibeTags: ['#tag1', '#tag2', '#tag3'],
    heroImageUrl: 'https://photo.url/test.jpg',
    moodScore: { chill: 80, party: 20, focus: 60 },
    hiddenGemsInfo: 'テラス席',
    isRejected: false,
    lat: 35.65, lng: 139.7,
    category: 'Cafe',
    rating: 4.2,
    address: '東京都渋谷区',
    openingHours: null,
    distance: 0.5,
    openNow: true,        // NEW
    priceLevel: 1,         // NEW
    ...overrides,
  };
}
```

全テストファイルの `makeMockVibePlace` をこの共通ヘルパーからの import に置換。

### Step 2-2: Zustandストア再設計

**修正:** `src/store/vibe-store.ts`

```typescript
interface VibeState {
  // Intent
  currentMood: Mood | null;

  // Location
  locationMode: 'geo' | 'station' | null;
  coords: { lat: number; lng: number } | null;

  // Filters (radiusMeters はここ。APIには渡さずフロントでフィルタ)
  filters: {
    radiusMeters: number;        // default 900 (徒歩10分)
    openNow: boolean;            // default false
    maxPriceLevel: number | null; // default null (指定なし)
    keyword: string | null;       // default null
  };

  // Results
  results: VibePlace[];       // API全件結果 (スコア順)
  displayCount: number;       // 表示件数 (初期3、Load Moreで増加)
  isLoading: boolean;
  errorMessage: string | null;

  // Saved (localStorage永続化)
  savedPlaceIds: string[];

  // Actions
  setMood: (mood: Mood) => void;
  setLocation: (mode: 'geo' | 'station', lat: number, lng: number) => void;
  updateFilter: (partial: Partial<VibeState['filters']>) => void;
  loadResults: () => Promise<void>;  // coords/mood/filters from store
  loadMore: () => void;              // displayCount += 3 (or remaining)
  toggleSaved: (placeId: string) => void;
  reset: () => void;
}
```

**重要: `loadResults` のガード (C4対策):**
```typescript
loadResults: async () => {
  const { currentMood, coords, filters } = get();
  if (!currentMood || !coords) return;  // ← ガード

  set({ isLoading: true, errorMessage: null, displayCount: 3 });

  const apiFilters: SearchFilters = {
    openNow: filters.openNow || undefined,
    maxPriceLevel: filters.maxPriceLevel,
    keyword: filters.keyword,
  };

  const result = await searchByMood(currentMood, coords.lat, coords.lng, apiFilters);

  if (!result.success) {
    set({ isLoading: false, errorMessage: result.message ?? 'エラーが発生しました' });
    return;
  }

  // radiusMeters はクライアントサイドでフィルタ (C1対策)
  const radiusKm = filters.radiusMeters / 1000;
  const filtered = result.data.filter(p => p.distance <= radiusKm);

  set({ results: filtered, isLoading: false, errorMessage: filtered.length === 0 ? '近くで条件に合う候補が見つかりませんでした' : null });
},
```

**localStorage永続化:**
```typescript
// 初期化
savedPlaceIds: typeof window !== 'undefined'
  ? JSON.parse(localStorage.getItem('saved_place_ids') ?? '[]')
  : [],

toggleSaved: (placeId) => {
  const { savedPlaceIds } = get();
  const updated = savedPlaceIds.includes(placeId)
    ? savedPlaceIds.filter(id => id !== placeId)
    : [...savedPlaceIds, placeId];
  set({ savedPlaceIds: updated });
  localStorage.setItem('saved_place_ids', JSON.stringify(updated));
},
```

### Step 2-3: Permission Gate 改修 (C2対策)

**修正:** `src/components/LocationPrompt.tsx`

```typescript
import type { GeoStatus } from '@/types/vibe'; // M3対策: 共通型

interface LocationPromptProps {
  onResolved: (lat: number, lng: number, status: GeoStatus) => void;
  onStationSearch: () => void; // NEW: 駅名検索遷移
  defaultLat: number;
  defaultLng: number;
}
```

変更:
- コピー: briefに合わせる
  - 見出し: 「近くのスポットを出すために位置情報を使います」
  - 説明: 「許可すると、いまいる場所から徒歩で行ける候補を優先して表示します。」
  - プライマリ: 「位置情報を許可して探す」
  - セカンダリ: 「駅名で探す」(→ `onStationSearch()`)
- **拒否時: 1.5秒自動リダイレクト削除** (C2対策)
  - 代わりに: 「位置情報が使えないため、駅名で探せます。」メッセージ + 「駅名で探す」ボタン + 「再度許可を試す」ボタン
  - briefの `failure_states.permission_denied` に完全準拠

### Step 2-4: 駅名検索

**新規:** `src/app/geocoding-actions.ts` (C5対策: `src/app/` に配置)

```typescript
'use server';

export async function geocodeStation(
  query: string,
): Promise<{ lat: number; lng: number; formattedAddress: string } | null>
```

- Google Geocoding API (`GOOGLE_PLACES_API_KEY` で実行 — L4: APIの有効化確認が必要)
- `region=jp`, `language=ja`
- 結果が空なら null 返却

**新規:** `src/components/StationSearch.tsx`

```typescript
interface StationSearchProps {
  onSubmit: (lat: number, lng: number, stationName: string) => void;
  onBack: () => void;
}
```

- headline: 「駅名で探す」
- placeholder: 「例：渋谷 / 横浜 / 大阪」
- CTA: 「このエリアで探す」
- エラー: 「見つかりませんでした。別の駅名をお試しください。」
- **戻るボタン** で Permission Gate に戻る

### Step 2-5: フィルターチップ

**新規:** `src/components/FilterChips.tsx`

```typescript
interface FilterChipsProps {
  filters: { radiusMeters: number; openNow: boolean; maxPriceLevel: number | null };
  onFilterChange: (partial: Partial<FilterChipsProps['filters']>) => void;
}
```

3つのチップグループ:
1. **距離** (セグメント): 徒歩10分 (900) | 徒歩20分 (1800)
2. **営業中** (トグル): ON/OFF
3. **価格帯** (セグメント): ~¥1000 (1) | ~¥3000 (2) | 指定なし (null)

**注意:** priceLevel は日本の店舗で欠落が多い。初期リリースでは価格帯チップを表示するが、データ不足時は非表示も検討。

### Step 2-6: 結果画面 (M7対策: failure states 含む)

**新規:** `src/components/ResultsScreen.tsx`

```typescript
interface ResultsScreenProps {
  results: VibePlace[];
  displayCount: number;
  mood: Mood;
  filters: VibeState['filters'];
  savedPlaceIds: string[];
  isLoading: boolean;
  errorMessage: string | null;
  onFilterChange: (partial: Partial<VibeState['filters']>) => void;
  onPlaceSelect: (place: VibePlace) => void;
  onStartRoute: (place: VibePlace) => void;
  onToggleSaved: (placeId: string) => void;
  onLoadMore: () => void;
  onChangeMood: () => void;
  onStationSearch: () => void; // no_results からの遷移用
}
```

レイアウト:
1. ヘッダー: 「気分: {mood_label}」+ 気分変更ボタン
2. FilterChips
3. **ローディング状態:** スピナー + 「スポットを探しています...」
4. **結果あり:** カード表示 (displayCount件) + 「もっと見る」ボタン (L3: 残りがあれば表示)
5. **結果なし (M7対策):**
   - メッセージ: 「近くで条件に合う候補が見つかりませんでした。」
   - アクション: 「徒歩20分に広げる」/ 「営業中フィルタを外す」(openNow=trueの時のみ) / 「駅名で探す」

### Step 2-7: カード改修

**修正:** `src/components/VibeCard.tsx`

変更:
- スワイプ関連props削除 (onTapのみ残す → `onSelect`にリネーム)
- 追加表示:
  - `distanceToWalkMinutes()` で「徒歩X分」表示
  - `openNow` バッジ: 営業中(緑) / 営業時間外(赤) / 不明(非表示)
- 追加ボタン:
  - 「ルート開始」プライマリボタン (`onStartRoute`)
  - 「行きたい」セカンダリ ハートトグル (`onToggleSaved`, `isSaved`)

```typescript
interface VibeCardProps {
  place: VibePlace;
  mood?: Mood;
  isSaved: boolean;
  onSelect?: () => void;
  onStartRoute: () => void;
  onToggleSaved: () => void;
}
```

### Step 2-8: 詳細画面

**新規:** `src/components/PlaceDetail.tsx`

```typescript
interface PlaceDetailProps {
  place: VibePlace;
  isSaved: boolean;
  onStartRoute: () => void;
  onToggleSaved: () => void;
  onBack: () => void;
}
```

フィールド: name, catchphrase, walkTime, openNow, openingHours, priceLevel, vibeTags, address, hiddenGemsInfo, heroImage
ボタン: 「ルート開始」(プライマリ) + 「行きたい」(セカンダリ)

### Step 2-9: ルート開始ヘルパー

**新規:** `src/lib/route.ts`

```typescript
export function openRoute(
  place: { lat: number; lng: number; id: string },
  userLat: number,
  userLng: number,
): void {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${place.lat},${place.lng}&destination_place_id=${place.id}&travelmode=walking`;
  window.open(url, '_blank');
}
```

### Step 2-10: MoodSelector コピー更新 (M1, M2対策)

**修正:** `src/components/MoodSelector.tsx`

```typescript
// M2: サブタイトル更新
<p>気分を選ぶだけ。近くの「ちょうどいい場所」を3つ出す。</p>

// M1: examples をbriefに合わせる
const MOOD_EXAMPLES: Record<Mood, string> = {
  chill: 'カフェ・公園・静かなバー',         // OK (一致)
  party: '居酒屋・カラオケ・イベント',        // 変更
  focus: 'コワーキング・電源カフェ・図書館',   // 変更
};
```

### Step 2-11: page.tsx フロー配線

**修正:** `src/app/page.tsx`

```typescript
import type { GeoStatus } from '@/types/vibe'; // M3対策

type ViewMode = 'mood' | 'permission_gate' | 'station_search' | 'results' | 'detail';
```

フロー:
```
HOME (mood) → PERMISSION_GATE
  ├─ 許可 → RESULTS (geo座標)
  ├─ 拒否 → STATION_SEARCH (station search UI)
  ├─ 「駅名で探す」ボタン → STATION_SEARCH
  └─ 2回目以降 (granted/denied/unavailable) → RESULTS 直行

STATION_SEARCH
  ├─ 駅名送信 → RESULTS (駅座標)
  └─ 戻る → PERMISSION_GATE

RESULTS
  ├─ カードタップ → DETAIL (selectedPlace state)
  ├─ チップ切替 → loadResults() 再実行
  ├─ 結果なし→駅名で探す → STATION_SEARCH
  └─ 気分変更 → HOME

DETAIL
  ├─ ルート開始 → openRoute() (外部地図)
  ├─ 行きたい → toggleSaved()
  └─ 戻る → RESULTS
```

**handleMoodSelect (2回目以降のスキップ):**
```typescript
const handleMoodSelect = useCallback(async (mood: Mood) => {
  setMood(mood);
  if (geoStatus === 'granted') {
    // 既に位置取得済み → 直行
    setViewMode('results');
    loadResults();
  } else if (geoStatus === 'denied' || geoStatus === 'unavailable') {
    // 拒否/不可 → 前回の駅座標 or デフォルト位置で直行
    setViewMode('results');
    loadResults();
  } else {
    // idle → Permission Gate
    setViewMode('permission_gate');
  }
}, [geoStatus, setMood, loadResults]);
```

**エラートースト:** viewMode が `'mood'` の時のみ表示 (L4を維持)。results画面のエラーは ResultsScreen 内で処理。

---

## Phase 3: テスト

### 新規テスト
| File | テスト数目安 |
|------|-------------|
| `src/lib/scoring.test.ts` | ~6 |
| `src/lib/geo.test.ts` | +2 (distanceToWalkMinutes) |
| `src/app/geocoding-actions.test.ts` | ~4 |
| `src/lib/route.test.ts` | ~3 |
| `src/components/FilterChips.test.tsx` | ~8 |
| `src/components/StationSearch.test.tsx` | ~6 |
| `src/components/ResultsScreen.test.tsx` | ~12 (failure states含む) |
| `src/components/PlaceDetail.test.tsx` | ~8 |

### 既存テスト修正
| File | 変更内容 |
|------|---------|
| `src/app/vibe-actions.test.ts` | filters引数追加、スコアリング順テスト、priceLevel解析テスト |
| `src/store/vibe-store.test.ts` | 新ストア形状対応、localStorage mock、radiusフィルタテスト |
| `src/app/page.test.tsx` | 新フロー対応 (permission_gate → station_search → results) |
| `src/components/VibeCard.test.tsx` | 新ボタン・openNow/walkTimeフィールドテスト |
| `src/components/LocationPrompt.test.tsx` | onStationSearch、拒否時UI変更テスト |
| `src/components/LikedMap.test.tsx` | 変更なし |
| 全テストファイル | `makeMockVibePlace` を `src/test-utils/mock-data.ts` からimport |

### 削除テスト
- `src/components/CardStack.test.tsx`
- `src/components/LikePassButtons.test.tsx`
- `src/components/CardsExhausted.test.tsx`

---

## Phase 2 (Should Have): キーワード検索 + 保存リスト

### Ticket D: キーワード検索
- `ResultsScreen` 下部にキーワード入力欄
- ラベル: 「店名・ジャンルで探す（任意）」
- 送信時: `updateFilter({ keyword })` → `loadResults()` 再実行
- Home画面には**絶対に配置しない**

### Ticket E: 保存リスト表示
- `ViewMode` に `'saved'` 追加
- 保存済みplace一覧画面
- localStorage永続化はPhase 1で実装済み

---

## Phase 3 (Nice to Have): シェア + 地図

### Ticket F: シェアカード
- 既存 `ShareButton.tsx` + OG画像生成を活用

### Ticket G: 地図トグル
- 既存 `LikedMap.tsx` を結果表示用に転用
- デフォルト折りたたみ、「地図で見る」トグル

---

## 実装順序 (修正版: C6対策)

```
Step 1-1  共通型の整理 (GeoStatus, SearchFilters, VibePlace拡張)
Step 1-2  Google Places データ抽出拡張 + geo.ts walkMinutes
Step 1-3  スコアリングロジック
Step 1-4  サーバーアクション フィルター対応
Step 2-1  テストヘルパー共通化
  ↓ (データ層完成)
Step 2-2  ストア再設計
Step 2-3  Permission Gate 改修
Step 2-4  駅名検索 + ジオコーディング
Step 2-5  フィルターチップ
Step 2-6  結果画面
Step 2-7  カード改修
Step 2-8  詳細画面
Step 2-9  ルート開始ヘルパー
Step 2-10 MoodSelector コピー更新
Step 2-11 page.tsx フロー配線 (最後)
  ↓
Step 3    旧コンポーネント削除 (CardStack, LikePassButtons, CardsExhausted)
Step 4    全テストパス + ビルド確認
```

---

## ファイル一覧

| File | Action | Step |
|------|--------|------|
| `src/types/vibe.ts` | MODIFY | 1-1 |
| `src/lib/google-places.ts` | MODIFY | 1-2 |
| `src/lib/geo.ts` | MODIFY | 1-2 |
| `src/lib/scoring.ts` | NEW | 1-3 |
| `src/lib/scoring.test.ts` | NEW | 1-3 |
| `src/app/vibe-actions.ts` | MODIFY | 1-4 |
| `src/test-utils/mock-data.ts` | NEW | 2-1 |
| `src/store/vibe-store.ts` | MODIFY | 2-2 |
| `src/components/LocationPrompt.tsx` | MODIFY | 2-3 |
| `src/app/geocoding-actions.ts` | NEW | 2-4 |
| `src/components/StationSearch.tsx` | NEW | 2-4 |
| `src/components/FilterChips.tsx` | NEW | 2-5 |
| `src/components/ResultsScreen.tsx` | NEW | 2-6 |
| `src/components/VibeCard.tsx` | MODIFY | 2-7 |
| `src/components/PlaceDetail.tsx` | NEW | 2-8 |
| `src/lib/route.ts` | NEW | 2-9 |
| `src/components/MoodSelector.tsx` | MODIFY | 2-10 |
| `src/app/page.tsx` | MODIFY | 2-11 |
| `src/components/CardStack.tsx` | DELETE | 3 |
| `src/components/LikePassButtons.tsx` | DELETE | 3 |
| `src/components/CardsExhausted.tsx` | DELETE | 3 |
| テスト各種 | NEW/MODIFY/DELETE | 各Step |

---

## 技術的判断事項

### ジオコーディングAPI
**推奨: Google Geocoding API**
- 理由: Google Places APIと同じプロジェクトのAPIキーで利用可能（要: Cloud Console で Geocoding API 有効化確認）
- 代替: Mapbox (トークン既存) だが日本語地名の精度はGoogleが上
- **L4: .env.example に `# Geocoding API must be enabled for the same key` コメント追加**

### priceLevel信頼性
- Google Places API の `priceLevel` は日本の店舗では欠落が多い
- **対策:** `priceLevel === null` の店舗は常にフィルタを通過させる (除外しない)
- 価格チップは表示するが、効果が薄い場合はUIで非表示も検討

### キャッシュ互換性
- 既存キャッシュには `openNow`, `priceLevel` がない
- **対策:** JSON.parse 後に `?? null` でフォールバック。キャッシュTTL 7日で自然更新
- 急ぐ場合: `DELETE FROM vibe_places_cache` で全クリア

### radiusフィルタの適用層 (C1対策 詳細)
- Google API: 常に `DEFAULT_RADIUS_KM * 1000` (10km) で検索
- radius チップ (900m/1800m): フロントエンドで `place.distance <= radiusKm` でフィルタ
- API結果は最大10件のため、900mフィルタ後に結果0件の可能性あり → no_results UIで対応

---

## 検証基準

1. `npx vitest run` — 全テストパス
2. `npx next build` — ビルド成功
3. AT_01: 初回訪問 → 権限プロンプトなし → ムード選択 → Permission Gate → 許可 → 3カード表示
4. AT_02: 権限拒否 → 「駅名で探す」ボタン → 駅名入力 → 結果表示
5. AT_03: フィルターチップ切替 → 結果が変化
6. AT_04: ホームに検索UIなし
7. **AT_05 (追加):** 「ルート開始」ボタン → Google Maps directions URLが開く
8. **AT_06 (追加):** 「行きたい」トグル → リロード後も保持
9. **AT_07 (追加):** 結果なし → 「徒歩20分に広げる」→ 結果表示
