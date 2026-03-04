# DPAL Master Enterprise Dashboard — Standalone Copy

This folder contains the **dashboard-only** files so you can work on them separately from the Nexus site. When you’re ready, copy them into your target project.

## Contents

- **`src/lib/dpal-api.ts`** — API client (health, reports feed, probes). Uses `NEXT_PUBLIC_DPAL_API_BASE`.
- **`src/pages/MasterEnterpriseDashboard.tsx`** — Main dashboard UI (Overview, Quality Control, Site Monitoring).
- **`app/enterprise/page.tsx`** — Next.js App Router page that renders the dashboard at `/enterprise`.

## Where to place these in your project

1. **`src/lib/dpal-api.ts`** → your project’s `src/lib/dpal-api.ts` (create `src/lib` if needed).
2. **`src/pages/MasterEnterpriseDashboard.tsx`** → your project’s `src/pages/MasterEnterpriseDashboard.tsx`.
3. **`app/enterprise/page.tsx`** → your project’s `app/enterprise/page.tsx` (create `app/enterprise` if needed).

## Requirements in the target project

- Next.js (App Router).
- React.
- **recharts** (`npm install recharts`).
- Tailwind CSS (for the dashboard styles).
- `tsconfig.json` path alias: `"@/*": ["./*"]` so `@/src/...` resolves.

## Environment

In the project that serves this dashboard, set:

- `NEXT_PUBLIC_DPAL_API_BASE` — base URL of your DPAL API (e.g. `https://your-dpal-api.up.railway.app`).

## Route

After copying, the dashboard is available at: **`/enterprise`**.
