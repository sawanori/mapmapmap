'use client';

import type { VibePlace, Mood } from '@/types/vibe';
import VibeBadge from './VibeBadge';
import ShareButton from './ShareButton';

interface VibeCardProps {
  place: VibePlace;
  mood?: Mood;
  onTap?: () => void;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export default function VibeCard({ place, mood, onTap }: VibeCardProps) {
  return (
    <div
      className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl select-none"
      onClick={onTap}
      role="article"
      aria-label={`${place.name} - ${place.catchphrase}`}
    >
      {/* Hero image background */}
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

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        {/* Category + Distance badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 text-xs font-medium bg-white/20 backdrop-blur-sm rounded-full text-white/90">
            {place.category}
          </span>
          <span className="text-xs text-white/70">
            {formatDistance(place.distance)}
          </span>
          {place.rating != null && (
            <span className="text-xs text-yellow-300">
              ★ {place.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Name */}
        <h2 className="text-2xl font-bold text-white mb-1 leading-tight">
          {place.name}
        </h2>

        {/* Catchphrase */}
        <p className="text-sm text-white/80 mb-3 leading-relaxed">
          {place.catchphrase}
        </p>

        {/* Vibe tags + share */}
        <div className="flex flex-wrap items-center gap-2">
          {place.vibeTags.map((tag) => (
            <VibeBadge key={tag} tag={tag} />
          ))}
          {mood && (
            <ShareButton place={place} mood={mood} />
          )}
        </div>

        {/* Hidden gems info */}
        {place.hiddenGemsInfo && (
          <div className="mt-3 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
            <p className="text-xs text-white/80">
              <span className="font-medium text-yellow-300">💎 </span>
              {place.hiddenGemsInfo}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
