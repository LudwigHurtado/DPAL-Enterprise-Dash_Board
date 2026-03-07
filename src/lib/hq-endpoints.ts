/**
 * DPAL HQ endpoint map — Series 1 build packet.
 * Use these paths with your API base; implement stubs on backend until live.
 * See docs/DPAL-HQ-BUILD-PROMPT-SERIES-1.md.
 */

export const HQ_ENDPOINTS = {
  auth: {
    login: 'POST /api/auth/login',
    logout: 'POST /api/auth/logout',
    me: 'GET /api/auth/me',
    refresh: 'POST /api/auth/refresh',
    roles: 'GET /api/auth/roles',
  },
  hq: {
    overview: 'GET /api/hq/overview',
    kpis: 'GET /api/hq/kpis',
    activityFeed: 'GET /api/hq/activity-feed',
    globalStatus: 'GET /api/hq/global-status',
    connectedSites: 'GET /api/hq/connected-sites',
  },
  sites: {
    list: 'GET /api/sites',
    get: 'GET /api/sites/:siteId',
    health: 'GET /api/sites/:siteId/health',
    metrics: 'GET /api/sites/:siteId/metrics',
    errors: 'GET /api/sites/:siteId/errors',
    sync: 'POST /api/sites/:siteId/sync',
    restartJob: 'POST /api/sites/:siteId/restart-job',
  },
  reports: {
    list: 'GET /api/reports',
    get: 'GET /api/reports/:reportId',
    create: 'POST /api/reports',
    update: 'PATCH /api/reports/:reportId',
    assign: 'POST /api/reports/:reportId/assign',
    escalate: 'POST /api/reports/:reportId/escalate',
    requestEvidence: 'POST /api/reports/:reportId/request-evidence',
    publish: 'POST /api/reports/:reportId/publish',
    hide: 'POST /api/reports/:reportId/hide',
    anchor: 'POST /api/reports/:reportId/anchor',
    filterOptions: 'GET /api/reports/filters/options',
    stats: 'GET /api/reports/stats',
  },
  evidence: {
    list: 'GET /api/evidence',
    get: 'GET /api/evidence/:evidenceId',
    upload: 'POST /api/evidence/upload',
    hash: 'POST /api/evidence/:evidenceId/hash',
    verification: 'GET /api/evidence/:evidenceId/verification',
    requestReview: 'POST /api/evidence/:evidenceId/request-review',
  },
  ledger: {
    entries: 'GET /api/ledger/entries',
    entry: 'GET /api/ledger/entries/:entryId',
    anchor: 'POST /api/ledger/anchor',
    pending: 'GET /api/ledger/pending',
    disputed: 'GET /api/ledger/disputed',
    validators: 'GET /api/ledger/validators',
    networksStatus: 'GET /api/ledger/networks/status',
    retry: 'POST /api/ledger/retry/:entryId',
    audit: 'GET /api/ledger/audit/:referenceId',
  },
  users: {
    list: 'GET /api/users',
    get: 'GET /api/users/:userId',
    update: 'PATCH /api/users/:userId',
    suspend: 'POST /api/users/:userId/suspend',
    reinstate: 'POST /api/users/:userId/reinstate',
    setRole: 'POST /api/users/:userId/role',
    audit: 'GET /api/users/:userId/audit',
  },
  roles: {
    list: 'GET /api/roles',
  },
  permissions: {
    list: 'GET /api/permissions',
  },
  alerts: {
    list: 'GET /api/alerts',
    get: 'GET /api/alerts/:alertId',
    acknowledge: 'POST /api/alerts/:alertId/acknowledge',
    escalate: 'POST /api/alerts/:alertId/escalate',
  },
  watchlists: {
    list: 'GET /api/watchlists',
    create: 'POST /api/watchlists',
    update: 'PATCH /api/watchlists/:watchlistId',
  },
  anomalies: {
    list: 'GET /api/anomalies',
  },
  ai: {
    tasks: 'GET /api/ai/tasks',
    createTask: 'POST /api/ai/tasks',
    task: 'GET /api/ai/tasks/:taskId',
    classifyReport: 'POST /api/ai/classify-report/:reportId',
    detectDuplicates: 'POST /api/ai/detect-duplicates',
    summarize: 'POST /api/ai/summarize/:reportId',
    riskScore: 'POST /api/ai/risk-score/:reportId',
    recommendActions: 'POST /api/ai/recommend-actions/:reportId',
    approve: 'POST /api/ai/approve/:taskId',
    reject: 'POST /api/ai/reject/:taskId',
  },
  search: {
    global: 'GET /api/search/global',
    reports: 'GET /api/search/reports',
    users: 'GET /api/search/users',
    institutions: 'GET /api/search/institutions',
    ledger: 'GET /api/search/ledger',
    evidence: 'GET /api/search/evidence',
  },
  correlation: {
    entity: 'GET /api/correlation/:entityId',
  },
  audit: {
    logs: 'GET /api/audit/logs',
    actions: 'GET /api/audit/actions',
    export: 'GET /api/audit/export',
  },
  compliance: {
    events: 'GET /api/compliance/events',
    exceptions: 'GET /api/compliance/exceptions',
    review: 'POST /api/compliance/review/:itemId',
  },
  integrations: {
    list: 'GET /api/integrations',
    get: 'GET /api/integrations/:integrationId',
    test: 'POST /api/integrations/:integrationId/test',
    update: 'PATCH /api/integrations/:integrationId',
  },
  endpoints: {
    list: 'GET /api/endpoints',
    health: 'GET /api/endpoints/health',
    reload: 'POST /api/endpoints/reload',
  },
} as const;

/** Build full URL for an endpoint path (path only, e.g. "GET /api/hq/overview") */
export function hqPath(path: string): string {
  const methodPath = path.replace(/^(GET|POST|PATCH|PUT|DELETE)\s+/i, '');
  return methodPath;
}
