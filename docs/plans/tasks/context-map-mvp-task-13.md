# Task 13: Error Handling Integration (All Components)

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-13 |
| Phase | Phase 3: Spot Detail + Polish |
| Verification Level | L2 (integration -- error states across components) |
| Estimated File Count | 3 files (modify) |
| Dependencies | Task 12 |

## Overview

Harden error handling across all components per Design Doc error strategy. Ensure all error codes are properly handled in Server Action, errors are displayed appropriately in SearchBar, and Map component handles Mapbox load failures gracefully.

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `src/app/actions.ts` | modify | Harden try-catch, verify all error codes |
| `src/components/SearchBar.tsx` | modify | Improve error display (inline + toast) |
| `src/components/Map.tsx` | modify | Add Mapbox load error fallback UI |

## Implementation Steps

### Step 1: Harden Server Action error handling (`src/app/actions.ts`)
Review and ensure:
- All code paths wrapped in try-catch
- OpenAI call has explicit AbortController timeout (5s)
- Turso query wrapped in separate try-catch for `DB_ERROR`
- No stack traces or technical details in error messages
- Verify all 4 error codes are reachable:
  - `VALIDATION_ERROR`: input validation failures
  - `EMBEDDING_ERROR`: OpenAI API failure/timeout
  - `DB_ERROR`: Turso connection/query failure
  - `UNKNOWN_ERROR`: unexpected errors (outer catch)

Specific improvements:
```typescript
// Ensure AbortController properly cleans up
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);
try {
  const response = await openai.embeddings.create(
    { model: EMBEDDING_MODEL, input: trimmedQuery },
    { signal: controller.signal }
  );
  clearTimeout(timeoutId);
  embedding = response.data[0].embedding;
} catch (e) {
  clearTimeout(timeoutId);
  return {
    success: false,
    error: {
      code: 'EMBEDDING_ERROR',
      message: 'Search failed. Please try again.',
    },
  };
}
```

### Step 2: Improve SearchBar error display (`src/components/SearchBar.tsx`)
Add differentiated error display:

```typescript
// Validation errors: inline below input
// API/DB errors: toast notification at top
const [validationError, setValidationError] = useState<string | null>(null);

// Before calling searchSpots:
const trimmed = query.trim();
if (!trimmed) {
  setValidationError('Please enter a search query.');
  return;
}
if (trimmed.length > MAX_QUERY_LENGTH) {
  setValidationError(`Maximum ${MAX_QUERY_LENGTH} characters.`);
  return;
}
setValidationError(null);

// In JSX, below input:
{validationError && (
  <p className="text-xs text-red-500 mt-1 px-1">{validationError}</p>
)}
```

Clear errors on new search attempt:
```typescript
// At start of handleSubmit:
setValidationError(null);
// In parent, clear errorMessage on new search
```

### Step 3: Add Mapbox load error handling (`src/components/Map.tsx`)
```typescript
const [mapError, setMapError] = useState(false);

// In Map component JSX:
<Map
  onError={() => setMapError(true)}
  // ... other props
>

// Fallback UI:
{mapError && (
  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
    <div className="text-center p-6">
      <p className="text-gray-600 font-medium">Failed to load map</p>
      <p className="text-gray-400 text-sm mt-1">Please check your connection and reload.</p>
    </div>
  </div>
)}
```

### Step 4: Network error handling
When Server Action is unreachable (network error), `useTransition` will throw.
Add error boundary or catch in the transition:

```typescript
startTransition(async () => {
  try {
    const response = await searchSpots(trimmed, userLocation.lat, userLocation.lng);
    if (response.success) {
      onResults(response.data);
    } else {
      onError(response.error.message);
    }
  } catch (e) {
    onError('Network error. Please check your connection.');
  }
});
```

## Acceptance Criteria

- [x] All 4 error types from Design Doc error table handled (`VALIDATION_ERROR`, `EMBEDDING_ERROR`, `DB_ERROR`, `UNKNOWN_ERROR`)
- [x] No technical details (stack traces, API keys) exposed to user in any error path
- [x] User-facing error messages are friendly and actionable
- [x] Validation errors shown inline below search input
- [x] API/DB errors shown as top-of-screen toast notification
- [x] Mapbox load failure shows fallback UI with message
- [x] Errors clear on retry/new search
- [x] Network errors caught and displayed appropriately
- [x] `tsc --noEmit` passes

## Verification Method

```bash
# 1. Start dev server
npm run dev

# 2. Error scenario tests:

# Test A - Validation errors:
#   - Submit with empty input -> inline "Please enter a search query" (or button disabled)
#   - Type 200+ characters -> character count warning visible

# Test B - API errors (simulate by temporarily setting invalid OPENAI_API_KEY):
#   - Search -> "Search failed. Please try again." toast
#   - Try another search -> error clears, new attempt made

# Test C - Mapbox error (simulate by setting invalid NEXT_PUBLIC_MAPBOX_TOKEN):
#   - Page load -> "Failed to load map" fallback UI

# Test D - Network error (DevTools > Network > Offline):
#   - Search -> "Network error" message

# 3. TypeScript check
npx tsc --noEmit
```

## Notes

- Error messages match the Design Doc error handling strategy table
- `clearTimeout` is called in both success and error paths of the OpenAI call to prevent memory leaks
- The `UNKNOWN_ERROR` catch is the outermost try-catch, catching anything not handled by inner catches
