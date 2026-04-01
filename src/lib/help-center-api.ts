/**
 * DPAL Help Center API — typed client for the Enterprise Dashboard.
 * Reads admin help-report endpoints from the DPAL backend.
 * Backend URL: NEXT_PUBLIC_DPAL_API_BASE
 */

const getBase = (): string =>
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_DPAL_API_BASE as string)?.trim()) || '';

const adminHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_DPAL_ADMIN_SECRET ?? ''}`,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type HelpReportStatus =
  | 'submitted' | 'under_review' | 'awaiting_contact' | 'awaiting_documents'
  | 'assigned' | 'in_progress' | 'referred_out' | 'resolved'
  | 'closed' | 'rejected' | 'duplicate';

export type HelpReportUrgency = 'low' | 'normal' | 'high' | 'urgent' | 'emergency';

export interface HelpReportRow {
  id:           string;
  reportNumber: string;
  category:     string;
  subcategory?: string;
  title:        string;
  urgency:      HelpReportUrgency;
  status:       HelpReportStatus;
  isAnonymous:  boolean;
  isDuplicate:  boolean;
  createdAt:    string;
  updatedAt:    string;
  contact?:     { fullName?: string; email?: string; phone?: string } | null;
  location?:    { city?: string; stateRegion?: string; country?: string } | null;
  attachments:  { id: string }[];
  assignments:  { assignedTo: string; team?: string }[];
  _count:       { notes: number; statusHistory: number };
}

export interface HelpReportDetail extends HelpReportRow {
  description:   string;
  tags:          string[];
  statusHistory: { id: string; oldStatus?: string; newStatus: string; changedBy: string; reason?: string; createdAt: string }[];
  notes:         { id: string; noteType: string; body: string; authorId: string; createdAt: string }[];
}

export interface AdminListResult {
  ok:   boolean;
  data: HelpReportRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  error?: string;
}

export interface HelpStatsResult {
  ok:    boolean;
  stats: {
    total:      number;
    todayCount: number;
    byStatus:   Record<string, number>;
    byUrgency:  Record<string, number>;
    byCategory: { category: string; count: number }[];
  };
  error?: string;
}

export interface AdminListParams {
  page?:       number;
  limit?:      number;
  status?:     HelpReportStatus;
  urgency?:    HelpReportUrgency;
  category?:   string;
  search?:     string;
  dateFrom?:   string;
  dateTo?:     string;
  assignedTo?: string;
  sortBy?:     'createdAt' | 'updatedAt' | 'urgency';
  sortDir?:    'asc' | 'desc';
}

// ─── API functions ─────────────────────────────────────────────────────────────

export async function getHelpReports(params: AdminListParams = {}): Promise<AdminListResult> {
  const base = getBase();
  if (!base) return { ok: false, data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 0 } };

  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null) search.set(k, String(v)); });

  try {
    const res = await fetch(`${base}/api/admin/help-reports?${search}`, {
      headers: adminHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 0 }, error: `HTTP ${res.status}` };
    return (await res.json()) as AdminListResult;
  } catch (e) {
    return { ok: false, data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 0 }, error: String(e) };
  }
}

export async function getHelpReportDetail(id: string): Promise<{ ok: boolean; report?: HelpReportDetail; error?: string }> {
  const base = getBase();
  if (!base) return { ok: false, error: 'No API base' };
  try {
    const res = await fetch(`${base}/api/admin/help-reports/${id}`, { headers: adminHeaders(), cache: 'no-store' });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return (await res.json()) as { ok: boolean; report: HelpReportDetail };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function getHelpStats(): Promise<HelpStatsResult> {
  const base = getBase();
  if (!base) return { ok: false, stats: { total: 0, todayCount: 0, byStatus: {}, byUrgency: {}, byCategory: [] } };
  try {
    const res = await fetch(`${base}/api/admin/help-reports/stats`, { headers: adminHeaders(), cache: 'no-store' });
    if (!res.ok) return { ok: false, stats: { total: 0, todayCount: 0, byStatus: {}, byUrgency: {}, byCategory: [] }, error: `HTTP ${res.status}` };
    return (await res.json()) as HelpStatsResult;
  } catch (e) {
    return { ok: false, stats: { total: 0, todayCount: 0, byStatus: {}, byUrgency: {}, byCategory: [] }, error: String(e) };
  }
}

export async function updateHelpReportStatus(id: string, status: HelpReportStatus, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const base = getBase();
  if (!base) return { ok: false, error: 'No API base' };
  try {
    const res = await fetch(`${base}/api/admin/help-reports/${id}/status`, {
      method: 'PATCH',
      headers: adminHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function addHelpReportNote(id: string, body: string, noteType = 'internal'): Promise<{ ok: boolean; error?: string }> {
  const base = getBase();
  if (!base) return { ok: false, error: 'No API base' };
  try {
    const res = await fetch(`${base}/api/admin/help-reports/${id}/note`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ body, noteType }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function assignHelpReport(id: string, assignedTo: string, team?: string): Promise<{ ok: boolean; error?: string }> {
  const base = getBase();
  if (!base) return { ok: false, error: 'No API base' };
  try {
    const res = await fetch(`${base}/api/admin/help-reports/${id}/assign`, {
      method: 'PATCH',
      headers: adminHeaders(),
      body: JSON.stringify({ assignedTo, team }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
