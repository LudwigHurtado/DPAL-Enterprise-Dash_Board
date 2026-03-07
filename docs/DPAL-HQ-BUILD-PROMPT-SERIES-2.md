# DPAL HQ Master Build Prompt — Series 2 of 3

## Workflow + AI + Investigation Engine

This is the **operational brain** of DPAL HQ. Series 1 defined the control center structure; Series 2 defines how HQ **behaves**: decision, routing, triage, investigation, and AI workflow. Use this as the build packet for engineers and codebots.

---

## 1. Purpose of Series 2

Make DPAL HQ function as:

- An **intelligent case-routing engine**
- An **AI-assisted review center**
- An **investigation workspace**
- A **jurisdiction-aware escalation tool**
- A **human-supervised automation system**

It must answer: *what came in, how serious it is, where it goes, who should review it, what AI can do first, what humans must approve, what gets written to the ledger, what should be escalated, what patterns are developing.*

---

## 2. Master Build Prompt (Series 2)

Build the **workflow, AI orchestration, triage, investigation, escalation, and case-routing engine** for the DPAL Headquarters platform.

This system must transform incoming reports, evidence, events, alerts, and cross-platform signals into **structured workflows** that can be reviewed, assigned, escalated, verified, investigated, anchored to the ledger, or routed into Nexus or related DPAL systems.

The platform must support both **human-driven** and **AI-assisted** operations. **AI must remain supervised and reviewable** unless a specific low-risk workflow is explicitly approved for automated execution.

### Workflow engine must

1. Intake data from all connected DPAL systems
2. Classify and score incoming reports
3. Detect urgency, risk, duplicates, and evidence sufficiency
4. Determine routing logic by category, severity, jurisdiction, and workflow stage
5. Assign or recommend reviewers, moderators, investigators, or legal teams
6. Support evidence requests, dispute states, and verification checkpoints
7. Surface patterns, linked cases, repeated names, and anomaly clusters
8. Create auditable task flows for human and AI action
9. Manage approval gates before publication, ledger anchoring, or escalation
10. Support expansion into many categories, cities, agencies, and jurisdictions

**Include:** report triage engine, AI classification and recommendation engine, evidence sufficiency logic, duplicate and pattern detection, jurisdiction and role-aware routing, case escalation workflows, human approval gates, investigation timeline builder, linked-entity analysis, review queues and task assignment, dispute resolution workflows, ledger anchoring decision workflow, publication and visibility state management. **All actions and recommendations must be traceable and auditable.**

---

## 3. What the Workflow Engine Must Do

### A. Intake pipeline

Every item entering HQ goes through a **structured intake flow**.

**Sources:** public DPAL submissions, Nexus referrals, moderator escalations, AI-detected anomalies, duplicate/cluster detection, imported legacy records, ledger mismatch events, system alerts, institution watchlist hits, cross-category correlations.

**Intake fields (minimum):** intake source, report/event type, category, subcategory, jurisdiction, date submitted, submitter status, urgency indicators, evidence attached, named parties, institution named, location data, AI preliminary score, status, current workflow stage.

### B. Triage engine

Scores each case across dimensions and decides what gets attention first.

**Score dimensions:** urgency, harm severity, public safety impact, evidence completeness, credibility signals, repeat occurrence indicators, institution sensitivity, jurisdictional priority, legal exposure potential, media/viral sensitivity, child/vulnerable person factor, pattern/cluster significance.

**Output:** priority score, recommended queue, suggested reviewer type, estimated next action, escalation recommendation, confidence level, auto-flags.

**Example queues:** urgent human review, moderation review, evidence-needed, legal classification, ledger-ready review, AI enrichment queue, duplicate review, investigation queue, dispute queue, publish-ready queue.

### C. AI workflow engine

AI helps with: classification, summarization, duplicate detection, entity extraction, risk scoring, suggested tags/category/subcategory/next action, translation, evidence description, timeline drafting, cross-report linking, institution pattern recognition, policy/rule matching, moderation assistance.

