'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  checkHealth,
  getReportsFeed,
  getApiBase,
  runProbes,
  type HealthResult,
  type ProbeResult,
  type ReportItem,
} from '@/src/lib/dpal-api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const STORAGE_KEY = 'dpal_api_base_override';

type TabId = 'overview' | 'intelligence' | 'reports' | 'investigations' | 'audit' | 'quality' | 'sites' | 'alerts';

const STATUS_COLORS: Record<string, string> = {
  New: '#f29900',
  Investigating: '#1a73e8',
  'Action Taken': '#9334e6',
  Resolved: '#1e8e3e',
};

type UrgencyLevel = 'critical' | 'warning' | 'dispute' | 'escalation' | 'resolved' | 'neutral';
function urgencyForReport(r: ReportItem): UrgencyLevel {
  const status = r.opsStatus || 'New';
  const severity = (r.severity || '').toLowerCase();
  if (status === 'Resolved') return 'resolved';
  if (severity === 'critical' || severity === 'high') return 'critical';
  if (status === 'Action Taken') return 'dispute';
  if (status === 'New') return 'warning';
  if (status === 'Investigating') return 'escalation';
  return 'neutral';
}

function UrgencyBadge({ level, label }: { level: UrgencyLevel; label: string }) {
  return <span className={`hq-badge hq-badge-${level}`}>{label}</span>;
}

function Card({
  title,
  children,
  right,
  icon,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`md-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface)] px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-[var(--md-sys-primary-container)] text-[var(--md-sys-primary)]">
              {icon}
            </div>
          )}
          <h2 className="md-title-medium">{title}</h2>
        </div>
        {right}
      </div>
      <div className="bg-[var(--md-sys-surface)] p-4 sm:p-6">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="md-label-medium mb-3 uppercase tracking-wider text-[var(--md-sys-on-surface-variant)]">
      {children}
    </h3>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 md-label-medium ${
        ok ? 'border-[var(--md-sys-success)]/30 bg-[var(--md-sys-success-container)] text-[var(--md-sys-success)]' : 'border-[var(--md-sys-error)]/30 bg-[var(--md-sys-error-container)] text-[var(--md-sys-error)]'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${ok ? 'bg-[var(--md-sys-success)]' : 'bg-[var(--md-sys-error)]'}`} />
      {label ?? (ok ? 'Healthy' : 'Down')}
    </span>
  );
}

function EmptyState({ message, submessage }: { message: string; submessage?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center sm:py-16">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--md-sys-surface-container-high)] text-[var(--md-sys-outline)]">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p className="md-body-large text-[var(--md-sys-on-surface)]">{message}</p>
      {submessage && <p className="md-body-medium mt-1">{submessage}</p>}
    </div>
  );
}

