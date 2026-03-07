# DPAL Master Enterprise Dashboard — Standalone Copy

This folder contains the **dashboard-only** files so you can work on them separately from the Nexus site. When you’re ready, copy them into your target project.

## Build packet

**One strong master prompt (paste into Cursor / Claude / GitHub):**  
**`docs/DPAL-HQ-MASTER-BUILD-PROMPT.md`** — Project name, mission, 14 core capabilities, UI/UX, module summary, workflow states, architecture, data model, API families, security, audit, queues, observability, deployment, build order (4 phases), non-negotiables, deliverable expectations. Use this as the single canonical brief.

**Detailed 3-series (reference):**

| Series | Focus | Doc | Code |
|--------|--------|-----|------|
| **1** | HQ Control Core | `docs/DPAL-HQ-BUILD-PROMPT-SERIES-1.md` | `src/lib/hq-endpoints.ts` |
| **2** | Workflow + AI + Investigation | `docs/DPAL-HQ-BUILD-PROMPT-SERIES-2.md` | `src/lib/hq-workflow-endpoints.ts` |
| **3** | Data, Config, Security, Deployment | `docs/DPAL-HQ-BUILD-PROMPT-SERIES-3.md` | `src/lib/hq-architecture.ts` |

**Build order (phases):** Phase 1 — shell, auth, nav, overview, sites, reports, alerts, health, stubs. Phase 2 — intake, triage, queue board, workflow, audit, AI drawer, ledger panel. Phase 3 — evidence, investigations, duplicates, patterns, watchlists, export. Phase 4 — config editor, integrations, tuning, hardening.

## Contents

- **`src/lib/dpal-api.ts`** — API client (health, reports feed, probes). Uses `NEXT_PUBLIC_DPAL_API_BASE`.
- **`src/lib/hq-architecture.ts`** — Series 3: config categories, API response/error shapes, env vars, module names, endpoint registry type.
- **`pages/MasterEnterpriseDashboard.tsx`** — HQ UI: command bar, full left menu, overview, sites, reports, triage board, ledger/evidence/AI/users/audit/integrations/settings placeholders, detail inspector with AI + workflow timeline.
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
