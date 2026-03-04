/**
 * DPAL Nexus API client for Enterprise Dashboard and ops.
 * Uses NEXT_PUBLIC_DPAL_API_BASE; all functions handle missing base / errors.
 */

const getBase = (): string =>
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_DPAL_API_BASE as string)?.trim()) || '';

export type HealthResult = {
  ok: boolean;
  status: number;
  latencyMs: number;
  body?: Record<string, unknown>;
};

export async function checkHealth(apiBase?: string): Promise<HealthResult> {
  const base = apiBase || getBase();
  if (!base) {
    return { ok: false, status: 0, latencyMs: 0 };
  }
  const start = performance.now();
  try {
    const res = await fetch(`${base}/health`, { method: 'GET', cache: 'no-store' });
    const latencyMs = Math.round(performance.now() - start);
    let body: Record<string, unknown> | undefined;
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      // ignore
    }
    return {
      ok: res.ok,
      status: res.status,
      latencyMs,
      body,
    };
  } catch {
    return { ok: false, status: 0, latencyMs: Math.round(performance.now() - start) };
  }
}

export type ReportItem = {
  reportId: string;
  title: string;
  description?: string;
  severity?: string;
  opsStatus?: string;
  location?: string;
  channel?: string;
  category?: string;
  entityType?: string;
  entityName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ReportsFeedResult = {
  ok: boolean;
  items: ReportItem[];
  total?: number;
  error?: string;
};

export async function getReportsFeed(params: {
  limit?: number;
  entityType?: string;
  entityName?: string;
  status?: string;
} = {}): Promise<ReportsFeedResult> {
  const base = getBase();
  if (!base) {
    return { ok: false, items: [] };
  }
  const search = new URLSearchParams();
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.entityType) search.set('entityType', params.entityType);
  if (params.entityName) search.set('entityName', params.entityName);
  if (params.status) search.set('status', params.status);
  try {
    const res = await fetch(`${base}/api/reports/feed?${search.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      return { ok: false, items: [], error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { items?: unknown[]; total?: number };
    const items = Array.isArray(data?.items) ? (data.items as ReportItem[]) : [];
    return { ok: true, items, total: data?.total };
  } catch (e) {
    return {
      ok: false,
      items: [],
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}

export type ProbeResult = {
  name: string;
  ok: boolean;
  latencyMs: number;
  status?: number;
};

export async function runProbes(apiBase?: string): Promise<ProbeResult[]> {
  const base = apiBase || getBase();
  if (!base) {
    return [
      { name: 'health', ok: false, latencyMs: 0 },
      { name: 'reportsFeed', ok: false, latencyMs: 0 },
    ];
  }

  const probe = async (
    name: string,
    fn: () => Promise<Response>
  ): Promise<ProbeResult> => {
    const start = performance.now();
    try {
      const res = await fn();
      const latencyMs = Math.round(performance.now() - start);
      return { name, ok: res.ok, latencyMs, status: res.status };
    } catch {
      return { name, ok: false, latencyMs: Math.round(performance.now() - start) };
    }
  };

  const [health, reportsFeed] = await Promise.all([
    probe('health', () => fetch(`${base}/health`, { cache: 'no-store' })),
    probe('reportsFeed', () =>
      fetch(`${base}/api/reports/feed?limit=5`, { cache: 'no-store' })
    ),
  ]);

  return [health, reportsFeed];
}

export function getApiBase(): string {
  return getBase();
}
