# DPAL HQ — One Strong Master Build Prompt

**Use this single document** as the canonical build brief. Paste it into Cursor, Claude Code, OpenClaw, a GitHub issue, or your engineering kickoff doc.

---

## PROJECT NAME

**DPAL Headquarters (DPAL HQ)**

---

## MISSION

Build a **production-grade web platform** called **DPAL Headquarters (DPAL HQ)** that serves as the central command, workflow, investigation, oversight, and integration system for the entire DPAL ecosystem.

DPAL HQ must securely supervise and coordinate:

- DPAL Nexus  
- DPAL Reports  
- DPAL Ledger  
- Evidence / Media systems  
- AI task services  
- Alerts / anomaly services  
- Future DPAL sector modules  

**This is not a generic admin dashboard.**  
It is a **serious enterprise operations platform** for: public accountability, legal defensibility, intelligent workflow supervision, investigation support, evidence review, ledger verification, endpoint orchestration, auditability, and modular expansion.

---

## CORE PRODUCT REQUIREMENTS

Build DPAL HQ with these major capabilities:

1. Executive Overview Dashboard  
2. Connected Site Monitoring  
3. Reports Command Center  
4. Evidence Management  
5. Workflow / Triage Engine  
6. Investigation Workspace  
7. Ledger / Verification Panel  
8. Alerts / Watchlist / Anomaly Center  
9. AI Orchestration Panel  
10. User / Role / Moderator Management  
11. Search / Correlation Workspace  
12. Audit / Compliance Logs  
13. Integrations / Endpoint Registry  
14. Settings / Config / Rules Management  

---

## PRODUCT VISION

DPAL HQ should behave like: an enterprise command center, a workflow and triage engine, an investigation platform, a ledger oversight console, an AI-supervised review environment, a cross-system integration hub, a compliance and audit control layer.

**Authorized users must be able to:** monitor all connected DPAL systems; intake and review reports; assign and escalate cases; review evidence; supervise AI recommendations; approve or deny ledger actions; correlate linked cases and entities; detect anomalies and patterns; manage permissions and jurisdictions; export audit histories and investigation packets.

---

## UI / UX REQUIREMENTS

Use a **serious enterprise-grade interface**, not a shallow admin template.

**Global layout:** top command header · left vertical navigation · central operational workspace · right-side contextual drawer/inspector · modular KPI cards · data tables · timeline views · feed views · alert badges · strong urgency styling for failures, disputes, escalations.

**Left navigation:** Overview | Sites | Reports | Evidence | Workflows | Investigations | Ledger | Alerts | AI Tasks | Users | Audit | Integrations | Settings.

**Top header:** DPAL HQ branding · environment (dev/staging/production) · connected site count · live alert count · pending verification count · global search · quick actions · current user/role · jurisdiction selector · refresh/sync status.

**Quick actions:** Create investigation · Open urgent reports · Review flagged users · Validate ledger entries · Open AI recommendations · Trigger sync · Export audit report.

---

## MODULE DETAILS (Summary)

| # | Module | Key capabilities |
|---|--------|------------------|
| 1 | Executive Overview | Total/unresolved/high-risk reports, by jurisdiction/category, pending evidence/ledger, AI escalations, moderator queue, endpoint failures, uptime |
| 2 | Site Health | Per-site: online/offline, API health, last sync, pending jobs, throughput, errors, version, quick access |
| 3 | Reports Command Center | New/urgent/missing evidence/duplicates/moderator/legal/AI/ledger/disputed/closed; filters; row actions (assign, escalate, request evidence, publish, anchor, etc.) |
| 4 | Evidence Management | Upload, preview, metadata, validation, hashing, integrity, request more, sufficiency review, verification, restricted access |
| 5 | Workflow / Triage | Intake normalization, triage scoring, state transitions, configurable routing, approval gates, evidence checks, visibility, dispute, ledger readiness |
| 6 | Investigation Workspace | Timeline, linked reports/people/institutions/locations, evidence hashes, relationship graph, map, notes, subtasks, export packet |
| 7 | Ledger / Verification | Pending/confirmed/rejected/disputed, hash verification, integrity, validators, network status, queue, latency |
| 8 | Alerts / Watchlist / Anomaly | Spikes, repeated names/institutions, suspicious behavior, endpoint failures, ledger mismatches, backlog spikes, AI conflicts |
| 9 | AI Orchestration | Classify, summarize, duplicate detection, entity extraction, risk score, route recommendations; human approve/reject/modify, confidence, rationale |
| 10 | User / Role Management | Users, moderators, investigators, legal, validators, suspended/flagged, trust score, assignments, audit history |
| 11 | Search / Correlation | By report ID, person, institution, school, officer, company, address, agency, tag, wallet/evidence hash, category, related reports |
| 12 | Audit / Compliance | Actor, action, object, prior/new state, timestamp, context, AI involvement, approval chain, reason; filterable compliance views |
| 13 | Integrations / Endpoint Registry | Service registration, base URL, version, auth, health path, timeout, retry, rate limit, enable/disable, test |
| 14 | Settings / Config / Rules | Global, environment, and domain config; workflow/alert/AI/evidence/ledger/visibility/category/jurisdiction rules; feature flags |

