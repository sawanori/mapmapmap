# Task 05: Phase 1 Integration Verification

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-05 |
| Phase | Phase 1: Data Foundation + Search Core |
| Verification Level | L2 (integration -- full search pipeline) |
| Estimated File Count | 0 files (verification only) |
| Dependencies | Task 03, Task 04 |

## Overview

Verify the end-to-end search pipeline: seeded data in Turso is queryable via the `searchSpots` Server Action. Confirm OpenAI embedding generation, Turso vector search, Haversine filtering, and error handling all work correctly together.

## Target Files

No new files. This is a verification-only task.

## Verification Procedure

### Test 1: Happy Path -- Semantic Search
```bash
npx tsx -e "
import { searchSpots } from './src/app/actions';

// Test query 1: Coffee/reading
const r1 = await searchSpots('quiet coffee shop for reading', 35.6812, 139.7671);
console.log('Query 1 - quiet coffee shop:');
console.log('  success:', r1.success);
if (r1.success) {
  console.log('  results:', r1.data.length);
  r1.data.slice(0, 3).forEach(s => console.log('    -', s.name, s.category, s.distance.toFixed(2), 'km'));
}

// Test query 2: Late night bar
const r2 = await searchSpots('late night bar for thinking alone', 35.6812, 139.7671);
console.log('Query 2 - late night bar:');
console.log('  success:', r2.success);
if (r2.success) {
  console.log('  results:', r2.data.length);
  r2.data.slice(0, 3).forEach(s => console.log('    -', s.name, s.category, s.distance.toFixed(2), 'km'));
}

// Test query 3: Art/gallery
const r3 = await searchSpots('art gallery with interesting exhibitions', 35.6812, 139.7671);
console.log('Query 3 - art gallery:');
console.log('  success:', r3.success);
if (r3.success) {
  console.log('  results:', r3.data.length);
  r3.data.slice(0, 3).forEach(s => console.log('    -', s.name, s.category, s.distance.toFixed(2), 'km'));
}
"
```

### Test 2: Distance Validation
```bash
npx tsx -e "
import { searchSpots } from './src/app/actions';
const r = await searchSpots('any place', 35.6812, 139.7671);
if (r.success) {
  const allWithinRadius = r.data.every(s => s.distance <= 3.0);
  const sortedAscending = r.data.every((s, i) => i === 0 || s.distance >= r.data[i-1].distance);
  const allNonNegative = r.data.every(s => s.distance >= 0);
  console.log('All within 3km:', allWithinRadius);
  console.log('Sorted ascending:', sortedAscending);
  console.log('All non-negative:', allNonNegative);
}
"
```

### Test 3: Error Paths
```bash
npx tsx -e "
import { searchSpots } from './src/app/actions';

// Empty query
const e1 = await searchSpots('', 35.6812, 139.7671);
console.log('Empty query -> VALIDATION_ERROR:', !e1.success && e1.error.code === 'VALIDATION_ERROR');

// Whitespace-only query
const e2 = await searchSpots('   ', 35.6812, 139.7671);
console.log('Whitespace query -> VALIDATION_ERROR:', !e2.success && e2.error.code === 'VALIDATION_ERROR');

// Too long query
const e3 = await searchSpots('a'.repeat(201), 35.6812, 139.7671);
console.log('201-char query -> VALIDATION_ERROR:', !e3.success && e3.error.code === 'VALIDATION_ERROR');

// Invalid coordinates
const e4 = await searchSpots('test', 100, 200);
console.log('Invalid coords -> VALIDATION_ERROR:', !e4.success && e4.error.code === 'VALIDATION_ERROR');
"
```

### Test 4: Performance Check
```bash
npx tsx -e "
import { searchSpots } from './src/app/actions';
const start = Date.now();
const r = await searchSpots('cozy place to relax', 35.6812, 139.7671);
const elapsed = Date.now() - start;
console.log('Search completed in', elapsed, 'ms');
console.log('Under 2 seconds:', elapsed < 2000);
"
```

## Acceptance Criteria

- [ ] `searchSpots` returns relevant results for at least 3 different natural language queries
- [ ] All returned results have non-negative distance values in km
- [ ] All returned results are within 3km radius
- [ ] Results are sorted by distance ascending
- [ ] Validation errors returned for empty, whitespace-only, and too-long inputs
- [ ] Full pipeline completes in under 2 seconds (local measurement)
- [ ] Phase 1 coverage: AC-001 (partial), AC-006, AC-008

## Notes

- If performance exceeds 2 seconds, check OpenAI API latency vs Turso query latency separately
- If vector search returns no results, verify seed data was inserted correctly and DiskANN index was created
- If search results seem irrelevant, check that embedding input for seed data includes description + magazineContext
