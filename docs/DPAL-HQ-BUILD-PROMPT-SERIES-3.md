# DPAL HQ Master Build Prompt — Series 3 of 3

## Data, Endpoints, Config, Security, and Deployment Architecture

This is the **technical backbone** so HQ can run, scale, stay secure, and remain maintainable. Series 1 = control center; Series 2 = workflow + AI + investigation; Series 3 = data, config, security, and deployment. Use this as the implementation brief for engineers and codebots.

---

## 1. Purpose of Series 3

The platform must be: **modular**, **scalable**, **secure**, **auditable**, **API-driven**, **environment-aware**, **endpoint-controlled**, **role-protected**, **future-ready**.

Define: service boundaries, config rules, database structure, endpoint registry, auth and permission layers, audit model, deployment logic, logging, monitoring, queueing, failure recovery, sync behavior between Nexus, Reports, Ledger, and HQ.

---

## 2. Master Build Prompt (Series 3)

Build the **data architecture, endpoint contract system, service integration structure, configuration model, security controls, audit infrastructure, deployment plan, and operational backbone** for the DPAL Headquarters ecosystem.

HQ must serve as the **central operational control layer** over DPAL Nexus, DPAL Reports, DPAL Ledger, evidence/media, AI task services, and future sector modules.

**Architecture must be modular and service-oriented.** Each major function should be independently maintainable while participating in a unified HQ interface, shared permissions, common audit, and secure endpoint orchestration.

**The system must support:**

1. Centralized endpoint registration and integration management  
2. Modular service-to-service communication  
3. Secure authentication and role-based authorization  
4. Full auditability of all actions and state changes  
5. Consistent data contracts and validation rules  
6. Configurable workflow and category expansion  
7. Environment-aware deployment and configuration  
8. Observability (logs, metrics, tracing, health checks)  
9. Resilience (retries, queues, fallback, sync recovery)  
10. Future integration (blockchain anchoring, external analytics, AI, city/state/country DPAL expansions)

Designed for **legal defensibility**, **public accountability**, **operational scale**, and **long-term maintainability**.

---

## 3. Recommended Architecture Model

### A. Core applications/services (logical boundaries)

- DPAL HQ Frontend  
- DPAL HQ API Gateway  
- Auth / Identity Service  
- Reports Service  
- Workflow / Triage Service  
- Investigation Service  
- Evidence / Media Service  
- Ledger / Verification Service  
- AI Orchestration Service  
- Alerts / Anomaly Service  
- Audit / Compliance Service  
- Integration / Endpoint Registry Service  
- Notification Service  
- Search / Indexing Service  
- Config / Rules Service  

Early builds can combine some of these in one backend; design as if they may later split.

### B. Request flow

**Frontend → API Gateway → Domain Service → DB / Queue / External Service**

Examples:  
- HQ UI → API Gateway → Reports Service → PostgreSQL  
- HQ UI → API Gateway → AI Service → Queue Worker → Result Store  
- HQ UI → API Gateway → Ledger Service → Blockchain Adapter  

---

## 4. Database / Data Model Guidance

### Core entities

User, Role, Permission, Session, Site, Integration, Endpoint, Report, ReportCategory, ReportSubcategory, EvidenceItem, EvidenceHash, Institution, PersonEntity, Location, Jurisdiction, Investigation, InvestigationLink, WorkflowState, TriageScore, Assignment, Alert, Anomaly, Watchlist, LedgerEntry, LedgerDecision, AIJob, AIRecommendation, VisibilityDecision, AuditEvent, ComplianceReview, Notification, ConfigRule, QueueJob, HealthSnapshot.

### Important relationships

- One Report → many EvidenceItem  
- One Report → one category, one subcategory, one jurisdiction  
- One Investigation → many reports, many linked entities  
- One AIRecommendation → one report or investigation  
- One LedgerEntry → report / evidence hash / investigation reference  
- Every sensitive state change → AuditEvent  

