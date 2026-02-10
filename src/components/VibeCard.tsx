'use client';

import type { VibePlace, Mood } from '@/types/vibe';
import { distanceToWalkMinutes } from '@/lib/geo';
import VibeBadge from './VibeBadge';

interface VibeCardProps {
  place: VibePlace;
  mood?: Mood;
  isSaved: boolean;
  onSelect?: () => void;
  onStartRoute: () => void;
  onToggleSaved: () => void;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export default function VibeCard({
  place,
  mood: _mood,
  isSaved,
  onSelect,
  onStartRoute,
  onToggleSaved,
}: VibeCardProps) {
  const walkMin = distanceToWalkMinutes(place.distance);

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden shadow-lg select-none bg-white"
      role="article"
      aria-label={`${place.name} - ${place.catchphrase}`}
    >
      {/* Hero image */}
      <div className="relative w-full aspect-[16/9] cursor-pointer" onClick={onSelect}>
        {place.heroImageUrl ? (
          <img
            src={place.heroImageUrl}
            alt={place.name}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-blue-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Overlay badges */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-medium bg-white/20 backdrop-blur-sm rounded-full text-white/90">
            {place.category}
          </span>
          {place.openNow === true && (
            <span className="px-2 py-0.5 text-xs font-medium bg-green-500/80 backdrop-blur-sm rounded-full text-white">
              営業中
            </span>
          )}
          {place.openNow === false && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500/80 backdrop-blur-sm rounded-full text-white">
              営業時間外
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1" onClick={onSelect}>
          <h3 className="text-lg font-bold text-gray-900 leading-tight cursor-pointer">
            {place.name}
          </h3>
          <div className="flex items-center gap-2 shrink-0 text-xs text-gray-500">
            <span>徒歩{walkMin}分</span>
            <span>{formatDistance(place.distance)}</span>
            {place.rating != null && (
              <span className="text-yellow-500">★ {place.rating.toFixed(1)}</span>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3">{place.catchphrase}</p>

        {/* Vibe tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {place.vibeTags.map((tag) => (
            <VibeBadge key={tag} tag={tag} />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onStartRoute}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl
                       hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            ルート開始
          </button>
          <button
            onClick={onToggleSaved}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl border transition-all
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
    </div>
  );
}