export default function MasterEnterpriseDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [apiBaseOverride, setApiBaseOverride] = useState('');
  const [apiBaseInput, setApiBaseInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiBase, setApiBase] = useState('');
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [probes, setProbes] = useState<ProbeResult[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [probesLoading, setProbesLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string } | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  const showSnackbar = useCallback((message: string) => {
    setSnackbar({ message });
    const t = setTimeout(() => setSnackbar(null), 4000);
    return () => clearTimeout(t);
  }, []);

  const effectiveBase = apiBaseOverride || getApiBase();
  const configSource = apiBaseOverride ? 'browser' : (getApiBase() ? 'env' : null);

  const refresh = useCallback(async (overrideBase?: string) => {
    const base = overrideBase ?? effectiveBase;
    setApiBase(base);
    setError(null);
    setLoading(true);
    try {
      const [healthRes, feedRes, probesRes] = await Promise.all([
        base ? checkHealth(base) : Promise.resolve(null),
        getReportsFeed({ limit: 200, apiBase: base || undefined }),
        base ? runProbes(base) : Promise.resolve([]),
      ]);
      if (healthRes) setHealth(healthRes);
      if (feedRes.ok) setReports(feedRes.items);
      else if (feedRes.error) setError(feedRes.error);
      setProbes(probesRes);
      setLastSync(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  }, [effectiveBase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setApiBaseOverride(saved);
      setApiBaseInput(saved);
      refresh(saved);
    } else {
      const envBase = getApiBase();
      if (envBase) refresh(envBase);
      else setSettingsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!effectiveBase) return;
    const interval = setInterval(() => refresh(), 60_000);
    return () => clearInterval(interval);
  }, [effectiveBase, refresh]);

  const connectApi = () => {
    const url = apiBaseInput.trim().replace(/\/$/, '');
    if (url) {
      setApiBaseOverride(url);
      setTestResult(null);
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, url);
      setSettingsOpen(false);
      refresh(url);
      showSnackbar('API connected');
    }
  };

  const testConnection = async () => {
    const url = apiBaseInput.trim().replace(/\/$/, '');
    if (!url) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await checkHealth(url);
      setTestResult(
        res.ok
          ? { ok: true, message: `Connection OK (${res.status} in ${res.latencyMs} ms)` }
          : { ok: false, message: `HTTP ${res.status} in ${res.latencyMs} ms` }
      );
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const clearApiOverride = () => {
    setApiBaseOverride('');
    setApiBaseInput(getApiBase());
    setTestResult(null);
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    setSettingsOpen(false);
    refresh(getApiBase());
  };

  const runProbesNow = async () => {
    if (!effectiveBase) return;
    setProbesLoading(true);
    try {
      const res = await runProbes(effectiveBase);
      setProbes(res);
      const healthRes = await checkHealth(effectiveBase);
      setHealth(healthRes);
      setLastSync(new Date());
    } finally {
      setProbesLoading(false);
    }
  };

  const exportCsv = () => {
    const headers = ['reportId', 'title', 'description', 'severity', 'opsStatus', 'location', 'entityName', 'createdAt', 'updatedAt'];
    const row = (r: ReportItem) =>
      headers.map((h) => {
        const v = (r as Record<string, unknown>)[h];
        const s = typeof v === 'string' ? v.replace(/"/g, '""') : (v ?? '');
        return `"${s}"`;
      }).join(',');
    const csv = [headers.join(','), ...reports.map(row)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dpal-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showSnackbar('CSV exported');
  };

  const filteredReports = React.useMemo(() => {
    if (!statusFilter) return reports;
    return reports.filter((r) => (r.opsStatus || 'New') === statusFilter);
  }, [reports, statusFilter]);

  const byStatus = React.useMemo(() => {
    const map: Record<string, number> = {};
    reports.forEach((r) => {
      const s = r.opsStatus || 'New';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [reports]);

  const bySeverity = React.useMemo(() => {
    const map: Record<string, number> = {};
    reports.forEach((r) => {
      const s = r.severity || 'Moderate';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const qualityMetrics = React.useMemo(() => {
    const total = reports.length;
    if (total === 0)
      return {
        withTitle: 0,
        withLocation: 0,
        withDescription: 0,
        incomplete: 0,
        pctComplete: 0,
      };
    const withTitle = reports.filter((r) => r.title?.trim()).length;
    const withLocation = reports.filter((r) => r.location?.trim()).length;
    const withDescription = reports.filter((r) => r.description?.trim()).length;
    const incomplete = reports.filter(
      (r) => !r.title?.trim() || !r.location?.trim() || !r.description?.trim()
    ).length;
    const pctComplete = Math.round(
      (100 * (withTitle + withLocation + withDescription)) / (3 * total)
    );
    return {
      withTitle,
      withLocation,
      withDescription,
      incomplete,
      pctComplete,
      total,
    };
  }, [reports]);

  const sitesFromReports = React.useMemo(() => {
    const byEntity: Record<string, { count: number; lastSeen: string }> = {};
    reports.forEach((r) => {
      const key = r.entityName || r.entityType || 'Unknown';
      if (!byEntity[key]) byEntity[key] = { count: 0, lastSeen: '' };
      byEntity[key].count += 1;
      const dt = r.updatedAt || r.createdAt || '';
      if (dt > (byEntity[key].lastSeen || '')) byEntity[key].lastSeen = dt;
    });
    return Object.entries(byEntity).map(([name, data]) => ({
      name,
      count: data.count,
      lastSeen: data.lastSeen,
    }));
  }, [reports]);

  const trendData = React.useMemo(() => {
    const byDay: Record<string, number> = {};
    reports.forEach((r) => {
      const raw = r.createdAt || r.updatedAt || '';
      const day = raw.slice(0, 10);
      if (day) byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([name, count]) => ({ name, reports: count }));
  }, [reports]);

  const auditFeed = React.useMemo(() => {
    const entries: { id: string; time: string; text: string; urgency: UrgencyLevel }[] = [];
    reports.slice(0, 50).forEach((r) => {
      const created = r.createdAt || r.updatedAt;
      if (created) {
        entries.push({
          id: `${r.reportId}-created`,
          time: created,
          text: `Report received: ${(r.title || r.reportId).slice(0, 50)}${(r.title || '').length > 50 ? '…' : ''}`,
          urgency: urgencyForReport(r),
        });
      }
      if (r.updatedAt && r.updatedAt !== r.createdAt) {
        entries.push({
          id: `${r.reportId}-updated`,
          time: r.updatedAt,
          text: `Updated — ${r.opsStatus || 'New'}: ${(r.title || r.reportId).slice(0, 40)}…`,
          urgency: urgencyForReport(r),
        });
      }
    });
    entries.sort((a, b) => (b.time.localeCompare(a.time)));
    return entries.slice(0, 30);
  }, [reports]);

  const openCount = reports.filter((r) => ['New', 'Investigating'].includes(r.opsStatus || '')).length;
  const criticalCount = reports.filter((r) => (r.severity || '').toLowerCase() === 'critical').length;
  const disputeCount = reports.filter((r) => (r.opsStatus || '') === 'Action Taken').length;
  const alertCount = reports.filter((r) => (r.opsStatus || '') === 'New' && (r.severity || '').toLowerCase() === 'high').length;

  const commandMenuItems: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Command overview' },
    { id: 'intelligence', label: 'Live intelligence' },
    { id: 'reports', label: 'Operational reports' },
    { id: 'investigations', label: 'Investigations' },
    { id: 'audit', label: 'Audit log' },
    { id: 'quality', label: 'Quality control' },
    { id: 'sites', label: 'Sites & tenants' },
    { id: 'alerts', label: 'Alerts' },
  ];

  const IconChart = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
  const IconHeart = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
  const IconDoc = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
  const IconMap = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[var(--md-sys-surface-container)] font-sans text-[14px]">
      <header className="hq-command-bar sticky top-0 z-30">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-[var(--md-sys-primary)] font-semibold text-white">
              D
            </div>
            <div className="min-w-0">
              <h1 className="hq-title truncate">DPAL Headquarters</h1>
              <p className="hq-subtitle truncate">
                Enterprise command center · {effectiveBase ? 'Nexus connected' : 'No API'}
                {lastSync && ` · ${lastSync.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <div className="hq-status-strip flex-shrink-0">
            {effectiveBase && (
              <>
                <span className={health?.ok ? 'text-[#81c995]' : 'text-[#f28b82]'}>
                  {health?.ok ? '● API up' : '● API down'}
                </span>
                <span>{openCount} open</span>
                {alertCount > 0 && <span className="text-[#f28b82]">{alertCount} alerts</span>}
              </>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="rounded p-1.5 text-[var(--hq-bar-muted)] hover:bg-white/10 hover:text-[var(--hq-bar-on)]"
              title="API settings"
              aria-label="API settings"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94a.75.75 0 01.596 0cA2.251 2.251 0 0113.5 4.898c.848.128 1.705.264 2.55.364a.75.75 0 01.63 1.408A21.474 21.474 0 0112 9c-2.264 0-4.597.032-6.963.096a.75.75 0 01-.63-1.408 20.902 20.902 0 002.55-.364A2.251 2.251 0 019.594 3.94z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading}
              className="rounded bg-[var(--md-sys-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[#1557b0] disabled:opacity-50"
            >
              {loading ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>
        {settingsOpen && (
          <div className="border-t border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface-container)] px-4 py-5 sm:px-6">
            <p className="md-label-medium mb-3 uppercase tracking-wider">API configuration</p>
            {effectiveBase && (
              <p className="md-body-medium mb-3">
                Current: <span className="font-mono text-[var(--md-sys-on-surface)]">{effectiveBase}</span>
                <span className="ml-1">({configSource === 'browser' ? 'this device' : 'server env'})</span>
              </p>
            )}
            <p className="md-body-medium mb-4">
              Base URL for your DPAL API. In Vercel: Settings → Environment Variables → <code className="rounded bg-[var(--md-sys-surface-container-high)] px-1.5 py-0.5 text-[12px]">NEXT_PUBLIC_DPAL_API_BASE</code>.
            </p>
            <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface)] p-4 shadow-md">
              <input
                type="url"
                value={apiBaseInput}
                onChange={(e) => { setApiBaseInput(e.target.value); setTestResult(null); }}
                placeholder="https://your-api.example.com"
                className="md-body-large h-10 min-w-[260px] rounded-[8px] border border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface)] px-3 outline-none placeholder:text-[var(--md-sys-outline)] focus:border-[var(--md-sys-primary)] focus:ring-2 focus:ring-[var(--md-sys-primary)]/20"
              />
              <button type="button" onClick={testConnection} disabled={testing || !apiBaseInput.trim()} className="md-button-outlined h-10 disabled:opacity-50">
                {testing ? 'Testing…' : 'Test'}
              </button>
              <button type="button" onClick={connectApi} className="md-button-filled h-10">
                Connect
              </button>
              {apiBaseOverride && (
                <button type="button" onClick={clearApiOverride} className="md-button-tonal h-10 text-[var(--md-sys-on-surface-variant)] hover:bg-[var(--md-sys-surface-container-highest)]">
                  Clear
                </button>
              )}
            </div>
            {testResult && (
              <p className={`md-body-medium mt-3 ${testResult.ok ? 'text-[var(--md-sys-success)]' : 'text-[var(--md-sys-error)]'}`}>
                {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
              </p>
            )}
          </div>
        )}
      </header>

      <div className="flex min-h-[calc(100vh-56px)]">
        <aside className="hq-command-menu hidden flex-shrink-0 lg:block">
          <nav className="sticky top-16 flex flex-col gap-0.5 py-3">
            {commandMenuItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => { setActiveTab(item.id); if (item.id === 'alerts') setSelectedReport(null); }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--md-sys-surface-container-high)] ${activeTab === item.id ? 'active' : 'text-[var(--md-sys-on-surface-variant)]'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-5">
          {/* Mobile command chips */}
          <div className="flex flex-wrap gap-2 pb-4 lg:hidden">
            {commandMenuItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`md-chip text-xs ${activeTab === item.id ? 'md-chip-selected' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Live intelligence strip — show on overview, intelligence, reports */}
          {(activeTab === 'overview' || activeTab === 'intelligence' || activeTab === 'reports') && (
            <div className="hq-live-intel mb-4">
              <div className="intel-item">
                <span className="intel-value text-[var(--md-sys-primary)]">{openCount}</span>
                <span className="text-[var(--md-sys-on-surface-variant)]">Open cases</span>
              </div>
              <div className="intel-item">
                <span className="intel-value text-[var(--hq-urgency-critical)]">{health?.ok ? 0 : 1}</span>
                <span className="text-[var(--md-sys-on-surface-variant)]">Failures</span>
              </div>
              <div className="intel-item">
                <span className="intel-value text-[var(--hq-urgency-dispute)]">{disputeCount}</span>
                <span className="text-[var(--md-sys-on-surface-variant)]">Disputes</span>
              </div>
              <div className="intel-item">
                <span className="intel-value text-[var(--hq-urgency-escalation)]">{criticalCount}</span>
                <span className="text-[var(--md-sys-on-surface-variant)]">Escalations</span>
              </div>
              {alertCount > 0 && (
                <div className="intel-item">
                  <span className="intel-value text-[var(--hq-urgency-critical)]">{alertCount}</span>
                  <span className="text-[var(--md-sys-on-surface-variant)]">Alerts</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="md-card flex items-center gap-3 border-l-4 border-[var(--md-sys-error)] bg-[var(--md-sys-error-container)] px-4 py-3 text-[var(--md-sys-on-error-container)]">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span className="md-body-medium">{error}</span>
            </div>
          )}

          {(activeTab === 'overview' || activeTab === 'intelligence') && (
            <>
              <SectionTitle>Key metrics</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="metric-box flex flex-col p-4 sm:p-6">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--md-sys-primary-container)] text-[var(--md-sys-primary)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625a5.625 5.625 0 00-.562.75V12m0 0 .375 3m-.375-3h7.5c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H8.25" />
                    </svg>
                  </div>
                  <p className="md-label-medium text-[var(--md-sys-on-surface-variant)]">Total reports</p>
                  <p className="md-headline-large mt-2 font-semibold">{reports.length}</p>
                  <p className="md-body-medium mt-0.5">From API feed</p>
                </div>
                <div className="metric-box flex flex-col p-4 sm:p-6">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--g-amber-bg)] text-[var(--g-amber)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                  </div>
                  <p className="md-label-medium text-[var(--md-sys-on-surface-variant)]">Open</p>
                  <p className="md-headline-large mt-2 font-semibold">
                    {reports.filter((r) => ['New', 'Investigating'].includes(r.opsStatus || '')).length}
                  </p>
                  <p className="md-body-medium mt-0.5">New + Investigating</p>
                </div>
                <div className="metric-box flex flex-col p-4 sm:p-6">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--md-sys-success-container)] text-[var(--md-sys-success)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="md-label-medium text-[var(--md-sys-on-surface-variant)]">API latency</p>
                  <p className="md-headline-large mt-2 font-semibold">
                    {health?.latencyMs != null ? `${health.latencyMs} ms` : '—'}
                  </p>
                  <p className="md-body-medium mt-0.5">Health endpoint</p>
                </div>
                <div className="metric-box flex flex-col p-4 sm:p-6">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--md-sys-primary-container)] text-[var(--md-sys-primary)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="md-label-medium text-[var(--md-sys-on-surface-variant)]">Endpoints OK</p>
                  <p className="md-headline-large mt-2 font-semibold">
                    {probes.filter((p) => p.ok).length}/{probes.length || 1}
                  </p>
                  <p className="md-body-medium mt-0.5">Probes</p>
                </div>
              </div>

              <SectionTitle>System health</SectionTitle>
              <Card
                title="System health"
                icon={<IconHeart />}
                right={
                  effectiveBase ? (
                    <button
                      type="button"
                      onClick={runProbesNow}
                      disabled={probesLoading}
                      className="md-button-outlined h-9 px-3 text-sm disabled:opacity-50"
                    >
                      {probesLoading ? 'Running…' : 'Run probes'}
                    </button>
                  ) : null
                }
              >
                {probes.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {probes.map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between rounded-[8px] border border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface-container)] px-4 py-3"
                      >
                        <span className="text-[14px] font-normal text-[var(--md-sys-on-surface)] capitalize">
                          {p.name.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="md-body-medium">{p.latencyMs} ms</span>
                          <StatusBadge ok={p.ok} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    message="No probes run yet"
                    submessage="Connect an API and click Refresh or Run probes."
                  />
                )}
              </Card>

              <SectionTitle>Recent reports</SectionTitle>
              <Card
                title="Recent reports"
                icon={<IconDoc />}
                right={
                  reports.length > 0 ? (
                    <button
                      type="button"
                      onClick={exportCsv}
                      className="md-button-tonal h-9 px-3 text-sm"
                    >
                      Export CSV
                    </button>
                  ) : null
                }
              >
                {reports.length > 0 ? (
                  <div className="overflow-x-auto rounded-[8px] border border-[var(--md-sys-outline-variant)]">
                    <table className="w-full md-body-large">
                      <thead>
                        <tr className="border-b border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface-container)] text-left md-label-medium text-[var(--md-sys-on-surface-variant)]">
                          <th className="px-4 py-3">Title</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Severity</th>
                          <th className="px-4 py-3">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(statusFilter ? filteredReports : reports).slice(0, 20).map((r, i) => (
                          <tr
                            key={r.reportId}
                            onClick={() => setSelectedReport(r)}
                            className={`cursor-pointer border-b border-[var(--md-sys-outline-variant)] last:border-0 transition-colors ${
                              selectedReport?.reportId === r.reportId ? 'bg-[var(--md-sys-primary-container)]/40' : i % 2 === 0 ? 'bg-[var(--md-sys-surface)]' : 'bg-[var(--md-sys-surface-container)]/60'
                            } hover:bg-[var(--md-sys-primary-container)]/20`}
                          >
                            <td className="max-w-[240px] truncate px-4 py-3 text-[var(--md-sys-on-surface)]" title={r.title}>
                              {r.title || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <UrgencyBadge level={urgencyForReport(r)} label={r.opsStatus || 'New'} />
                            </td>
                            <td className="px-4 py-3 text-[var(--md-sys-on-surface-variant)]">{r.severity || '—'}</td>
                            <td className="px-4 py-3 text-[var(--md-sys-on-surface-variant)]">
                              {r.updatedAt || r.createdAt
                                ? new Date(r.updatedAt || r.createdAt!).toLocaleDateString()
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="md-body-medium mt-3 rounded-[8px] bg-[var(--md-sys-surface-container)] px-3 py-2">
                      Showing up to 20 of {statusFilter ? filteredReports.length : reports.length} reports.
                    </p>
                  </div>
                ) : (
                  <EmptyState
                    message="No reports yet"
                    submessage="Connect your API and refresh to load the reports feed."
                  />
                )}
              </Card>

              {reports.length > 0 && (
                <div className="md-card flex flex-wrap items-center gap-2 p-3 sm:p-4">
                  <span className="md-label-medium mr-1 text-[var(--md-sys-on-surface-variant)]">Filter by status</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('')}
                      className={`md-chip ${!statusFilter ? 'md-chip-selected' : ''}`}
                    >
                      All
                    </button>
                    {Array.from(new Set(reports.map((r) => r.opsStatus || 'New'))).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatusFilter(s)}
                        className={`md-chip ${statusFilter === s ? 'md-chip-selected' : ''}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {statusFilter && (
                    <span className="md-body-medium ml-auto rounded-full bg-[var(--md-sys-surface-container-high)] px-2.5 py-1 text-[var(--md-sys-on-surface-variant)]">
                      {filteredReports.length} of {reports.length}
                    </span>
                  )}
                </div>
              )}

              <SectionTitle>Analytics</SectionTitle>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Reports by status" icon={<IconChart />}>
                  {byStatus.length ? (
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={byStatus}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {byStatus.map((_, i) => (
                              <Cell key={i} fill={STATUS_COLORS[byStatus[i].name] || '#5f6368'} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--md-sys-outline-variant)', background: 'var(--md-sys-surface)', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState message="No report data yet" submessage="Connect your API and refresh to load reports." />
                  )}
                </Card>
                <Card title="Reports by severity" icon={<IconChart />}>
                  {bySeverity.length ? (
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bySeverity} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-outline-variant)" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--md-sys-on-surface-variant)' }} />
                          <YAxis tick={{ fontSize: 12, fill: 'var(--md-sys-on-surface-variant)' }} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--md-sys-outline-variant)', background: 'var(--md-sys-surface)', fontSize: 12 }} />
                          <Bar dataKey="value" fill="#1a73e8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState message="No report data yet" submessage="Connect your API and refresh to load reports." />
                  )}
                </Card>
              </div>

              {trendData.length > 0 && (
                <Card title="Report intake trend (last 14 days)" icon={<IconChart />}>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-outline-variant)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--md-sys-on-surface-variant)' }} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--md-sys-on-surface-variant)' }} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--md-sys-outline-variant)', background: 'var(--md-sys-surface)', fontSize: 12 }} />
                        <Line type="monotone" dataKey="reports" stroke="#1a73e8" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#1a73e8' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </>
          )}

          {activeTab === 'reports' && (
            <>
              <SectionTitle>Operational control</SectionTitle>
              {reports.length > 0 && (
                <div className="md-card flex flex-wrap items-center gap-2 p-3 sm:p-4">
                  <span className="md-label-medium mr-1 text-[var(--md-sys-on-surface-variant)]">Filter by status</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setStatusFilter('')} className={`md-chip ${!statusFilter ? 'md-chip-selected' : ''}`}>All</button>
                    {Array.from(new Set(reports.map((r) => r.opsStatus || 'New'))).map((s) => (
                      <button key={s} type="button" onClick={() => setStatusFilter(s)} className={`md-chip ${statusFilter === s ? 'md-chip-selected' : ''}`}>{s}</button>
                    ))}
                  </div>
                  <button type="button" onClick={exportCsv} className="md-button-tonal ml-auto h-9 px-3 text-sm">Export CSV</button>
                </div>
              )}
              <Card title="Reports" icon={<IconDoc />} right={reports.length > 0 ? <button type="button" onClick={exportCsv} className="md-button-tonal h-9 px-3 text-sm">Export CSV</button> : null}>
                {reports.length > 0 ? (
                  <div className="overflow-x-auto rounded-[8px] border border-[var(--md-sys-outline-variant)]">
                    <table className="w-full md-body-large">
                      <thead>
                        <tr className="border-b border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface-container)] text-left md-label-medium text-[var(--md-sys-on-surface-variant)]">
                          <th className="px-4 py-3">Title</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Severity</th>
                          <th className="px-4 py-3">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(statusFilter ? filteredReports : reports).slice(0, 50).map((r, i) => (
                          <tr
                            key={r.reportId}
                            onClick={() => setSelectedReport(r)}
                            className={`cursor-pointer border-b border-[var(--md-sys-outline-variant)] last:border-0 transition-colors ${selectedReport?.reportId === r.reportId ? 'bg-[var(--md-sys-primary-container)]/40' : i % 2 === 0 ? 'bg-[var(--md-sys-surface)]' : 'bg-[var(--md-sys-surface-container)]/60'} hover:bg-[var(--md-sys-primary-container)]/20`}
                          >
                            <td className="max-w-[240px] truncate px-4 py-3 text-[var(--md-sys-on-surface)]" title={r.title}>{r.title || '—'}</td>
                            <td className="px-4 py-3"><UrgencyBadge level={urgencyForReport(r)} label={r.opsStatus || 'New'} /></td>
                            <td className="px-4 py-3 text-[var(--md-sys-on-surface-variant)]">{r.severity || '—'}</td>
                            <td className="px-4 py-3 text-[var(--md-sys-on-surface-variant)]">{r.updatedAt || r.createdAt ? new Date(r.updatedAt || r.createdAt!).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="md-body-medium mt-3 rounded-[8px] bg-[var(--md-sys-surface-container)] px-3 py-2">Showing up to 50 of {statusFilter ? filteredReports.length : reports.length} reports. Click a row for detail.</p>
                  </div>
                ) : (
                  <EmptyState message="No reports yet" submessage="Connect your API and refresh to load the reports feed." />
                )}
              </Card>
            </>
          )}

          {activeTab === 'investigations' && (
            <>
              <SectionTitle>Investigations</SectionTitle>
              <Card title="Cases under investigation" icon={<IconDoc />}>
                {(() => {
                  const investigating = reports.filter((r) => (r.opsStatus || '') === 'Investigating');
                  return investigating.length > 0 ? (
                    <div className="overflow-x-auto rounded-[8px] border border-[var(--md-sys-outline-variant)]">
                      <table className="w-full md-body-large">
                        <thead>
                          <tr className="border-b border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface-container)] text-left md-label-medium text-[var(--md-sys-on-surface-variant)]">
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Severity</th>
                            <th className="px-4 py-3">Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {investigating.slice(0, 30).map((r, i) => (
                            <tr key={r.reportId} onClick={() => setSelectedReport(r)} className={`cursor-pointer border-b border-[var(--md-sys-outline-variant)] last:border-0 ${selectedReport?.reportId === r.reportId ? 'bg-[var(--md-sys-primary-container)]/40' : i % 2 === 0 ? 'bg-[var(--md-sys-surface)]' : 'bg-[var(--md-sys-surface-container)]/60'} hover:bg-[var(--md-sys-primary-container)]/20`}>
                              <td className="max-w-[280px] truncate px-4 py-3 text-[var(--md-sys-on-surface)]" title={r.title}>{r.title || '—'}</td>
                              <td className="px-4 py-3"><UrgencyBadge level={urgencyForReport(r)} label={r.severity || '—'} /></td>
                              <td className="px-4 py-3 text-[var(--md-sys-on-surface-variant)]">{r.updatedAt || r.createdAt ? new Date(r.updatedAt || r.createdAt!).toLocaleString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState message="No cases under investigation" submessage="Reports with status Investigating appear here." />
                  );
                })()}
              </Card>
            </>
          )}

          {activeTab === 'audit' && (
            <>
              <SectionTitle>Audit log</SectionTitle>
              <Card title="Activity &amp; traceability" icon={<IconDoc />}>
                {auditFeed.length > 0 ? (
                  <div className="space-y-0">
                    {auditFeed.map((entry) => (
                      <div key={entry.id} className={`hq-timeline-item ${entry.urgency}`}>
                        <p className="text-[10px] font-medium text-[var(--md-sys-on-surface-variant)]">{new Date(entry.time).toLocaleString()}</p>
                        <p className="mt-0.5 text-[var(--md-sys-on-surface)]">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No audit entries yet" submessage="Activity is derived from report creation and updates." />
                )}
              </Card>
            </>
          )}

          {activeTab === 'alerts' && (
            <>
              <SectionTitle>Alerts</SectionTitle>
              <Card title="Items requiring attention" icon={<IconDoc />}>
                {(() => {
                  const alertsList = reports.filter((r) => (r.opsStatus || '') === 'New' && ((r.severity || '').toLowerCase() === 'high' || (r.severity || '').toLowerCase() === 'critical'));
                  return alertsList.length > 0 ? (
                    <div className="overflow-x-auto rounded-[8px] border border-[var(--hq-urgency-critical)]/30 bg-[var(--md-sys-error-container)]/20">
                      <table className="w-full md-body-large">
                        <thead>
                          <tr className="border-b border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface-container)] text-left md-label-medium text-[var(--md-sys-on-surface-variant)]">
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Severity</th>
                            <th className="px-4 py-3">Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alertsList.slice(0, 30).map((r, i) => (
                            <tr key={r.reportId} onClick={() => setSelectedReport(r)} className={`cursor-pointer border-b border-[var(--md-sys-outline-variant)] last:border-0 ${selectedReport?.reportId === r.reportId ? 'bg-[var(--md-sys-primary-container)]/40' : i % 2 === 0 ? 'bg-[var(--md-sys-surface)]' : 'bg-[var(--md-sys-surface-container)]/60'} hover:bg-[var(--md-sys-primary-container)]/20`}>
                              <td className="max-w-[240px] truncate px-4 py-3 font-medium text-[var(--md-sys-on-surface)]" title={r.title}>{r.title || '—'}</td>
                              <td className="px-4 py-3"><UrgencyBadge level="critical" label={r.opsStatus || 'New'} /></td>
                              <td className="px-4 py-3"><UrgencyBadge level="critical" label={r.severity || '—'} /></td>
                              <td className="px-4 py-3 text-[var(--md-sys-on-surface-variant)]">{r.updatedAt || r.createdAt ? new Date(r.updatedAt || r.createdAt!).toLocaleString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState message="No active alerts" submessage="New reports with high or critical severity appear here." />
                  );
                })()}
              </Card>
            </>
          )}

          {activeTab === 'quality' && (
            <>
              <SectionTitle>Quality metrics</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="metric-box flex flex-col p-4 sm:p-6">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--md-sys-success-container)] text-[var(--md-sys-success)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="md-label-medium text-[var(--md-sys-on-surface-variant)]">Data completeness</p>
                  <p className="md-headline-large mt-2 font-semibold">
                    {qualityMetrics.total ? `${qualityMetrics.pctComplete}%` : '—'}
                  </p>
                  <p className="md-body-medium mt-0.5">Title + location + description</p>
                </div>
                <div className="metric-box flex flex-col p-4 sm:p-6">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--md-sys-primary-container)] text-[var(--md-sys-primary)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25" />
                    </svg>
                  </div>
                  <p className="md-label-medium text-[var(--md-sys-on-surface-variant)]">With title</p>
                  <p className="md-headline-large mt-2 font-semibold">
                    {qualityMetrics.withTitle}/{qualityMetrics.total || 0}
                  </p>
                </div>
                <div className="metric-box flex flex-col p-4 sm:p-6">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--md-sys-primary-container)] text-[var(--md-sys-primary)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <p className="md-label-medium text-[var(--md-sys-on-surface-variant)]">With location</p>
                  <p className="md-headline-large mt-2 font-semibold">
                    {qualityMetrics.withLocation}/{qualityMetrics.total || 0}
                  </p>
                </div>
                <div className="metric-box flex flex-col p-4 sm:p-6">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--g-amber-bg)] text-[var(--g-amber)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="md-label-medium text-[var(--md-sys-on-surface-variant)]">Incomplete</p>
                  <p className="md-headline-large mt-2 font-semibold text-[var(--g-amber)]">
                    {qualityMetrics.incomplete}
                  </p>
                </div>
              </div>
              <SectionTitle>Rules &amp; guidelines</SectionTitle>
              <Card title="Quality rules" icon={<IconChart />}>
                <ul className="md-body-large space-y-3 rounded-[8px] border border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface-container)] p-4 text-[var(--md-sys-on-surface-variant)]">
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--md-sys-primary)]" />
                    Reports with missing title, location, or description are flagged as incomplete.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--md-sys-primary)]" />
                    Completeness % = (fields present) / (3 × total reports).
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--md-sys-primary)]" />
                    All metrics are computed from the current reports feed.
                  </li>
                </ul>
              </Card>
            </>
          )}

          {activeTab === 'sites' && (
            <>
              <SectionTitle>Sites &amp; tenants</SectionTitle>
              <Card title="Sites / tenants" icon={<IconMap />}>
                {sitesFromReports.length ? (
                  <div className="overflow-x-auto rounded-[8px] border border-[var(--md-sys-outline-variant)]">
                    <table className="w-full md-body-large">
                      <thead>
                        <tr className="border-b border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface-container)] text-left md-label-medium text-[var(--md-sys-on-surface-variant)]">
                          <th className="px-4 py-3">Site / Entity</th>
                          <th className="px-4 py-3">Report count</th>
                          <th className="px-4 py-3">Last activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sitesFromReports.map((s, i) => (
                          <tr
                            key={s.name}
                            className={`border-b border-[var(--md-sys-outline-variant)] last:border-0 transition-colors ${
                              i % 2 === 0 ? 'bg-[var(--md-sys-surface)]' : 'bg-[var(--md-sys-surface-container)]/60'
                            } hover:bg-[var(--md-sys-primary-container)]/20`}
                          >
                            <td className="px-4 py-3 font-medium text-[var(--md-sys-on-surface)]">{s.name}</td>
                            <td className="px-4 py-3 text-[var(--md-sys-on-surface-variant)]">{s.count}</td>
                            <td className="px-4 py-3 text-[var(--md-sys-on-surface-variant)]">
                              {s.lastSeen ? new Date(s.lastSeen).toLocaleString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    message="No site data yet"
                    submessage="Ensure the API returns entityName or entityType on reports."
                  />
                )}
              </Card>
              <SectionTitle>Platform status</SectionTitle>
              <Card title="Platform status" icon={<IconHeart />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-[8px] border border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface-container)] px-4 py-3">
                    <span className="md-body-large text-[var(--md-sys-on-surface)]">Nexus API (DPAL backend)</span>
                    <StatusBadge ok={health?.ok ?? false} />
                  </div>
                  <div className="flex items-center justify-between rounded-[8px] border border-[var(--md-sys-outline-variant)] bg-[var(--md-sys-surface-container)] px-4 py-3">
                    <span className="md-body-large text-[var(--md-sys-on-surface)]">Reports feed</span>
                    <StatusBadge ok={probes.find((p) => p.name === 'reportsFeed')?.ok ?? false} />
                  </div>
                </div>
              </Card>
            </>
          )}
        </main>

        {/* Right: contextual detail inspector */}
        <div className={`hq-inspector flex-shrink-0 border-t border-[var(--md-sys-outline-variant)] lg:border-t-0 ${selectedReport ? 'w-full lg:w-[360px]' : 'hidden xl:block xl:w-[320px]'}`}>
          <div className="hq-inspector-header sticky top-0 z-10 bg-[var(--md-sys-surface)]">
            {selectedReport ? 'Report detail' : 'Detail'}
            {selectedReport && (
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded p-1 text-[var(--md-sys-on-surface-variant)] hover:bg-[var(--md-sys-surface-container-high)]"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="p-4">
            {selectedReport ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--md-sys-on-surface-variant)]">Title</p>
                  <p className="font-medium text-[var(--md-sys-on-surface)]">{selectedReport.title || '—'}</p>
                </div>
                {selectedReport.description && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--md-sys-on-surface-variant)]">Description</p>
                    <p className="text-[var(--md-sys-on-surface-variant)]">{selectedReport.description}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <UrgencyBadge level={urgencyForReport(selectedReport)} label={selectedReport.opsStatus || 'New'} />
                  {selectedReport.severity && (
                    <span className="hq-badge hq-badge-neutral">{selectedReport.severity}</span>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--md-sys-on-surface-variant)]">Entity</p>
                  <p className="text-[var(--md-sys-on-surface)]">{selectedReport.entityName || selectedReport.entityType || '—'}</p>
                </div>
                {selectedReport.location && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--md-sys-on-surface-variant)]">Location</p>
                    <p className="text-[var(--md-sys-on-surface-variant)]">{selectedReport.location}</p>
                  </div>
                )}
                <div className="border-t border-[var(--md-sys-outline-variant)] pt-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--md-sys-on-surface-variant)]">Traceability</p>
                  <p className="font-mono text-xs text-[var(--md-sys-on-surface-variant)]">{selectedReport.reportId}</p>
                  <p className="mt-1 text-xs text-[var(--md-sys-on-surface-variant)]">
                    Created {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : '—'}
                    {selectedReport.updatedAt && selectedReport.updatedAt !== selectedReport.createdAt && (
                      <> · Updated {new Date(selectedReport.updatedAt).toLocaleString()}</>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--md-sys-on-surface-variant)]">Select a report or entity from the operational table to view details here. Full traceability and audit trail are shown.</p>
            )}
          </div>
        </div>
      </div>

      {snackbar && (
        <div className="md-snackbar" role="status" aria-live="polite">
          {snackbar.message}
        </div>
      )}
    </div>
  );
}
