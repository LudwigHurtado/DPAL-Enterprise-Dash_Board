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

type TabId = 'overview' | 'quality' | 'sites';

const STATUS_COLORS: Record<string, string> = {
  New: '#f59e0b',
  Investigating: '#3b82f6',
  'Action Taken': '#8b5cf6',
  Resolved: '#22c55e',
};

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="text-sm font-semibold text-slate-200">{title}</div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {label ?? (ok ? 'Healthy' : 'Down')}
    </span>
  );
}

export default function MasterEnterpriseDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [apiBase, setApiBase] = useState('');
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [probes, setProbes] = useState<ProbeResult[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const base = getApiBase();
    setApiBase(base);
    setError(null);
    setLoading(true);
    try {
      const [healthRes, feedRes, probesRes] = await Promise.all([
        base ? checkHealth(base) : Promise.resolve(null),
        getReportsFeed({ limit: 200 }),
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
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

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
      .map(([name, reports: number]) => ({ name, reports }));
  }, [reports]);

  const navItems: { id: TabId; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'quality', label: 'Quality Control', icon: '✓' },
    { id: 'sites', label: 'Site Monitoring', icon: '🌐' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <div className="sticky top-0 z-20 border-b border-slate-700 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg font-bold">
              DPAL
            </div>
            <div>
              <div className="text-lg font-bold text-white">Master Enterprise Dashboard</div>
              <div className="text-xs text-slate-400">
                Quality control & site monitoring · {apiBase ? 'Connected' : 'No API base'}
                {lastSync && ` · Last sync ${lastSync.toLocaleTimeString()}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {apiBase ? (
              <StatusBadge ok={health?.ok ?? false} label={health?.ok ? 'API up' : 'API down'} />
            ) : (
              <span className="text-xs text-amber-400">Set NEXT_PUBLIC_DPAL_API_BASE</span>
            )}
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-600 disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-5 flex gap-5">
        <aside className="w-52 flex-shrink-0 hidden lg:block">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-3 sticky top-24">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-2">
              Sections
            </div>
            <nav className="space-y-0.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium flex items-center gap-2.5 transition-all ${
                    activeTab === item.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0 space-y-5">
          {error && (
            <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
              {error}
            </div>
          )}

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                  <div className="text-xs text-slate-500 font-medium">Total Reports</div>
                  <div className="mt-1 text-2xl font-bold text-white">{reports.length}</div>
                  <div className="mt-1 text-xs text-slate-500">From API feed</div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                  <div className="text-xs text-slate-500 font-medium">Open (New + Investigating)</div>
                  <div className="mt-1 text-2xl font-bold text-white">
                    {reports.filter((r) => ['New', 'Investigating'].includes(r.opsStatus || '')).length}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Requires action</div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                  <div className="text-xs text-slate-500 font-medium">API Latency</div>
                  <div className="mt-1 text-2xl font-bold text-white">
                    {health?.latencyMs != null ? `${health.latencyMs} ms` : '—'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Health endpoint</div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                  <div className="text-xs text-slate-500 font-medium">Endpoints OK</div>
                  <div className="mt-1 text-2xl font-bold text-white">
                    {probes.filter((p) => p.ok).length}/{probes.length || 1}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Probes</div>
                </div>
              </div>

              <Card title="System Health">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {probes.length ? (
                    probes.map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/30 p-3"
                      >
                        <span className="text-sm font-medium text-slate-300 capitalize">
                          {p.name.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{p.latencyMs} ms</span>
                          <StatusBadge ok={p.ok} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500 col-span-2">
                      Run probes by setting NEXT_PUBLIC_DPAL_API_BASE and refreshing.
                    </div>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card title="Reports by Status">
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
                            label={({ name, count }) => `${name}: ${count}`}
                          >
                            {byStatus.map((_, i) => (
                              <Cell key={i} fill={STATUS_COLORS[byStatus[i].name] || '#64748b'} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
                      No report data yet
                    </div>
                  )}
                </Card>
                <Card title="Reports by Severity">
                  {bySeverity.length ? (
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bySeverity} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 8,
                              border: '1px solid #334155',
                              background: '#1e293b',
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
                      No report data yet
                    </div>
                  )}
                </Card>
              </div>

              {trendData.length > 0 && (
                <Card title="Report intake trend (by date)">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: '1px solid #334155',
                            background: '#1e293b',
                            fontSize: 12,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="reports"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#6366f1' }}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                  <div className="text-xs text-slate-500 font-medium">Data completeness</div>
                  <div className="mt-1 text-2xl font-bold text-white">
                    {qualityMetrics.total ? `${qualityMetrics.pctComplete}%` : '—'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Title + location + description</div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                  <div className="text-xs text-slate-500 font-medium">With title</div>
                  <div className="mt-1 text-2xl font-bold text-white">
                    {qualityMetrics.withTitle}/{qualityMetrics.total || 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                  <div className="text-xs text-slate-500 font-medium">With location</div>
                  <div className="mt-1 text-2xl font-bold text-white">
                    {qualityMetrics.withLocation}/{qualityMetrics.total || 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                  <div className="text-xs text-slate-500 font-medium">Incomplete records</div>
                  <div className="mt-1 text-2xl font-bold text-amber-400">
                    {qualityMetrics.incomplete}
                  </div>
                </div>
              </div>
              <Card title="Quality rules (from live data)">
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• Reports with missing title, location, or description are flagged as incomplete.</li>
                  <li>• Completeness % = (fields present) / (3 × total reports).</li>
                  <li>• All metrics above are computed from the current reports feed.</li>
                </ul>
              </Card>
            </>
          )}

          {activeTab === 'sites' && (
            <>
              <Card title="Sites / tenants (from report entity data)">
                {sitesFromReports.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-left text-slate-400">
                          <th className="pb-2 pr-4 font-semibold">Site / Entity</th>
                          <th className="pb-2 pr-4 font-semibold">Report count</th>
                          <th className="pb-2 font-semibold">Last activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sitesFromReports.map((s) => (
                          <tr key={s.name} className="border-b border-slate-700/50">
                            <td className="py-3 pr-4 font-medium text-slate-200">{s.name}</td>
                            <td className="py-3 pr-4 text-slate-300">{s.count}</td>
                            <td className="py-3 text-slate-500">
                              {s.lastSeen ? new Date(s.lastSeen).toLocaleString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-sm">
                    No entity/site data in reports. Ensure the API returns entityName or entityType.
                  </div>
                )}
              </Card>
              <Card title="Platform status">
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/30 p-3">
                    <span className="text-sm font-medium text-slate-300">Nexus API (DPAL backend)</span>
                    <StatusBadge ok={health?.ok ?? false} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/30 p-3">
                    <span className="text-sm font-medium text-slate-300">Reports feed</span>
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
