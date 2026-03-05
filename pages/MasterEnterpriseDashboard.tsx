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

type TabId = 'overview' | 'quality' | 'sites';

const STATUS_COLORS: Record<string, string> = {
  New: '#f29900',
  Investigating: '#1a73e8',
  'Action Taken': '#9334e6',
  Resolved: '#1e8e3e',
};

function Card({
  title,
  children,
  right,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] shadow-g1 ${className}`}>
      <div className="flex items-center justify-between border-b border-[var(--g-divider)] px-6 py-4">
        <h2 className="text-[15px] font-normal text-[var(--g-text)]">{title}</h2>
        {right}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ${
        ok ? 'bg-[#e6f4ea] text-[var(--g-green)]' : 'bg-[#fce8e6] text-[var(--g-red)]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-[var(--g-green)]' : 'bg-[var(--g-red)]'}`} />
      {label ?? (ok ? 'Healthy' : 'Down')}
    </span>
  );
}

function EmptyState({ message, submessage }: { message: string; submessage?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--g-divider)] text-[var(--g-text3)]">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p className="text-[14px] font-normal text-[var(--g-text)]">{message}</p>
      {submessage && <p className="mt-1 text-[12px] text-[var(--g-text2)]">{submessage}</p>}
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

  const navItems: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'quality', label: 'Quality Control' },
    { id: 'sites', label: 'Site Monitoring' },
  ];

  return (
    <div className="min-h-screen bg-[var(--g-surface2)] font-sans text-[14px]">
      <header className="sticky top-0 z-30 border-b border-[var(--g-border)] bg-[var(--g-surface)]">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--g-blue)] text-[12px] font-medium text-white">
              D
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-normal tracking-tight text-[var(--g-text)]">
                DPAL Enterprise
              </h1>
              <p className="text-[12px] text-[var(--g-text2)]">
                {effectiveBase ? 'Connected' : 'No API configured'}
                {lastSync && ` · Updated ${lastSync.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            {effectiveBase && (
              <StatusBadge ok={health?.ok ?? false} label={health?.ok ? 'API up' : 'API down'} />
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--g-text2)] hover:bg-[var(--g-surface2)] hover:text-[var(--g-text)]"
              title="Settings"
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
              className="flex h-9 items-center gap-1.5 rounded-[var(--g-radius)] bg-[var(--g-blue)] px-4 text-[13px] font-medium text-white hover:bg-[var(--g-blue-hover)] disabled:opacity-60"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              )}
              {loading ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>
        {settingsOpen && (
          <div className="border-t border-[var(--g-divider)] bg-[var(--g-surface)] px-6 py-5">
            <p className="mb-1 text-[12px] font-medium uppercase tracking-wider text-[var(--g-text2)]">API configuration</p>
            {effectiveBase && (
              <p className="mb-3 text-[12px] text-[var(--g-text2)]">
                Current: <span className="font-mono text-[var(--g-text)]">{effectiveBase}</span>
                <span className="ml-1">({configSource === 'browser' ? 'this device' : 'server env'})</span>
              </p>
            )}
            <p className="mb-4 text-[13px] text-[var(--g-text2)]">
              Base URL for your DPAL API. In Vercel: Settings → Environment Variables → <code className="rounded bg-[var(--g-surface2)] px-1 py-0.5 text-[12px]">NEXT_PUBLIC_DPAL_API_BASE</code>.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="url"
                value={apiBaseInput}
                onChange={(e) => { setApiBaseInput(e.target.value); setTestResult(null); }}
                placeholder="https://your-api.example.com"
                className="h-9 min-w-[280px] rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] px-3 text-[14px] text-[var(--g-text)] placeholder:text-[var(--g-text3)] focus:border-[var(--g-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--g-blue)]"
              />
              <button
                type="button"
                onClick={testConnection}
                disabled={testing || !apiBaseInput.trim()}
                className="h-9 rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] px-3 text-[13px] font-medium text-[var(--g-text)] hover:bg-[var(--g-surface2)] disabled:opacity-50"
              >
                {testing ? 'Testing…' : 'Test'}
              </button>
              <button
                type="button"
                onClick={connectApi}
                className="h-9 rounded-[var(--g-radius)] bg-[var(--g-blue)] px-4 text-[13px] font-medium text-white hover:bg-[var(--g-blue-hover)]"
              >
                Connect
              </button>
              {apiBaseOverride && (
                <button
                  type="button"
                  onClick={clearApiOverride}
                  className="h-9 rounded-[var(--g-radius)] px-3 text-[13px] font-medium text-[var(--g-text2)] hover:bg-[var(--g-surface2)] hover:text-[var(--g-text)]"
                >
                  Clear
                </button>
              )}
            </div>
            {testResult && (
              <p className={`mt-3 text-[13px] ${testResult.ok ? 'text-[var(--g-green)]' : 'text-[var(--g-red)]'}`}>
                {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
              </p>
            )}
          </div>
        )}
      </header>

      <div className="mx-auto flex max-w-[1280px] gap-8 px-6 py-8">
        <aside className="hidden w-56 flex-shrink-0 lg:block">
          <nav className="sticky top-24 space-y-0.5 rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] p-1 shadow-g1">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full rounded-md px-3 py-2.5 text-left text-[14px] font-normal ${
                  activeTab === item.id
                    ? 'bg-[#e8f0fe] text-[var(--g-blue)]'
                    : 'text-[var(--g-text2)] hover:bg-[var(--g-surface2)] hover:text-[var(--g-text)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-8">
          {error && (
            <div className="rounded-[var(--g-radius)] border border-[#f9ab00] bg-[#fef7e0] px-4 py-3 text-[13px] text-[#b36b00]">
              {error}
            </div>
          )}

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] p-6 shadow-g1">
                  <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--g-text2)]">Total reports</p>
                  <p className="mt-2 text-[28px] font-normal tracking-tight text-[var(--g-text)]">{reports.length}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--g-text2)]">From API feed</p>
                </div>
                <div className="rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] p-6 shadow-g1">
                  <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--g-text2)]">Open</p>
                  <p className="mt-2 text-[28px] font-normal tracking-tight text-[var(--g-text)]">
                    {reports.filter((r) => ['New', 'Investigating'].includes(r.opsStatus || '')).length}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--g-text2)]">New + Investigating</p>
                </div>
                <div className="rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] p-6 shadow-g1">
                  <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--g-text2)]">API latency</p>
                  <p className="mt-2 text-[28px] font-normal tracking-tight text-[var(--g-text)]">
                    {health?.latencyMs != null ? `${health.latencyMs} ms` : '—'}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--g-text2)]">Health endpoint</p>
                </div>
                <div className="rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] p-6 shadow-g1">
                  <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--g-text2)]">Endpoints OK</p>
                  <p className="mt-2 text-[28px] font-normal tracking-tight text-[var(--g-text)]">
                    {probes.filter((p) => p.ok).length}/{probes.length || 1}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--g-text2)]">Probes</p>
                </div>
              </div>

              <Card
                title="System health"
                right={
                  effectiveBase ? (
                    <button
                      type="button"
                      onClick={runProbesNow}
                      disabled={probesLoading}
                      className="rounded-md border border-[var(--g-border)] bg-[var(--g-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--g-text)] hover:bg-[var(--g-surface2)] disabled:opacity-50"
                    >
                      {probesLoading ? 'Running…' : 'Run probes'}
                    </button>
                  ) : null
                }
              >
                {probes.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {probes.map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between rounded-md border border-[var(--g-divider)] bg-[var(--g-surface2)] px-4 py-3"
                      >
                        <span className="text-[14px] font-normal text-[var(--g-text)] capitalize">
                          {p.name.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-[var(--g-text2)]">{p.latencyMs} ms</span>
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

              <Card
                title="Recent reports"
                right={
                  reports.length > 0 ? (
                    <button
                      type="button"
                      onClick={exportCsv}
                      className="rounded-md px-3 py-1.5 text-[12px] font-medium text-[var(--g-blue)] hover:bg-[#e8f0fe]"
                    >
                      Export CSV
                    </button>
                  ) : null
                }
              >
                {reports.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[14px]">
                      <thead>
                        <tr className="border-b border-[var(--g-divider)] text-left text-[12px] font-medium text-[var(--g-text2)]">
                          <th className="pb-3 pr-4">Title</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4">Severity</th>
                          <th className="pb-3">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(statusFilter ? filteredReports : reports).slice(0, 20).map((r) => (
                          <tr key={r.reportId} className="border-b border-[var(--g-divider)] hover:bg-[var(--g-surface2)]">
                            <td className="max-w-[240px] truncate py-3 pr-4 font-normal text-[var(--g-text)]" title={r.title}>
                              {r.title || '—'}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="rounded-full bg-[var(--g-surface2)] px-2 py-0.5 text-[12px] font-medium text-[var(--g-text2)]">
                                {r.opsStatus || 'New'}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-[var(--g-text2)]">{r.severity || '—'}</td>
                            <td className="py-3 text-[var(--g-text2)]">
                              {r.updatedAt || r.createdAt
                                ? new Date(r.updatedAt || r.createdAt!).toLocaleDateString()
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-3 text-[12px] text-[var(--g-text2)]">
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
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-[13px] font-normal text-[var(--g-text2)]">Filter by status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] px-3 text-[13px] text-[var(--g-text)] focus:border-[var(--g-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--g-blue)]"
                  >
                    <option value="">All</option>
                    {Array.from(new Set(reports.map((r) => r.opsStatus || 'New'))).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {statusFilter && (
                    <span className="text-[12px] text-[var(--g-text2)]">
                      {filteredReports.length} of {reports.length}
                    </span>
                  )}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Reports by status">
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
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--g-divider)', background: 'var(--g-surface)', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState message="No report data yet" submessage="Connect your API and refresh to load reports." />
                  )}
                </Card>
                <Card title="Reports by severity">
                  {bySeverity.length ? (
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bySeverity} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--g-divider)" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--g-text2)' }} />
                          <YAxis tick={{ fontSize: 12, fill: 'var(--g-text2)' }} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--g-divider)', background: 'var(--g-surface)', fontSize: 12 }} />
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
                <Card title="Report intake trend (last 14 days)">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--g-divider)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--g-text2)' }} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--g-text2)' }} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--g-divider)', background: 'var(--g-surface)', fontSize: 12 }} />
                        <Line type="monotone" dataKey="reports" stroke="#1a73e8" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#1a73e8' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </>
          )}

          {activeTab === 'quality' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] p-6 shadow-g1">
                  <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--g-text2)]">Data completeness</p>
                  <p className="mt-2 text-[28px] font-normal tracking-tight text-[var(--g-text)]">
                    {qualityMetrics.total ? `${qualityMetrics.pctComplete}%` : '—'}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--g-text2)]">Title + location + description</p>
                </div>
                <div className="rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] p-6 shadow-g1">
                  <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--g-text2)]">With title</p>
                  <p className="mt-2 text-[28px] font-normal tracking-tight text-[var(--g-text)]">
                    {qualityMetrics.withTitle}/{qualityMetrics.total || 0}
                  </p>
                </div>
                <div className="rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] p-6 shadow-g1">
                  <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--g-text2)]">With location</p>
                  <p className="mt-2 text-[28px] font-normal tracking-tight text-[var(--g-text)]">
                    {qualityMetrics.withLocation}/{qualityMetrics.total || 0}
                  </p>
                </div>
                <div className="rounded-[var(--g-radius)] border border-[var(--g-border)] bg-[var(--g-surface)] p-6 shadow-g1">
                  <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--g-text2)]">Incomplete</p>
                  <p className="mt-2 text-[28px] font-normal tracking-tight text-[#b36b00]">
                    {qualityMetrics.incomplete}
                  </p>
                </div>
              </div>
              <Card title="Quality rules">
                <ul className="space-y-2 text-[14px] font-normal text-[var(--g-text2)]">
                  <li>Reports with missing title, location, or description are flagged as incomplete.</li>
                  <li>Completeness % = (fields present) / (3 × total reports).</li>
                  <li>All metrics are computed from the current reports feed.</li>
                </ul>
              </Card>
            </>
          )}

          {activeTab === 'sites' && (
            <>
              <Card title="Sites / tenants">
                {sitesFromReports.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[14px]">
                      <thead>
                        <tr className="border-b border-[var(--g-divider)] text-left text-[12px] font-medium text-[var(--g-text2)]">
                          <th className="pb-3 pr-4">Site / Entity</th>
                          <th className="pb-3 pr-4">Report count</th>
                          <th className="pb-3">Last activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sitesFromReports.map((s) => (
                          <tr key={s.name} className="border-b border-[var(--g-divider)] hover:bg-[var(--g-surface2)]">
                            <td className="py-3 pr-4 font-normal text-[var(--g-text)]">{s.name}</td>
                            <td className="py-3 pr-4 text-[var(--g-text2)]">{s.count}</td>
                            <td className="py-3 text-[var(--g-text2)]">
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
              <Card title="Platform status">
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-md border border-[var(--g-divider)] bg-[var(--g-surface2)] px-4 py-3">
                    <span className="text-[14px] font-normal text-[var(--g-text)]">Nexus API (DPAL backend)</span>
                    <StatusBadge ok={health?.ok ?? false} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-[var(--g-divider)] bg-[var(--g-surface2)] px-4 py-3">
                    <span className="text-[14px] font-normal text-[var(--g-text)]">Reports feed</span>
                    <StatusBadge ok={probes.find((p) => p.name === 'reportsFeed')?.ok ?? false} />
                  </div>
                </div>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