### Recommended stack

- **Primary:** PostgreSQL (relational integrity, audit trails, filtering, JSON where needed)  
- **Secondary:** Redis (cache, queues, short-term state, rate limits)  
- **Storage:** Object storage for evidence/media  
- **Search:** OpenSearch/Elasticsearch later for heavy global search  

**Early phase:** PostgreSQL + Redis + object storage is sufficient.

---

## 5. Config System (Three Layers)

### A. Global config

Applies to whole ecosystem: default AI provider, alert thresholds, evidence rules, ledger retry count, public/private defaults, system branding, maintenance mode, allowed file types, max upload size.

### B. Environment config

Per env (dev, staging, production, demo): API base URLs, DB URLs, secrets, queue backends, log levels, blockchain network, feature flags.

### C. Domain / rules config

Category routing rules, risk thresholds, watchlist triggers, ledger readiness criteria, evidence sufficiency thresholds, reviewer role requirements, jurisdiction-specific restrictions, publication rules. **Do not hardcode across the app.**

### Config registry categories (example)

`system.ui` | `system.auth` | `system.audit` | `system.alerts` | `system.notifications` | `workflow.routing` | `workflow.states` | `workflow.thresholds` | `reports.categories` | `reports.visibility` | `evidence.validation` | `evidence.hashing` | `ledger.networks` | `ledger.rules` | `ai.providers` | `ai.thresholds` | `integrations.registry` | `search.indexing` | `jurisdiction.rules` | `feature.flags`

---

## 6. Endpoint Registry Architecture

**Endpoint Registry Manager** should:

- Register all internal services  
- Track: service name, base URL, version, environment, auth method, health status, timeout, allowed operations, last test result, last failure  
- Allow admin test calls and enabling/disabling integrations  

**Fields per endpoint:** service key, display name, base URL, route prefix, version, auth type, token/secret ref, environment, status, timeout, retry policy, rate limit, owning module, health check path, notes.

---

## 7. Endpoint Standards

- Version: `/api/v1/...`  
- JSON request/response contracts  
- Validate all payloads  
- Return traceable error objects  
- Include request IDs  
- Include actor/user context for protected actions  
- Log all admin mutations  
- Avoid vague errors and mystery nulls  

