'use client';

import type { VibePlace, Mood } from '@/types/vibe';
import { MOOD_LABELS } from '@/types/vibe';
import FilterChips from './FilterChips';
import VibeCard from './VibeCard';

interface Filters {
  radiusMeters: number;
  openNow: boolean;
  maxPriceLevel: number | null;
  keyword: string | null;
}

interface ResultsScreenProps {
  results: VibePlace[];
  displayCount: number;
  mood: Mood;
  filters: Filters;
  savedPlaceIds: string[];
  isLoading: boolean;
  errorMessage: string | null;
  onFilterChange: (partial: Partial<Filters>) => void;
  onPlaceSelect: (place: VibePlace) => void;
  onStartRoute: (place: VibePlace) => void;
  onToggleSaved: (placeId: string) => void;
  onLoadMore: () => void;
  onChangeMood: () => void;
  onStationSearch: () => void;
}

export default function ResultsScreen({
  results,
  displayCount,
  mood,
  filters,
  savedPlaceIds,
  isLoading,
  errorMessage,
  onFilterChange,
  onPlaceSelect,
  onStartRoute,
  onToggleSaved,
  onLoadMore,
  onChangeMood,
  onStationSearch,
}: ResultsScreenProps) {
  const visibleResults = results.slice(0, displayCount);
  const hasMore = displayCount < results.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-medium text-gray-900">
          気分: {MOOD_LABELS[mood].ja}
        </h2>
        <button
          onClick={onChangeMood}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="ムードを変更"
        >
          気分を変える
        </button>
      </div>

      {/* Filter chips */}
      <div className="px-4 pb-3">
        <FilterChips filters={filters} onFilterChange={onFilterChange} />
      </div>

      {/* Scrollable results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">スポットを探しています...</p>
          </div>
        )}

        {/* No results (M7) */}
        {!isLoading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <p className="text-sm text-gray-600">
              {errorMessage ?? '近くで条件に合う候補が見つかりませんでした。'}
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {filters.radiusMeters < 1800 && (
                <button
                  onClick={() => onFilterChange({ radiusMeters: 1800 })}
                  className="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  徒歩20分に広げる
                </button>
              )}
              {filters.openNow && (
                <button
                  onClick={() => onFilterChange({ openNow: false })}
                  className="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  営業中フィルタを外す
                </button>
              )}
              <button
                onClick={onStationSearch}
                className="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
              >
                駅名で探す
              </button>
            </div>
          </div>
        )}

        {/* Results cards */}
        {!isLoading && visibleResults.length > 0 && (
          <div className="flex flex-col gap-4">
            {visibleResults.map((place) => (
              <VibeCard
                key={place.id}
                place={place}
                mood={mood}
                isSaved={savedPlaceIds.includes(place.id)}
                onSelect={() => onPlaceSelect(place)}
                onStartRoute={() => onStartRoute(place)}
                onToggleSaved={() => onToggleSaved(place.id)}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <button
                onClick={onLoadMore}
                className="mx-auto px-6 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl
                           hover:bg-gray-200 transition-colors"
              >
                もっと見る ({results.length - displayCount}件)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