**Human controls required:** approve, reject, modify, re-run, compare multiple AI recommendations, show confidence score, show why recommendation was made, **record reviewer decision** (e.g. “AI suggested X, human approved Y”).

---

## 4. Workflow Stages (State Model)

States should be part of **backend workflow logic**, not loose labels:

| State | Description |
|-------|-------------|
| new | Just received |
| intake-validated | Passed intake checks |
| pending-ai-review | Waiting for AI processing |
| pending-human-triage | Needs human triage |
| pending-evidence | Evidence requested |
| evidence-under-review | Evidence being reviewed |
| duplicate-suspected | Possible duplicate |
| pending-moderator-review | In moderation queue |
| pending-legal-review | In legal queue |
| pending-investigation | Under investigation |
| pending-ledger-review | Ready for ledger review |
| pending-ledger-anchor | Approved for anchor |
| anchored | On ledger |
| published | Public |
| restricted | Visibility restricted |
| disputed | In dispute |
| resolved | Closed resolved |
| archived | Archived |
| escalated-external | Sent to external system |
| rejected | Rejected |

---

## 5. Investigation Engine Requirements

Investigators must build a **case story**, not just open reports one by one.

**Investigation workspace must support:** timeline of events, linked reports, linked people, linked institutions, linked locations, repeated evidence hashes, repeated user submissions, repeated accused entities, map view, relationship graph, note-taking, case bundling, assign subtasks, create theory of case, flag corroboration or conflict, **export investigation packet**.

**Correlation examples:** one school in 12 reports; same officer in 5 incidents; same evidence image hash in 3 submissions; same institution rising trend in one county; two users reporting same event; same pattern across city and county.

---

## 6. Routing Logic

Route cases based on **rules**. Factors: category, subcategory, urgency, location, state/county/city, public/private visibility, evidence completeness, minors involved, institution on watchlist, repeat-offender patterns, legal sensitivity, moderation status, ledger readiness, AI confidence, dispute status.

**Example behavior:**

- urgent + strong evidence + public safety risk → immediate human escalation
- weak evidence + high seriousness → evidence request + restricted visibility
- repeated institution pattern → anomaly + investigation queue
- duplicate probable → duplicate review before publication
- strong verified evidence → ledger anchoring review
- child safety related → restricted workflow + specialized reviewer route

---

## 7. Endpoint Groups (Series 2)

### A. Intake / Triage

- `POST /api/intake/report` | `POST /api/intake/event` | `POST /api/intake/bulk`
- `GET /api/intake/:itemId`
- `POST /api/triage/score/:itemId` | `POST /api/triage/recalculate/:itemId`
- `GET /api/triage/queues` | `GET /api/triage/queues/:queueId`

### B. Workflow State / Routing

- `GET /api/workflows` | `GET /api/workflows/:workflowId`
- `PATCH /api/workflows/:itemId/state`
- `POST /api/workflows/:itemId/route` | `assign` | `escalate` | `restrict` | `publish-ready`

### C. AI Operations

- `POST /api/ai/classify/:itemId` | `summarize/:itemId` | `extract-entities/:itemId` | `detect-duplicates/:itemId` | `risk-score/:itemId` | `recommend-route/:itemId` | `build-timeline/:itemId` | `link-related/:itemId`
- `GET /api/ai/recommendations/:itemId`
- `POST /api/ai/recommendations/:itemId/approve` | `reject` | `modify`

### D. Investigation

- `GET /api/investigations` | `POST /api/investigations`
- `GET /api/investigations/:investigationId` | `PATCH ...`
- `POST /api/investigations/:investigationId/add-item` | `add-note` | `add-link`
- `GET /api/investigations/:investigationId/timeline` | `graph`
- `POST /api/investigations/:investigationId/export`

### E. Duplicate / Correlation / Pattern

- `GET /api/duplicates` | `GET /api/duplicates/:itemId` | `POST /api/duplicates/:itemId/resolve`
- `GET /api/correlations/:entityId`
- `GET /api/patterns` | `GET /api/patterns/clusters` | `GET /api/patterns/trends` | `POST /api/patterns/recompute`