**Example success response:**

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-03-07T12:00:00Z",
    "version": "v1"
  },
  "errors": []
}
```

**Example error response:**

```json
{
  "success": false,
  "data": null,
  "meta": {
    "requestId": "req_124",
    "timestamp": "2026-03-07T12:00:00Z",
    "version": "v1"
  },
  "errors": [
    {
      "code": "EVIDENCE_VALIDATION_FAILED",
      "message": "Evidence file type is not allowed.",
      "field": "fileType"
    }
  ]
}
```

---

## 8. Security Requirements

### A. Auth

- JWT or session-based auth for frontend  
- Refresh tokens or secure session rotation  
- Service-to-service auth for internal APIs  
- MFA support for admin roles (later)  
- Device/session visibility for users  

### B. Authorization

- RBAC plus room for policy-based controls  
- **Roles (examples):** super admin, platform admin, legal reviewer, moderator, investigator, AI reviewer, sector admin, validator, read-only auditor, jurisdiction admin  
- **Granular permissions (examples):** view restricted cases, publish case, approve ledger anchor, manage integrations, override visibility, edit workflow rules, suspend users, export audits  

### C. Security controls

Rate limiting, request validation, CSRF where needed, strict upload validation, signed URL access for media, secrets in secure store, environment separation, **audit every sensitive action**, IP/device anomaly flagging for admin, least-privilege service accounts.

---

## 9. Audit and Compliance Design

**Every important action should log:** who acted, what action, what object changed, prior state, new state, timestamp, IP/device where appropriate, AI recommendation involved or not, approval chain if relevant, reason/note if required.

**Audit event examples:** user suspended, report visibility changed, AI recommendation approved, investigation created, ledger decision rejected, endpoint disabled, evidence request sent, config threshold updated, watchlist rule changed.

**Compliance views:** filter by actor, object type, date range, action type, jurisdiction, category, severity, service/module.

---

## 10. Queue and Background Job Design

**Jobs to queue:** AI classification, duplicate detection, evidence hashing, media processing, ledger anchoring retries, anomaly computation, search index updates, notification sending, sync jobs between sites, scheduled data integrity checks.

**Every job:** job ID, type, status, attempts, created/started/completed time, failure reason, related object ID, retry policy.

---

## 11. Monitoring and Observability

**Must-have:** service health checks, endpoint response time, failed request counts, queue size, worker failures, sync lag, DB health, storage usage, alert spikes, AI task success/failure rates, ledger anchoring failures.

**Layers:** structured logs, metrics, traces, admin health dashboard, integration health panel.

---

## 12. Deployment Structure

**Environments:** local development, staging, production.

| Component   | Suggested host |
|------------|-----------------|
| Frontend   | Vercel or similar |
| Backend/API| Railway / Render / containerized VPS / Kubernetes later |
| DB         | Managed PostgreSQL |
| Cache/queues | Redis |
| Storage    | S3-compatible object storage |
| Secrets   | Environment secret manager |

---

## 13. Environment Variables (Planning)

**Core examples:**  
`NODE_ENV` | `APP_ENV` | `PORT` | `FRONTEND_URL` | `API_BASE_URL` | `DATABASE_URL` | `REDIS_URL` | `JWT_SECRET` | `REFRESH_TOKEN_SECRET` | `SESSION_SECRET` | `STORAGE_BUCKET` | `STORAGE_REGION` | `STORAGE_ACCESS_KEY` | `STORAGE_SECRET_KEY` | `AUDIT_LOG_LEVEL` | `DEFAULT_AI_PROVIDER` | `OPENAI_API_KEY` | `GEMINI_API_KEY` | `LEDGER_NETWORK` | `LEDGER_RPC_URL` | `LEDGER_PRIVATE_KEY_REF` | `INTERNAL_SERVICE_TOKEN` | `WEBHOOK_SECRET` | `MAX_UPLOAD_MB` | `FEATURE_FLAG_AI_REVIEW` | `FEATURE_FLAG_LEDGER` | `FEATURE_FLAG_INVESTIGATION_GRAPH`

---

## 14. Nexus, Reports, Ledger Integration Model

- **DPAL Reports:** intake-heavy — submissions, evidence, categorization, reporter flows, moderation queue origins.  
- **DPAL Nexus:** cross-site intelligence, public accountability layer, relationship views, discovery (permissions), institutional pattern views.  
- **DPAL Ledger:** evidence hash registry, record anchoring, verification layer, dispute/integrity state.  
- **HQ:** aggregate, control, route, supervise, audit, review, trigger actions back to each system. This relationship must be **explicit**.

---

## 15. Internal Module Names (Backend)

`auth` | `users` | `roles` | `sites` | `integrations` | `reports` | `categories` | `evidence` | `workflows` | `triage` | `investigations` | `alerts` | `anomalies` | `ledger` | `ai` | `audit` | `compliance` | `search` | `config` | `notifications` | `health`

---

## 16. Suggested Backend Folder Structure

```
/src
  /modules
    /auth
    /users
    /roles
    /sites
    /integrations
    /reports
    /evidence
    /workflows
    /triage
    /investigations
    /alerts
    /ledger
    /ai
    /audit
    /search
    /config
    /health
  /shared
    /db
    /queue
    /storage
    /security
    /validation
    /logging
    /utils
  /config
  /workers
  /scripts
