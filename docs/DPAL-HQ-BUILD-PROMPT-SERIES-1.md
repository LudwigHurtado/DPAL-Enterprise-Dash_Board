# DPAL HQ Master Build Prompt — Series 1 of 3

## HQ Control Core

This is the first of a 3-series prompt system for building the DPAL Headquarters software. Use this as the **master build packet** for engineers and codebots.

---

## 1. What This Software Must Be

The DPAL Headquarters software is the **central command dashboard** for the entire DPAL ecosystem. It is not a stats page. It must act like a real operating center that lets administrators, compliance reviewers, investigators, engineers, and AI agents:

- View all connected DPAL properties
- Monitor report intake across all categories
- Manage public and private case flows
- Review blockchain / ledger activity
- Observe platform health
- Trigger workflows
- Assign follow-up actions
- Audit users, moderators, and validators
- Review AI-generated recommendations before execution
- Control permissions across all DPAL sites
- See financial, legal, and operational signals in one place

The HQ software must feel like a mix of:

- Enterprise command center
- Operations dashboard
- Compliance console
- Public accountability monitor
- AI-assisted case triage system
- Blockchain verification panel

---

## 2. Build Objective

**Build a production-grade web-based headquarters control platform** for the DPAL ecosystem. The platform must act as the **central operational brain** for all DPAL properties: DPAL Nexus, DPAL Reports, DPAL Ledger, and future sector-specific sites.

The platform must **not** be a passive dashboard. It must be a **live control center** that allows administrators and authorized teams to **monitor, search, filter, audit, route, review, verify, and control** activity across all connected DPAL systems.

### Primary Goals

1. Centralized control of all DPAL sites and modules
2. Real-time visibility into reports, cases, alerts, users, ledger activity, AI tasks, and platform health
3. Unified permissions and role control
4. Endpoint-based modular architecture so every section can operate independently but report into HQ
5. Clean enterprise interface with strong filtering, alerting, and action routing
6. Scalable architecture for future categories, jurisdictions, and tokenized or ledger-backed workflows
7. Auditability, traceability, and legal defensibility of system actions
8. Integration-ready design for AI agents, blockchain verification, media evidence, moderation, and jurisdiction-aware workflows

### Core HQ Areas Required

| Area | Purpose |
|------|--------|
| Executive overview | High-level KPIs and status |
| Site health monitor | Per-site status, API health, errors |
| Reports and incidents control center | Full report lifecycle, filters, row actions |
| Ledger and verification monitor | Pending/confirmed/disputed entries, verification |
| User and role management | Users, moderators, roles, suspend/reinstate |
| Alerts and anomaly detection | Watchlist, anomalies, spikes |
| AI orchestration panel | Queued/completed/failed AI tasks, human approval |
| Endpoint and integration manager | Integrations, health, reload |
| Search and investigation workspace | Global search, correlation by entity |
| Audit trail and compliance logs | Logs, actions, export, compliance events |

The software must support **modular widgets**, **role-based access control**, **real-time updates**, and **expandable sections** by category, jurisdiction, city, state, or agency.

HQ must both **read from** connected DPAL properties and **issue controlled actions** back to those properties through secure APIs.

---

## 3. Content That Must Be on the HQ Page

### A. Top Global Header

- DPAL HQ logo / identity
- System status indicator
- **Environment toggle:** dev / staging / production
- **Connected sites count**
- **Live alert count**
- **Pending verification count**
- **Search bar**
- **Quick action button**
- **Current user / role**
- **Jurisdiction selector**
- **Global date/time / refresh status**

**Quick actions (examples):** Create investigation, Open urgent reports, Review flagged users, Validate ledger entries, Open AI recommendations, Trigger sync, Export audit report.

### B. Executive Command Overview

Cards for: total active reports, high-risk reports, unresolved reports, reports by jurisdiction, reports by category, pending evidence reviews, pending blockchain verification, AI-generated escalations, moderator queue size, suspicious user events, endpoint failures, platform uptime, active agencies/sectors.

Answer: *“What is happening right now across the entire DPAL network?”*

### C. Site Control Panel

Each connected site as a managed unit (e.g. DPAL Nexus, DPAL Reports, DPAL Ledger, Public Portal, AI Review, Admin Console, Media Evidence, Validator Node Monitor). Per site: online/offline, API health, last sync, data throughput, error count, pending jobs, last deployment version, suspicious activity score, quick access.

