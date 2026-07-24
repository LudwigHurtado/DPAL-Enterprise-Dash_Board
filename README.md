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
- **`app/media-studio/`** — **DPAL Evidence Studio**, a human-reviewed video drafting and production-record interface.
- **`app/api/media-studio/`** — Server-only health, create-task, status, protected asset streaming, and report routes.
- **`src/lib/media-renderer.ts`** — Vendor-neutral validation, authentication, private-renderer client, output normalization, asset controls, and report integrity logic.

## Where to place these in your project

1. **`src/lib/dpal-api.ts`** → your project’s `src/lib/dpal-api.ts` (create `src/lib` if needed).
2. **`pages/MasterEnterpriseDashboard.tsx`** → your project’s `pages/MasterEnterpriseDashboard.tsx`.
3. **`app/enterprise/page.tsx`** → your project’s `app/enterprise/page.tsx` (create `app/enterprise` if needed).
4. Keep the Evidence Studio API routes in the same Next.js application so credentials, signing keys, and renderer URLs remain server-side.

## Requirements in the target project

- Next.js (App Router).
- React.
- **recharts** (`npm install recharts`).
- Tailwind CSS (for the dashboard styles).
- `tsconfig.json` path alias: `"@/*": ["./*"]` so `@/src/...` resolves.

## Environment

In the project that serves this dashboard, set:

- `NEXT_PUBLIC_DPAL_API_BASE` — base URL of your DPAL API.
- `DPAL_MEDIA_RENDERER_URL` — private renderer API URL reachable from the Next.js server.
- `DPAL_MEDIA_RENDERER_API_KEY` — optional upstream `x-api-key`.
- `DPAL_MEDIA_RENDERER_TIMEOUT_MS` — optional API-call timeout.
- `DPAL_MEDIA_STUDIO_ACCESS_TOKEN` — production operator token protecting render and report requests.
- `DPAL_MEDIA_REPORT_SIGNING_KEY` — recommended secret used to HMAC-sign production records.

Legacy `MONEYPRINTER_*` environment names remain accepted temporarily for deployment migration, but they are no longer the DPAL product name.

See **`docs/DPAL_EVIDENCE_STUDIO.md`** for deployment, security, renderer compatibility, report integrity, and production-hardening instructions.

## Routes

- Enterprise HQ: **`/enterprise`**
- DPAL Evidence Studio: **`/media-studio`**
- Evidence Studio production reports: **`POST /api/media-studio/report`**