```

Frontend can mirror by feature.

---

## 17. Coding Discipline

- Modules separated by domain  
- Business logic not buried in UI  
- Endpoint contracts explicit  
- Validation at boundaries  
- Config centralized  
- Permissions enforced server-side  
- Audit logging automatic for critical actions  
- Background jobs separated from request-response  
- Integrations registered and monitored  
- Every major action testable  

---

## 18. What NOT to Do (Series 3)

- Do not hardcode base URLs across the codebase.  
- Do not scatter secrets in frontend or random configs.  
- Do not let the frontend enforce permissions alone.  
- Do not build integrations without health checks and retry.  
- Do not allow silent failures for ledger or AI jobs.  
- Do not put workflow logic only in controllers; use service layers.  
- Do not create a fake audit log that misses old/new state.  
- Do not tie category logic so tightly that adding sectors is painful.  
- Do not rely only on client-side filtering for serious operational views.  
- Do not skip queue infrastructure for AI, media, and heavy jobs.  

---

## 19. Milestone 3

Build the technical backbone with:

1. Environment-aware config system  
2. API gateway or modular backend entrypoint  
3. Endpoint registry manager  
4. RBAC permissions  
5. Audit event pipeline  
6. Queue/job system  
7. Service health checks  
8. Integration settings  
9. PostgreSQL schema foundation  
10. Redis integration  
11. Storage integration  
12. Deployment-ready env file structure  

---

## 20. Full 3-Series Stack (Summary)

| Series | Focus |
|--------|--------|
| **Series 1** | HQ Control Core — dashboard, command center, sites, reports, ledger overview, alerts, users, global management |
| **Series 2** | Workflow + AI + Investigation — triage, routing, AI supervision, evidence sufficiency, investigation workspace, duplicate detection, workflow states, escalation |
| **Series 3** | Data + Endpoints + Config + Security + Deployment — data models, RBAC, audit, endpoint registry, config, queues, monitoring, deployment |

---

## 21. Recommended Build Order

1. HQ shell + auth + nav + overview  
2. Reports table + filters + case detail panel  
3. Workflow states + assignments + audit  
4. Alerts + endpoint registry + health  
5. AI recommendation drawer  
6. Ledger decision and evidence verification  
7. Investigation graph / pattern detection  
8. Advanced config/rules editor  

---

## 22. Combined Master Prompt (paste-ready for codebots / team lead)

Build a production-grade DPAL Headquarters platform as the central command, workflow, investigation, and technical control center for the DPAL ecosystem.

The headquarters must securely integrate and supervise DPAL Nexus, DPAL Reports, DPAL Ledger, evidence/media systems, AI task systems, and future DPAL sector modules.

This software must include:

1. **An enterprise-grade HQ control dashboard** (Series 1 — control center, sites, reports, ledger overview, alerts, users, global management).  
2. **A workflow, triage, AI, and investigation engine** (Series 2 — triage, routing, AI supervision, evidence sufficiency, investigation workspace, duplicate detection, workflow states, escalation).  
3. **A modular technical architecture** with endpoint registry, config system, RBAC, audit, queueing, and deployment support (Series 3).

The platform must support:

- Executive overview and site monitoring  
- Reports and incident control  
- Evidence management and verification  
- Ledger anchoring and dispute workflows  
- AI recommendations with human approval  
- Investigation timelines and linked-entity analysis  
- Alerts, anomalies, and watchlists  
- Role-based access control  
- Centralized integration and endpoint management  
- Configurable workflow and category rules  
- Full auditability and compliance visibility  
- Scalable deployment across environments  

This is not a generic admin panel. It is a serious operations platform for public accountability, legal defensibility, intelligent review workflows, and cross-system control.

---

## 23. Build order (blunt recommendation)

Build in this order:

1. HQ shell + auth + nav + overview  
2. Reports table + filters + case detail panel  
3. Workflow states + assignments + audit  
4. Alerts + endpoint registry + health  
5. AI recommendation drawer  
6. Ledger decision and evidence verification  
7. Investigation graph / pattern detection  
8. Advanced config/rules editor  

---

*End of Series 3. Full 3-series build packet complete.*
