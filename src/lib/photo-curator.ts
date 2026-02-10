import type { GooglePlacePhoto } from './google-places';

/**
 * Google Places Photos 配列から、interior/atmosphere 系の写真を優先的に選択する。
 * food 系写真は優先度を下げる。
 *
 * 選別ロジック:
 * 1. 横長 (widthPx > heightPx) の写真を優先 (interior/atmosphere は横長が多い)
 * 2. 配列の先頭ほど Google が「代表的」と判断した写真
 * 3. 最大 maxPhotos 枚を返却
 */
export function selectBestPhotos(
  photos: GooglePlacePhoto[] | undefined,
  maxPhotos = 3,
): GooglePlacePhoto[] {
  if (!photos || photos.length === 0) return [];

  const scored = photos.map((photo, index) => {
    let score = 0;

    // 横長の写真を優先 (interior/landscape shots)
    if (photo.widthPx > photo.heightPx) {
      score += 10;
    }

    // 高解像度を優先
    if (photo.widthPx >= 1000) {
      score += 5;
    }

    // Google の配列順序 (先頭ほど代表的) を加味
    score -= index;

    return { photo, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxPhotos).map((s) => s.photo);
}

/**
 * ヒーロー画像として最も適した 1 枚を選択する。
 * 写真がない場合は null を返す。
 */
export function selectHeroPhoto(
  photos: GooglePlacePhoto[] | undefined,
): GooglePlacePhoto | null {
  const best = selectBestPhotos(photos, 1);
  return best[0] ?? null;
}
