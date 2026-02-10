'use client';

import { useState, useTransition, useCallback } from 'react';
import { searchSpots } from '@/app/actions';
import { MAX_QUERY_LENGTH } from '@/lib/constants';
import type { SearchResult } from '@/types/spot';

interface SearchBarProps {
  userLocation: { lat: number; lng: number };
  onResults: (results: SearchResult[]) => void;
  onError: (message: string) => void;
}

export default function SearchBar({ userLocation, onResults, onError }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();

      // Client-side validation
      if (!trimmed) {
        setValidationError('検索キーワードを入力してください');
        return;
      }
      if (trimmed.length > MAX_QUERY_LENGTH) {
        setValidationError(`${MAX_QUERY_LENGTH}文字以内で入力してください`);
        return;
      }

      // Clear validation error on new search attempt
      setValidationError(null);

      startTransition(async () => {
        try {
          const response = await searchSpots(trimmed, userLocation.lat, userLocation.lng);
          if (response.success) {
            onResults(response.data);
          } else {
            onError(response.error.message);
          }
        } catch (_e) {
          onError('通信エラーです。接続を確認してください。');
        }
      });
    },
    [query, userLocation, onResults, onError]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  }, [validationError]);

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="検索"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-2 bg-white rounded-2xl shadow-lg px-4 py-3">
          <input
            type="search"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            value={query}
            onChange={handleInputChange}
            placeholder="今日はどんな気分？"
            maxLength={MAX_QUERY_LENGTH}
            disabled={isPending}
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
            aria-label="検索キーワード"
          />
          {query.length > 150 && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {query.length}/{MAX_QUERY_LENGTH}
            </span>
          )}
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-blue-800 text-white disabled:opacity-40 transition-opacity"
            aria-label="検索"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        {validationError && (
          <p className="text-xs text-red-500 mt-1 px-1">{validationError}</p>
        )}
      </div>
    </form>
  );
}
