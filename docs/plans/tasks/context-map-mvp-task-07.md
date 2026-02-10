# Task 07: SearchBar Component (UI and Server Action Integration)

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-07 |
| Phase | Phase 2: Map UI + Search Integration |
| Verification Level | L2 (integration -- UI triggers Server Action) |
| Estimated File Count | 2 files (new/modify) |
| Dependencies | Task 05 (Phase 1 complete) |

## Overview

Implement a floating search bar at the bottom of the screen that accepts natural language input, calls the `searchSpots` Server Action via `useTransition`, manages loading state, and passes results to parent via callback.

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/SearchBar.tsx` | new | Client Component -- search input + submit |
| `src/app/page.tsx` | modify | Wire SearchBar with onResults callback |

## Implementation Steps

### Step 1: Implement SearchBar component (`src/components/SearchBar.tsx`)
```typescript
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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      startTransition(async () => {
        const response = await searchSpots(trimmed, userLocation.lat, userLocation.lng);
        if (response.success) {
          onResults(response.data);
        } else {
          onError(response.error.message);
        }
      });
    },
    [query, userLocation, onResults, onError]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-md flex items-center gap-2 bg-white rounded-2xl shadow-lg px-4 py-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="How do you feel today?"
          maxLength={MAX_QUERY_LENGTH}
          disabled={isPending}
          className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
          aria-label="Search query"
        />
        {query.length > 150 && (
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {query.length}/{MAX_QUERY_LENGTH}
          </span>
        )}
        <button
          type="submit"
          disabled={isPending || !query.trim()}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-900 text-white disabled:opacity-40 transition-opacity"
          aria-label="Search"
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
    </form>
  );
}
```

### Step 2: Update page.tsx to wire SearchBar
```typescript
// In page.tsx, add client wrapper or convert to client component for state
// SearchBar needs to pass results to Map -- this will be wired in Task 09
// For now, add SearchBar with console.log callback for verification

import dynamic from 'next/dynamic';
import { DEFAULT_LAT, DEFAULT_LNG } from '@/lib/constants';

const MapView = dynamic(() => import('@/components/Map'), { ssr: false });
const SearchBar = dynamic(() => import('@/components/SearchBar'), { ssr: false });

// Note: page.tsx will need to become a client component or use a client wrapper
// to manage shared state between SearchBar and Map.
// For this task, create a minimal integration. Full state wiring in Task 09.
```

Create a client wrapper component if needed for state management:
```typescript
// src/app/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import { DEFAULT_LAT, DEFAULT_LNG } from '@/lib/constants';
import type { SearchResult } from '@/types/spot';

const MapView = dynamic(() => import('@/components/Map'), { ssr: false });
import SearchBar from '@/components/SearchBar';

export default function Home() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResults = useCallback((results: SearchResult[]) => {
    setSearchResults(results);
    setErrorMessage(null);
  }, []);

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  return (
    <main className="relative w-screen h-dvh overflow-hidden">
      <MapView initialCenter={{ lat: DEFAULT_LAT, lng: DEFAULT_LNG }} />
      <SearchBar
        userLocation={{ lat: DEFAULT_LAT, lng: DEFAULT_LNG }}
        onResults={handleResults}
        onError={handleError}
      />
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 text-red-700 px-4 py-2 rounded-lg shadow text-sm">
          {errorMessage}
        </div>
      )}
    </main>
  );
}
```

## Acceptance Criteria

- [x] AC-001 (partial): Search bar accepts natural language input and triggers search
- [x] Input limited to 200 characters with visual character count when > 150 chars
- [x] Loading state visible during search (spinner in button)
- [x] Submit button disabled when query is empty or search is in progress
- [x] Error messages displayed for failed searches (top-of-screen toast)
- [x] Mobile-first design: fixed bottom position, appropriate tap targets (40px button)
- [x] Safe area bottom padding for iOS
- [x] `tsc --noEmit` passes

## Verification Method

```bash
# 1. Start dev server
npm run dev

# 2. Open browser to http://localhost:3000
# 3. Visual verification:
#    - Search bar floating at bottom of screen
#    - Can type text into search bar
#    - Submit button shows spinner during search
#    - Results logged to console (or error toast appears)
#    - Character count appears when > 150 chars
#    - Submit disabled when input empty

# 4. TypeScript check
npx tsc --noEmit
```

## Notes

- `page.tsx` is converted to a client component (`'use client'`) because it needs to manage shared state (searchResults) between SearchBar and Map. This is acceptable for the MVP.
- Alternative approach: keep page.tsx as Server Component and use a client wrapper. Either works for MVP.
- `userLocation` is hardcoded to Tokyo Station default for now. Task 08 will add Geolocation.
