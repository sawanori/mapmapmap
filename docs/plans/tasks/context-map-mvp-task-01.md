# Task 01: Project Scaffolding and Configuration

| Item | Details |
|------|---------|
| Task ID | context-map-mvp-task-01 |
| Phase | Phase 1: Data Foundation + Search Core |
| Verification Level | L1 (unit -- dev server starts) |
| Estimated File Count | 9 files (new) |
| Dependencies | None |

## Overview

Initialize Next.js 15 project with App Router, TypeScript strict mode, Tailwind CSS, and all required dependencies. Configure environment variable template and Drizzle Kit for Turso.

## Target Files

| File | Action | Description |
|------|--------|-------------|
| `package.json` | new | Project manifest with all dependencies |
| `tsconfig.json` | new | TypeScript strict mode configuration |
| `next.config.ts` | new | Next.js configuration |
| `tailwind.config.ts` | new | Tailwind CSS configuration |
| `src/app/layout.tsx` | new | Minimal root layout |
| `src/app/page.tsx` | new | Placeholder page |
| `.env.local` | new | Environment variable template |
| `.gitignore` | new | Git ignore patterns |
| `drizzle.config.ts` | new | Drizzle Kit configuration for Turso |

## Implementation Steps

### Step 1: Create Next.js project
```bash
npx create-next-app@latest . --app --typescript --tailwind --eslint --src-dir --import-alias "@/*" --use-npm
```

### Step 2: Install project dependencies
```bash
npm install @libsql/client drizzle-orm openai react-map-gl mapbox-gl
npm install -D drizzle-kit @types/mapbox-gl tsx
```

### Step 3: Verify TypeScript strict mode
Confirm `tsconfig.json` has `"strict": true`.

### Step 4: Configure Drizzle Kit
Create `drizzle.config.ts`:
```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
} satisfies Config;
```

### Step 5: Create .env.local template
```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
OPENAI_API_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
```

### Step 6: Verify dev server
```bash
npm run dev
```
Confirm the development server starts without errors.

## Acceptance Criteria

- [x] `npm run dev` starts Next.js development server successfully (no errors in terminal)
- [x] TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- [x] All dependencies listed above are installed and resolvable (`node_modules/` populated)
- [x] `.env.local` template exists with all 4 environment variable placeholders
- [x] `drizzle.config.ts` configured with `dialect: "turso"` and correct schema path
- [x] `.gitignore` includes `node_modules/`, `.env.local`, `.next/`

## Verification Method

```bash
# 1. Dev server starts
npm run dev
# Verify "Ready" message in terminal output

# 2. TypeScript strict mode
grep '"strict": true' tsconfig.json

# 3. Dependencies installed
node -e "require('@libsql/client'); require('drizzle-orm'); require('openai'); console.log('All deps OK')"

# 4. Env template exists
cat .env.local
```
