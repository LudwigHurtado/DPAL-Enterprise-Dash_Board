/**
 * DPAL HQ Series 3 — Architecture, config, and contract references.
 * See docs/DPAL-HQ-BUILD-PROMPT-SERIES-3.md.
 */

/** Config registry categories (domain/rules). Do not hardcode rules in app code. */
export const HQ_CONFIG_CATEGORIES = [
  'system.ui',
  'system.auth',
  'system.audit',
  'system.alerts',
  'system.notifications',
  'workflow.routing',
  'workflow.states',
  'workflow.thresholds',
  'reports.categories',
  'reports.visibility',
  'evidence.validation',
  'evidence.hashing',
  'ledger.networks',
  'ledger.rules',
  'ai.providers',
  'ai.thresholds',
  'integrations.registry',
  'search.indexing',
  'jurisdiction.rules',
  'feature.flags',
] as const;

/** Standard API success response shape (v1). */
export interface HQApiResponse<T = unknown> {
  success: true;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
  };
  errors: [];
}

/** Standard API error response shape (v1). */
export interface HQApiErrorResponse {
  success: false;
  data: null;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
  };
  errors: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}

/** Environment variables the backend should plan for (reference). */
export const HQ_ENV_VARS = [
  'NODE_ENV',
  'APP_ENV',
  'PORT',
  'FRONTEND_URL',
  'API_BASE_URL',
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'SESSION_SECRET',
  'STORAGE_BUCKET',
  'STORAGE_REGION',
  'STORAGE_ACCESS_KEY',
  'STORAGE_SECRET_KEY',
  'AUDIT_LOG_LEVEL',
  'DEFAULT_AI_PROVIDER',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'LEDGER_NETWORK',
  'LEDGER_RPC_URL',
  'LEDGER_PRIVATE_KEY_REF',
  'INTERNAL_SERVICE_TOKEN',
  'WEBHOOK_SECRET',
  'MAX_UPLOAD_MB',
  'FEATURE_FLAG_AI_REVIEW',
  'FEATURE_FLAG_LEDGER',
  'FEATURE_FLAG_INVESTIGATION_GRAPH',
] as const;

/** Internal backend module names (for folder/organization). */
export const HQ_MODULES = [
  'auth',
  'users',
  'roles',
  'sites',
  'integrations',
  'reports',
  'categories',
  'evidence',
  'workflows',
  'triage',
  'investigations',
  'alerts',
  'anomalies',
  'ledger',
  'ai',
  'audit',
  'compliance',
  'search',
  'config',
  'notifications',
  'health',
] as const;

/** Endpoint registry entry fields (Endpoint Registry Manager). */
export interface HQEndpointRegistryEntry {
  serviceKey: string;
  displayName: string;
  baseUrl: string;
  routePrefix?: string;
  version?: string;
  authType?: string;
  tokenRef?: string;
  environment?: string;
  status?: string;
  timeout?: number;
  retryPolicy?: string;
  rateLimit?: string;
  ownedByModule?: string;
  healthCheckPath?: string;
  notes?: string;
}
