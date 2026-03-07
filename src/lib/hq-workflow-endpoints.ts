/**
 * DPAL HQ Series 2 — Workflow, AI, Investigation endpoint map.
 * See docs/DPAL-HQ-BUILD-PROMPT-SERIES-2.md.
 */

export const HQ_WORKFLOW_ENDPOINTS = {
  intake: {
    report: 'POST /api/intake/report',
    event: 'POST /api/intake/event',
    bulk: 'POST /api/intake/bulk',
    get: 'GET /api/intake/:itemId',
  },
  triage: {
    score: 'POST /api/triage/score/:itemId',
    recalculate: 'POST /api/triage/recalculate/:itemId',
    queues: 'GET /api/triage/queues',
    queue: 'GET /api/triage/queues/:queueId',
  },
  workflows: {
    list: 'GET /api/workflows',
    get: 'GET /api/workflows/:workflowId',
    setState: 'PATCH /api/workflows/:itemId/state',
    route: 'POST /api/workflows/:itemId/route',
    assign: 'POST /api/workflows/:itemId/assign',
    escalate: 'POST /api/workflows/:itemId/escalate',
    restrict: 'POST /api/workflows/:itemId/restrict',
    publishReady: 'POST /api/workflows/:itemId/publish-ready',
  },
  aiOperations: {
    classify: 'POST /api/ai/classify/:itemId',
    summarize: 'POST /api/ai/summarize/:itemId',
    extractEntities: 'POST /api/ai/extract-entities/:itemId',
    detectDuplicates: 'POST /api/ai/detect-duplicates/:itemId',
    riskScore: 'POST /api/ai/risk-score/:itemId',
    recommendRoute: 'POST /api/ai/recommend-route/:itemId',
    buildTimeline: 'POST /api/ai/build-timeline/:itemId',
    linkRelated: 'POST /api/ai/link-related/:itemId',
    recommendations: 'GET /api/ai/recommendations/:itemId',
    approveRecommendation: 'POST /api/ai/recommendations/:itemId/approve',
    rejectRecommendation: 'POST /api/ai/recommendations/:itemId/reject',
    modifyRecommendation: 'POST /api/ai/recommendations/:itemId/modify',
  },
  investigations: {
    list: 'GET /api/investigations',
    create: 'POST /api/investigations',
    get: 'GET /api/investigations/:investigationId',
    update: 'PATCH /api/investigations/:investigationId',
    addItem: 'POST /api/investigations/:investigationId/add-item',
    addNote: 'POST /api/investigations/:investigationId/add-note',
    addLink: 'POST /api/investigations/:investigationId/add-link',
    timeline: 'GET /api/investigations/:investigationId/timeline',
    graph: 'GET /api/investigations/:investigationId/graph',
    export: 'POST /api/investigations/:investigationId/export',
  },
  duplicates: {
    list: 'GET /api/duplicates',
    get: 'GET /api/duplicates/:itemId',
    resolve: 'POST /api/duplicates/:itemId/resolve',
  },
  correlations: {
    entity: 'GET /api/correlations/:entityId',
  },
  patterns: {
    list: 'GET /api/patterns',
    clusters: 'GET /api/patterns/clusters',
    trends: 'GET /api/patterns/trends',
    recompute: 'POST /api/patterns/recompute',
  },
  evidenceReview: {
    queues: 'GET /api/evidence-review/queues',
    check: 'POST /api/evidence-review/:itemId/check',
    requestMore: 'POST /api/evidence-review/:itemId/request-more',
    approve: 'POST /api/evidence-review/:itemId/approve',
    reject: 'POST /api/evidence-review/:itemId/reject',
    status: 'GET /api/evidence-review/:itemId/status',
  },
  visibility: {
    setPublic: 'POST /api/visibility/:itemId/set-public',
    setPrivate: 'POST /api/visibility/:itemId/set-private',
    setRestricted: 'POST /api/visibility/:itemId/set-restricted',
    get: 'GET /api/visibility/:itemId',
  },
  publication: {
    submit: 'POST /api/publication/:itemId/submit',
    approve: 'POST /api/publication/:itemId/approve',
    reject: 'POST /api/publication/:itemId/reject',
  },
  ledgerDecision: {
    checkReadiness: 'POST /api/ledger-decision/:itemId/check-readiness',
    approve: 'POST /api/ledger-decision/:itemId/approve',
    reject: 'POST /api/ledger-decision/:itemId/reject',
    dispute: 'POST /api/ledger-decision/:itemId/dispute',
    status: 'GET /api/ledger-decision/:itemId/status',
  },
} as const;

/** Workflow stages (state model) — align backend to these */
export const WORKFLOW_STAGES = [
  'new',
  'intake-validated',
  'pending-ai-review',
  'pending-human-triage',
  'pending-evidence',
  'evidence-under-review',
  'duplicate-suspected',
  'pending-moderator-review',
  'pending-legal-review',
  'pending-investigation',
  'pending-ledger-review',
  'pending-ledger-anchor',
  'anchored',
  'published',
  'restricted',
  'disputed',
  'resolved',
  'archived',
  'escalated-external',
  'rejected',
] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];