### D. Reports Command Center

New, urgent, missing evidence, duplicate, awaiting moderator/legal/AI/ledger, closed, under dispute. **Filters:** category, subcategory, city, county, state, country, date range, urgency, verification status, evidence type, public/private, assigned reviewer, source site, agency, institution, user trust score, AI risk score. **Row actions:** open case, assign reviewer, escalate, request evidence, mark duplicate, publish, hide, anchor to ledger, export summary, send to Nexus/legal review.

### E. Ledger and Verification Panel

Pending/confirmed/rejected/disputed entries, orphaned records, media hash verification, evidence integrity, chain status, transaction latency, verification queue, validator activity. Answer: what was anchored, what failed, what is pending, what does not match, what needs human review.

### F. User / Role / Moderator Command

Lists: all users, moderators, legal reviewers, sector admins, investigators, AI agents, validator roles, suspended, flagged. Unusual login, abuse patterns, trust/reputation, case assignment load. **Actions:** suspend, reinstate, change role, require review, assign region/sector, open audit history, view related cases.

### G. Investigation Workspace

Search by: report ID, person, institution, school, judge, officer, company, address, city, agency, tag, wallet/ledger hash, evidence hash, category, related reports. Support **correlation and patterns**, not just rows.

### H. Alerts / Watchlist / Anomaly Center

Surface: sudden increase in reports by region, repeated names, coordinated abuse, repeated media, suspicious submissions, endpoint failures, ledger mismatch, moderation backlog spikes, AI confidence conflicts, validator failures, repeated institution complaints.

### I. AI Orchestration Panel

Queued/completed/failed AI tasks; suggested classifications, duplicate matches, escalations, summaries, legal routing; confidence scores; **human approval needed**. HQ must not blindly trust AI—humans supervise.

---

## 4. Endpoint Structure (Target for Backend)

### A. Auth / Session

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `GET /api/auth/roles`

### B. HQ Overview

- `GET /api/hq/overview`
- `GET /api/hq/kpis`
- `GET /api/hq/activity-feed`
- `GET /api/hq/global-status`
- `GET /api/hq/connected-sites`

### C. Site Monitoring

- `GET /api/sites`
- `GET /api/sites/:siteId`
- `GET /api/sites/:siteId/health`
- `GET /api/sites/:siteId/metrics`
- `GET /api/sites/:siteId/errors`
- `POST /api/sites/:siteId/sync`
- `POST /api/sites/:siteId/restart-job`

### D. Reports / Cases

- `GET /api/reports` | `GET /api/reports/:reportId`
- `POST /api/reports` | `PATCH /api/reports/:reportId`
- `POST /api/reports/:reportId/assign` | `escalate` | `request-evidence` | `publish` | `hide` | `anchor`
- `GET /api/reports/filters/options` | `GET /api/reports/stats`

### E. Evidence / Media

- `GET /api/evidence` | `GET /api/evidence/:evidenceId`
- `POST /api/evidence/upload` | `POST /api/evidence/:evidenceId/hash`
- `GET /api/evidence/:evidenceId/verification` | `POST .../request-review`

### F. Ledger / Blockchain / Verification

- `GET /api/ledger/entries` | `GET /api/ledger/entries/:entryId`
- `POST /api/ledger/anchor`
- `GET /api/ledger/pending` | `disputed`
- `GET /api/ledger/validators` | `GET /api/ledger/networks/status`
- `POST /api/ledger/retry/:entryId` | `GET /api/ledger/audit/:referenceId`

### G. Users / Roles / Permissions

- `GET /api/users` | `GET /api/users/:userId` | `PATCH /api/users/:userId`
- `POST /api/users/:userId/suspend` | `reinstate` | `role`
- `GET /api/roles` | `GET /api/permissions` | `GET /api/users/:userId/audit`

### H. Alerts / Watchlists

- `GET /api/alerts` | `GET /api/alerts/:alertId`
- `POST /api/alerts/:alertId/acknowledge` | `escalate`
- `GET/POST/PATCH /api/watchlists` | `GET /api/anomalies`

### I. AI Orchestration

