'use client';

import type { VibePlace } from '@/types/vibe';
import { distanceToWalkMinutes } from '@/lib/geo';
import VibeBadge from './VibeBadge';

interface PlaceDetailProps {
  place: VibePlace;
  isSaved: boolean;
  onToggleSaved: () => void;
  onBack: () => void;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

function formatPriceLevel(level: number | null): string | null {
  if (level == null) return null;
  return '¥'.repeat(Math.max(1, level));
}

export default function PlaceDetail({
  place,
  isSaved,
  onToggleSaved,
  onBack,
}: PlaceDetailProps) {
  const walkMin = distanceToWalkMinutes(place.distance);
  const priceDisplay = formatPriceLevel(place.priceLevel);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with back button */}
      <header className="flex items-center px-4 py-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="戻る"
        >
          ← 戻る
        </button>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero image */}
        {place.heroImageUrl ? (
          <img
            src={place.heroImageUrl}
            alt={place.name}
            className="w-full aspect-[16/9] object-cover"
          />
        ) : (
          <div className="w-full aspect-[16/9] bg-gradient-to-br from-blue-800 to-blue-950" />
        )}

        <div className="p-5">
          {/* Name */}
          <h2 className="text-xl font-bold text-gray-900 mb-1">{place.name}</h2>

          {/* Catchphrase */}
          <p className="text-sm text-gray-600 mb-3">{place.catchphrase}</p>

          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
            <span>徒歩{walkMin}分 ({formatDistance(place.distance)})</span>
            {place.openNow === true && (
              <span className="text-green-600 font-medium">営業中</span>
            )}
            {place.openNow === false && (
              <span className="text-red-500 font-medium">営業時間外</span>
            )}
            {place.rating != null && (
              <span className="text-yellow-500">★ {place.rating.toFixed(1)}</span>
            )}
            {priceDisplay && <span>{priceDisplay}</span>}
            <span className="text-gray-400">{place.category}</span>
          </div>

          {/* Vibe tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {place.vibeTags.map((tag) => (
              <VibeBadge key={tag} tag={tag} />
            ))}
          </div>

          {/* Opening hours */}
          {place.openingHours && place.openingHours.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-1">営業時間</h3>
              <div className="text-xs text-gray-500 space-y-0.5">
                {place.openingHours.map((h, i) => (
                  <p key={i}>{h}</p>
                ))}
              </div>
            </div>
          )}

          {/* Address */}
          {place.address && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-1">住所</h3>
              <p className="text-xs text-gray-500">{place.address}</p>
            </div>
          )}

          {/* Hidden gems */}
          {place.hiddenGemsInfo && (
            <div className="px-3 py-2 bg-yellow-50 rounded-xl mb-4">
              <p className="text-xs text-gray-700">
                <span className="font-medium">💎 </span>
                {place.hiddenGemsInfo}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom action */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <button
          onClick={onToggleSaved}
          className={`w-full px-4 py-3 font-medium rounded-xl border transition-all
            ${isSaved
              ? 'bg-red-50 text-red-600 border-red-200'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          aria-label={isSaved ? '行きたいを解除' : '行きたい'}
        >
          {isSaved ? '♥' : '♡'} 行きたい
        </button>
      </div>
    </div>
  );
}