### F. Evidence Sufficiency / Review

- `GET /api/evidence-review/queues`
- `POST /api/evidence-review/:itemId/check` | `request-more` | `approve` | `reject`
- `GET /api/evidence-review/:itemId/status`

### G. Publication / Restriction / Visibility

- `POST /api/visibility/:itemId/set-public` | `set-private` | `set-restricted`
- `GET /api/visibility/:itemId`
- `POST /api/publication/:itemId/submit` | `approve` | `reject`

### H. Ledger Decision Workflow

- `POST /api/ledger-decision/:itemId/check-readiness` | `approve` | `reject` | `dispute`
- `GET /api/ledger-decision/:itemId/status`

---

## 8. What Must Appear on the Page (Series 2)

### A. Triage queue board

Columns or tabs: **urgent** | **evidence needed** | **AI pending** | **human review** | **legal review** | **duplicate review** | **investigation** | **ledger review** | **ready to publish** | **disputed**.

Each card/row: report title or ID, category, location, urgency, evidence score, AI confidence, assigned reviewer, age in queue, flags.

### B. AI recommendation drawer

When a case is opened, show: AI summary, suggested category, suggested tags, risk score, similar cases, duplicate likelihood, proposed workflow route, recommended next step, confidence indicators, **approve / reject / edit** buttons.

### C. Investigation board

Event timeline, evidence panel, linked entities, relationship graph, map, notes, internal tasks, watchlist hits, trend history.

### D. Workflow timeline

Every case: clear history (submitted → validated → AI classified → moderator reviewed → evidence requested → … → anchored → published). **Exportable and audit-friendly.**

---

## 9. Decision Rules (Configurable)

Support **configurable decision rules**, not hardcoded logic. Examples:

- IF urgency_score >= 90 THEN route to urgent_human_review
- IF evidence_score < 40 AND severity_score > 75 THEN request_more_evidence AND restrict_visibility
- IF duplicate_probability >= 85 THEN hold_publication AND send_to_duplicate_review
- IF institution_watchlist_hit = true THEN add_anomaly_flag
- IF child_or_vulnerable_person_flag = true THEN restrict_access AND route_to_specialized_review_queue
- IF ai_confidence < threshold THEN require_human_triage
- IF ledger_readiness = true AND moderator_approved = true THEN send_to_ledger_decision_queue

---

## 10. Workflow Quality (Explainability)

A reviewer must always be able to answer:

- Why this case was routed here
- Who touched it
- What AI suggested
- What evidence existed at the time
- Why publication was allowed or denied
- Why a ledger action was approved or blocked
- Why a case was escalated, restricted, or merged

**Do not:** build black-box workflow behavior; hide routing logic; allow silent state changes without logging; allow AI to overwrite human-reviewed states without permissions.

---

## 11. Data Objects to Define

- **CaseItem** | **TriageScore** | **WorkflowState** | **AIRecommendation** | **EvidenceAssessment** | **InvestigationBundle** | **LinkedEntity** | **PatternCluster** | **VisibilityDecision** | **LedgerDecision** | **AuditEvent** | **ReviewerAssignment**

---

## 12. What NOT to Build

- Do not reduce the workflow system to a simple support ticket pipeline.
- Do not let AI auto-publish serious items.
- Do not create unexplained priority scores.
- Do not create workflow states that are not auditable.
- Do not bury duplicate or pattern detection as a side feature.
- Do not separate investigations from reports so much that linking becomes hard.
- Do not build visibility without clear public/private/restricted logic.
- Do not make routing depend on one category only; it must scale across all DPAL sectors.

---

## 13. Milestone 2

Build a **working workflow engine** with:

1. Intake normalization
2. Triage scoring
3. Queue board
4. AI recommendation drawer
5. Human approval actions
6. Workflow state changes
7. Basic investigation workspace
8. Duplicate detection placeholder
9. Ledger readiness decision panel
10. Full audit log capture

That gives you the **engine room**.

---

*End of Series 2. Series 3 to follow.*
