'use client';

import { useState, useCallback } from 'react';
import { geocodeStation } from '@/app/geocoding-actions';

interface StationSearchProps {
  onSubmit: (lat: number, lng: number, stationName: string) => void;
  onBack: () => void;
}

export default function StationSearch({ onSubmit, onBack }: StationSearchProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      setSearching(true);
      setError(null);

      const result = await geocodeStation(trimmed);

      if (!result) {
        setSearching(false);
        setError('見つかりませんでした。別の駅名をお試しください。');
        return;
      }

      setSearching(false);
      onSubmit(result.lat, result.lng, trimmed);
    },
    [query, onSubmit],
  );

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-4xl">🚉</div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">駅名で探す</h2>
        <p className="text-sm text-gray-500 mt-1">
          駅名やエリア名で検索できます
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例：渋谷 / 横浜 / 大阪"
          disabled={searching}
          className="px-4 py-3 border border-gray-300 rounded-xl text-center text-gray-900
                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50"
          autoFocus
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-2xl
                     hover:bg-blue-700 active:scale-[0.98] transition-all
                     disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {searching && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {searching ? '検索中...' : 'このエリアで探す'}
        </button>

        {error && (
          <p className="text-sm text-red-600" role="alert">{error}</p>
        )}
      </form>

      <button
        onClick={onBack}
        disabled={searching}
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← 戻る
      </button>
    </div>
  );
}