---

## WORKFLOW STATES (Canonical)

new · intake-validated · pending-ai-review · pending-human-triage · pending-evidence · evidence-under-review · duplicate-suspected · pending-moderator-review · pending-legal-review · pending-investigation · pending-ledger-review · pending-ledger-anchor · anchored · published · restricted · disputed · resolved · archived · escalated-external · rejected

---

## TECHNICAL ARCHITECTURE

**Request path:** Frontend → API Gateway → Domain Service → DB / Queue / External Service.

**Logical services (early build may combine):** HQ Frontend, API Gateway, Auth, Reports, Workflow/Triage, Investigation, Evidence, Ledger, AI, Alerts, Audit, Integrations, Notifications, Search, Config.

**Storage:** PostgreSQL (primary), Redis (cache/queues), object storage (evidence/media). Search index later if needed.

**API contract:** Versioned `/api/v1/...`, JSON, validate payloads, structured errors, request IDs, log admin mutations. See endpoint families below.

---

## DATA MODEL (Core Entities)

User, Role, Permission, Session, Site, Integration, Endpoint, Report, ReportCategory, ReportSubcategory, EvidenceItem, EvidenceHash, Institution, PersonEntity, Location, Jurisdiction, Investigation, InvestigationLink, WorkflowState, TriageScore, Assignment, Alert, Anomaly, Watchlist, LedgerEntry, LedgerDecision, AIJob, AIRecommendation, VisibilityDecision, AuditEvent, ComplianceReview, Notification, ConfigRule, QueueJob, HealthSnapshot.

---

## API CONTRACT (Endpoint Families)

All under **`/api/v1/`**. Validate payloads; return structured success/error with `requestId`, `timestamp`, `version` in `meta`.

**AUTH** — login, logout, me, refresh, roles  
**HQ** — overview, kpis, activity-feed, global-status, connected-sites  
**SITES** — list, get, health, metrics, errors, sync, restart-job  
**REPORTS** — list, get, create, update, assign, escalate, request-evidence, publish, hide, anchor, filters/options, stats  
**EVIDENCE** — list, get, upload, hash, verification, request-review  
**INTAKE/TRIAGE** — intake (report, event, bulk), get; triage score, recalculate, queues, queue  
**WORKFLOWS** — list, get, setState, route, assign, escalate, restrict, publish-ready  
**AI** — classify, summarize, extract-entities, detect-duplicates, risk-score, recommend-route, build-timeline, link-related; recommendations get/approve/reject/modify  
**INVESTIGATIONS** — list, create, get, update, add-item, add-note, add-link, timeline, graph, export  
**PATTERNS/DUPLICATES** — duplicates list/get/resolve; correlations; patterns list/clusters/trends/recompute  
**EVIDENCE-REVIEW** — queues, check, request-more, approve, reject, status  
**VISIBILITY/PUBLICATION** — set-public/private/restricted, get; publication submit/approve/reject  
**LEDGER** — entries, anchor, pending, disputed, validators, networks/status, retry, audit  
**LEDGER-DECISION** — check-readiness, approve, reject, dispute, status  
**USERS/ROLES** — users list/get/update/suspend/reinstate/role/audit; roles; permissions  
**ALERTS/WATCHLISTS** — alerts list/get/acknowledge/escalate; watchlists list/create/update; anomalies  
**AUDIT/COMPLIANCE** — audit logs/actions/export; compliance events/exceptions/review  
**INTEGRATIONS/ENDPOINTS** — integrations list/get/test/update; endpoints list/health/reload  

*(Full path list is in the 3-series docs and `src/lib/hq-endpoints.ts` / `hq-workflow-endpoints.ts`; backend should implement under `/api/v1/`.)*

---

## SECURITY

**Auth:** JWT or secure session, refresh/session rotation, service-to-service auth, future MFA, session/device visibility.  
**Authorization:** RBAC with policy-ready controls.  
**Controls:** Rate limiting, request validation, secure uploads, signed media URLs, environment separation, secure secrets, least-privilege, anomaly flagging for admin, **server-side permission enforcement**.

---

## AUDIT / COMPLIANCE