- `GET /api/ai/tasks` | `POST /api/ai/tasks` | `GET /api/ai/tasks/:taskId`
- `POST /api/ai/classify-report/:reportId` | `detect-duplicates` | `summarize/:reportId` | `risk-score/:reportId` | `recommend-actions/:reportId`
- `POST /api/ai/approve/:taskId` | `POST /api/ai/reject/:taskId`

### J. Search / Investigation

- `GET /api/search/global` | `reports` | `users` | `institutions` | `ledger` | `evidence`
- `GET /api/correlation/:entityId`

### K. Audit / Compliance

- `GET /api/audit/logs` | `actions` | `export`
- `GET /api/compliance/events` | `exceptions`
- `POST /api/compliance/review/:itemId`

### L. Integrations / Endpoint Manager

- `GET /api/integrations` | `GET /api/integrations/:integrationId`
- `POST /api/integrations/:integrationId/test` | `PATCH ...`
- `GET /api/endpoints` | `GET /api/endpoints/health` | `POST /api/endpoints/reload`

---

## 5. Technical Requirements

### Frontend

- Modular dashboard layout, reusable cards, advanced filtering
- Live data refresh, tables with bulk actions
- Detail drawers / side panels, role-aware views
- Dark/light capable theme, chart widgets, map widget for geographic density
- Investigation timeline view, audit trail popups
- WebSocket or polling for live updates

### Backend

- RBAC permission layer, API gateway or central orchestration
- Service-to-service auth, audit logging for every admin action
- Queue system for heavy tasks, retry for failed syncs
- Validation on every endpoint, evidence hashing/verification
- AI task queue, jurisdiction-aware logic, rate limits and abuse protection

### Database Concepts

users, roles, permissions, reports, evidence, institutions, jurisdictions, ledger entries, alerts, tasks, audits, integrations, watchlists, anomalies, system health snapshots

---

## 6. GUI Direction

Design as an **enterprise command center**, not a generic admin panel. Feel: **powerful, trustworthy, modern, legally serious**. Dense information without clutter.

**Layout:**

- Strong top navigation header
- Left vertical command menu
- Central live intelligence area
- Right-side contextual panel or slide-out detail inspector
- Modular cards for KPIs
- Tables for operational control
- Timeline and feed views for investigations and audit logs
- Badge-based status indicators
- Urgent visual distinction for alerts, failures, disputes, escalations

**Communicate:** accountability, control, traceability, actionability, seriousness, public trust.

**Suggested left menu:** Overview | Sites | Reports | Ledger | Evidence | Investigations | Alerts | AI Tasks | Users | Audit | Integrations | Settings

---

## 7. Strong Instruction for Codebots

**Do not build a shallow admin dashboard. Build an operational command platform.**

Every major panel must answer one of:

- What needs attention now?
- What is broken?
- What is risky?
- What requires review?
- What has been verified?
- What has changed?
- Who acted?
- What should happen next?

Every object must be **drillable:** report, user, site, evidence item, ledger entry, AI task, alert, institution, jurisdiction.

- Every action in HQ must produce an **audit trail**.
- Every critical state must have **visual status**.
- Every important queue must be **measurable**.
- Every integration must have **health checks**.
- Every AI suggestion must be **reviewable by humans**.

---

## 8. What NOT to Do

- Avoid a dashboard that only shows passive charts.
- Avoid hiding key actions inside too many clicks.
- Avoid vague labels (“Item”, “Entity”) when precise naming is possible.
- Avoid mixing public portal logic with admin control logic.
- Avoid building without audit logs.
- Avoid building without strong filtering and search.
- Avoid AI actions that auto-execute without review unless explicitly authorized.
- Avoid hard-coding category structures that should be configurable.
- Avoid ledger functions without retry, dispute, and verification states.

---

## 9. Milestone 1 (First Build Target)

Create a **functioning DPAL HQ shell** with:

1. **Login** (or auth placeholder)
2. **Role-aware left navigation**
3. **Executive overview cards**
4. **Connected sites widget**
5. **Reports table**
6. **Alerts panel**
7. **Endpoint health panel**
8. **Placeholder drill-down pages** for each major section
9. **Backend API stubs** for the endpoint groups above

This provides a real foundation instead of a mockup-only UI.

---

*End of Series 1. Series 2 and 3 to follow.*
