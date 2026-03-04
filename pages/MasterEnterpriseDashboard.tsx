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
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-800">{title}</h3>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      {label ?? (ok ? 'Healthy' : 'Down')}
    </span>
  );
}

function EmptyState({ message, submessage }: { message: string; submessage?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700">{message}</p>
      {submessage && <p className="mt-1 text-xs text-gray-500">{submessage}</p>}
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

  const effectiveBase = apiBaseOverride || getApiBase();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setApiBaseOverride(saved);
        setApiBaseInput(saved);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    const base = effectiveBase;
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
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const connectApi = () => {
    const url = apiBaseInput.trim().replace(/\/$/, '');
    if (url) {
      setApiBaseOverride(url);
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, url);
      setSettingsOpen(false);
      refresh();
    }
  };

  const clearApiOverride = () => {
    setApiBaseOverride('');
    setApiBaseInput('');
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    setSettingsOpen(false);
    refresh();
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
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Top bar – Google-style */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-google-blue text-white font-bold">
                D
              </div>
              <div>
                <h1 className="text-lg font-medium text-gray-900">
                  DPAL Master Enterprise Dashboard
                </h1>
                <p className="text-xs text-gray-500">
                  {effectiveBase ? 'Connected' : 'No API configured'}
                  {lastSync && ` · Last sync ${lastSync.toLocaleTimeString()}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {effectiveBase ? (
                <StatusBadge ok={health?.ok ?? false} label={health?.ok ? 'API up' : 'API down'} />
              ) : null}
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                API & tools
              </button>
              <button
                type="button"
                onClick={() => refresh()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-google-blue px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Refreshing…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          {/* API & tools panel */}
          {settingsOpen && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-medium text-gray-800">API configuration</h3>
              <p className="mb-3 text-xs text-gray-500">
                Enter your DPAL API base URL (e.g. https://your-api.up.railway.app). You can also set{' '}
                <code className="rounded bg-gray-200 px-1">NEXT_PUBLIC_DPAL_API_BASE</code> in Vercel or .env.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="url"
                  value={apiBaseInput}
                  onChange={(e) => setApiBaseInput(e.target.value)}
                  placeholder="https://your-dpal-api.example.com"
                  className="min-w-[280px] rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-google-blue focus:outline-none focus:ring-1 focus:ring-google-blue"
                />
                <button
                  type="button"
                  onClick={connectApi}
                  className="rounded-lg bg-google-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Connect
                </button>
                {apiBaseOverride ? (
                  <button
                    type="button"
                    onClick={clearApiOverride}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Clear override
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-52 flex-shrink-0 lg:block">
          <nav className="sticky top-28 space-y-0.5 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-google-blue/10 text-google-blue'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error}
            </div>
          )}

          {activeTab === 'overview' && (
            <>
              {/* Metric cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total reports</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{reports.length}</p>
                  <p className="mt-0.5 text-xs text-gray-500">From API feed</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Open</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {reports.filter((r) => ['New', 'Investigating'].includes(r.opsStatus || '')).length}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">New + Investigating</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">API latency</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {health?.latencyMs != null ? `${health.latencyMs} ms` : '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">Health endpoint</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Endpoints OK</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {probes.filter((p) => p.ok).length}/{probes.length || 1}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">Probes</p>
                </div>
              </div>

              <Card title="System health">
                {probes.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {probes.map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3"
                      >
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {p.name.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{p.latencyMs} ms</span>
                          <StatusBadge ok={p.ok} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    message="No probes run yet"
                    submessage="Connect an API in API & tools and click Refresh to run health checks."
                  />
                )}
              </Card>

              {/* Reports filter */}
              {reports.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Filter by status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-google-blue focus:outline-none focus:ring-1 focus:ring-google-blue"
                  >
                    <option value="">All</option>
                    {Array.from(new Set(reports.map((r) => r.opsStatus || 'New'))).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {statusFilter && (
                    <span className="text-xs text-gray-500">
                      Showing {filteredReports.length} of {reports.length}
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
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState
                      message="No report data yet"
                      submessage="Connect your API and refresh to load reports."
                    />
                  )}
                </Card>
                <Card title="Reports by severity">
                  {bySeverity.length ? (
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bySeverity} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 8,
                              border: '1px solid #e5e7eb',
                              background: '#fff',
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="value" fill="#1a73e8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState
                      message="No report data yet"
                      submessage="Connect your API and refresh to load reports."
                    />
                  )}
                </Card>
              </div>

              {trendData.length > 0 && (
                <Card title="Report intake trend (last 14 days)">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: '1px solid #e5e7eb',
                            background: '#fff',
                            fontSize: 12,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="reports"
                          stroke="#1a73e8"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#1a73e8' }}
                        />
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
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Data completeness</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {qualityMetrics.total ? `${qualityMetrics.pctComplete}%` : '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">Title + location + description</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">With title</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {qualityMetrics.withTitle}/{qualityMetrics.total || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">With location</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {qualityMetrics.withLocation}/{qualityMetrics.total || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Incomplete</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-600">
                    {qualityMetrics.incomplete}
                  </p>
                </div>
              </div>
              <Card title="Quality rules">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Reports with missing title, location, or description are flagged as incomplete.</li>
                  <li>• Completeness % = (fields present) / (3 × total reports).</li>
                  <li>• All metrics are computed from the current reports feed.</li>
                </ul>
              </Card>
            </>
          )}

          {activeTab === 'sites' && (
            <>
              <Card title="Sites / tenants">
                {sitesFromReports.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-500">
                          <th className="pb-3 pr-4 font-medium">Site / Entity</th>
                          <th className="pb-3 pr-4 font-medium">Report count</th>
                          <th className="pb-3 font-medium">Last activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sitesFromReports.map((s) => (
                          <tr key={s.name} className="border-b border-gray-100">
                            <td className="py-3 pr-4 font-medium text-gray-900">{s.name}</td>
                            <td className="py-3 pr-4 text-gray-600">{s.count}</td>
                            <td className="py-3 text-gray-500">
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
                    <span className="text-sm font-medium text-gray-700">Nexus API (DPAL backend)</span>
                    <StatusBadge ok={health?.ok ?? false} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
                    <span className="text-sm font-medium text-gray-700">Reports feed</span>
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