Every critical action: **who** acted, **what** changed, **prior state**, **new state**, **when**, **why**, **AI involvement**, **approval chain**, technical context where relevant. Filterable by actor, object type, date range, action type, jurisdiction, category, severity, service.

---

## QUEUES / BACKGROUND JOBS

Use for: AI classification, duplicate detection, evidence hashing, media processing, ledger retries, anomaly computation, search indexing, notifications, site sync, integrity checks. Each job: id, type, status, attempts, timestamps, related object, failure reason, retry policy.

---

## OBSERVABILITY

**Must-have:** service health, latency, failure counts, queue size, worker failures, sync lag, DB health, storage, alert spikes, AI/ledger success-failure rates.  
**Layers:** structured logs, metrics, traces, health dashboard, integration health panel.

---

## DEPLOYMENT / ENVIRONMENT

**Environments:** local, staging, production.  
**Stack (suggested):** Frontend (e.g. React + Vite + TypeScript, Tailwind); Backend (Node + TypeScript, modular); PostgreSQL; Redis; S3-compatible storage; Vercel (frontend), Railway/Render/container (API); secure secret manager.

**Env vars (plan for):** NODE_ENV, APP_ENV, PORT, FRONTEND_URL, API_BASE_URL, DATABASE_URL, REDIS_URL, JWT_SECRET, REFRESH_TOKEN_SECRET, SESSION_SECRET, STORAGE_*, AUDIT_LOG_LEVEL, DEFAULT_AI_PROVIDER, OPENAI_*/GEMINI_*, LEDGER_*, INTERNAL_SERVICE_TOKEN, WEBHOOK_SECRET, MAX_UPLOAD_MB, FEATURE_FLAG_*.

---

## INTERNAL MODULES (Backend)

auth, users, roles, sites, integrations, reports, categories, evidence, workflows, triage, investigations, alerts, anomalies, ledger, ai, audit, compliance, search, config, notifications, health.

**Suggested structure:** `/src/modules/<module>`, `/src/shared` (db, queue, storage, security, validation, logging, utils), `/config`, `/workers`, `/scripts`.

---

## BUILD ORDER

**PHASE 1** — HQ shell, authentication, role-aware nav, executive overview, connected sites widget, reports table, alerts panel, endpoint health panel, backend API stubs.

**PHASE 2** — Intake normalization, triage scoring, queue board, workflow state changes, assignments, human review actions, audit logging, AI recommendation drawer, ledger readiness panel.

**PHASE 3** — Evidence verification, investigation workspace, linked entities, duplicate detection, pattern detection, anomaly logic, watchlists, exportable investigation packet.

**PHASE 4** — Config/rules editor, advanced integrations manager, performance tuning, observability, permission refinement, production hardening.

---

## NON-NEGOTIABLE ENGINEERING RULES

- Do not build a passive dashboard.  
- Do not let AI auto-publish serious items by default.  
- Do not hide routing logic.  
- Do not skip audit logging.  
- Do not hardcode service URLs across the codebase.  
- Do not rely on frontend-only permission checks.  
- Do not allow silent failures for ledger or AI jobs.  
- Do not bury business logic in UI components.  
- Do not tightly couple category logic so new sectors are painful to add.  
- Do not skip queues for AI, media, and heavy tasks.  

---

## DELIVERABLE EXPECTATIONS

1. Project folder structure  
2. Technical architecture summary  
3. Database schema proposal  
4. API contract scaffolding  
5. Frontend route map  
6. Shared type definitions  
7. Role/permission matrix  
8. Initial UI shell  
9. First milestone implementation plan  
10. TODO list for engineers  

Then **begin implementation with Phase 1**. Use clean, maintainable, production-minded code. Prefer modular TypeScript. Keep UI serious, modern, and operationally useful. Every important mutation must be auditable. Every major domain object must be drillable. Every critical queue must be measurable. Every integration must have health checks. Every AI suggestion must remain reviewable by humans.

---

## HOW TO USE THIS PROMPT

Paste into: **Cursor** · **Claude Code** · **OpenClaw** · **GitHub issue** · **internal engineering kickoff doc**.

**Repo name ideas:** `dpal-hq` · `dpal-headquarters` · `dpal-command-center` · `dpal-ops-hq`.

**Suggested first branch:** `feat/hq-foundation`.

---

*For the full endpoint list, config categories, and detailed 3-series breakdown, see `DPAL-HQ-BUILD-PROMPT-SERIES-1.md`, `SERIES-2.md`, `SERIES-3.md` and `src/lib/hq-endpoints.ts`, `hq-workflow-endpoints.ts`, `hq-architecture.ts` in this repo.*
