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
import HelpCenterAdminTab from './HelpCenterAdminTab';
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

/* ══════════════════════════════════════════════════
   M3 DESIGN TOKENS  (Material Design 3 — DPAL palette)
══════════════════════════════════════════════════ */
const M3 = `
  :root {
    --md-pri:          #0077C8;
    --md-pri-con:      #D3E4FF;
    --md-on-pri:       #FFFFFF;
    --md-on-pri-con:   #00315E;

    --md-sec:          #2FB344;
    --md-sec-con:      #C3F5CE;
    --md-on-sec:       #FFFFFF;
    --md-on-sec-con:   #003911;

    --md-ter:          #F4A300;
    --md-ter-con:      #FFE0A0;
    --md-on-ter:       #FFFFFF;
    --md-on-ter-con:   #3A2700;

    --md-err:          #B3261E;
    --md-err-con:      #F9DEDC;
    --md-on-err:       #FFFFFF;

    --md-surf:         #F8FAFE;
    --md-surf-var:     #E1E5F0;
    --md-surf-con:     #EEF2F8;
    --md-surf-con-hi:  #E4E9F3;
    --md-surf-con-lo:  #F4F7FC;
    --md-on-surf:      #1A1C22;
    --md-on-surf-var:  #42474E;

    --md-outline:      #72787E;
    --md-outline-var:  #C2C7CF;

    --md-elev1: 0 1px 2px rgba(0,0,0,.08),0 1px 3px 1px rgba(0,0,0,.06);
    --md-elev2: 0 1px 2px rgba(0,0,0,.09),0 2px 6px 2px rgba(0,0,0,.07);
    --md-elev3: 0 4px 8px 3px rgba(0,0,0,.08),0 1px 3px rgba(0,0,0,.1);

    --nav-w: 80px;
    --nav-exp: 256px;
    --top-h: 64px;
  }

  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--md-outline-var); border-radius: 3px; }

  /* ── Shell ── */
  .m3-shell {
    display: flex;
    min-height: 100dvh;
    background: var(--md-surf-con);
    font-family: 'Google Sans', 'Segoe UI', system-ui, sans-serif;
    color: var(--md-on-surf);
  }

  /* ── Navigation Rail ── */
  .m3-rail {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    width: var(--nav-w);
    background: var(--md-surf-con-lo);
    border-right: 1px solid var(--md-outline-var);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 0 16px;
    z-index: 40;
    overflow: hidden;
    transition: width .25s cubic-bezier(.4,0,.2,1);
  }
  .m3-rail.expanded { width: var(--nav-exp); align-items: flex-start; }
  .m3-rail-logo {
    width: 48px; height: 48px;
    background: var(--md-pri);
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    color: var(--md-on-pri);
    font-size: 20px; font-weight: 900;
    flex-shrink: 0;
    margin-bottom: 8px;
    box-shadow: var(--md-elev2);
  }
  .m3-rail.expanded .m3-rail-logo { margin-left: 16px; }

  .m3-rail-fab {
    width: 56px; height: 56px;
    background: var(--md-ter-con);
    border-radius: 16px;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--md-on-ter-con);
    font-size: 22px;
    box-shadow: var(--md-elev2);
    transition: box-shadow .15s, background .15s;
    flex-shrink: 0;
    margin: 8px 0 16px;
  }
  .m3-rail-fab:hover { box-shadow: var(--md-elev3); background: #ffd56b; }
  .m3-rail.expanded .m3-rail-fab { margin-left: 12px; }

  .m3-rail-items { flex: 1; overflow-y: auto; overflow-x: hidden; width: 100%; padding: 0 8px; }
  .m3-rail-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 0;
    cursor: pointer;
    border: none;
    background: none;
    width: 100%;
    margin-bottom: 4px;
    text-decoration: none;
    gap: 2px;
  }
  .m3-rail.expanded .m3-rail-item { flex-direction: row; gap: 12px; padding: 0 8px; }

  .m3-rail-indicator {
    width: 56px; height: 32px;
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    transition: background .15s;
    flex-shrink: 0;
  }
  .m3-rail.expanded .m3-rail-indicator { width: 40px; height: 40px; border-radius: 20px; }
  .m3-rail-item:hover .m3-rail-indicator { background: rgba(0,119,200,.08); }
  .m3-rail-item.active .m3-rail-indicator { background: var(--md-pri-con); }

  .m3-rail-label {
    font-size: 11px; font-weight: 600;
    color: var(--md-on-surf-var);
    text-align: center;
    white-space: nowrap;
    line-height: 1;
  }
  .m3-rail.expanded .m3-rail-label { font-size: 13px; text-align: left; }
  .m3-rail-item.active .m3-rail-label { color: var(--md-pri); font-weight: 700; }

  .m3-rail-badge {
    position: absolute; top: 2px; right: 8px;
    min-width: 16px; height: 16px;
    background: var(--md-err); color: var(--md-on-err);
    border-radius: 8px; font-size: 9px; font-weight: 900;
    display: flex; align-items: center; justify-content: center;
    padding: 0 4px;
  }
  .m3-rail.expanded .m3-rail-badge { top: 8px; }

  .m3-rail-section {
    font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .15em;
    color: var(--md-outline); padding: 8px 12px 4px;
    white-space: nowrap;
  }
  .m3-rail:not(.expanded) .m3-rail-section { display: none; }

  .m3-rail-divider {
    width: 56px; height: 1px; background: var(--md-outline-var); margin: 6px auto;
  }
  .m3-rail.expanded .m3-rail-divider { width: calc(100% - 24px); margin: 6px 12px; }

  /* ── Main content ── */
  .m3-main {
    margin-left: var(--nav-w);
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    transition: margin-left .25s cubic-bezier(.4,0,.2,1);
  }
  .m3-main.rail-expanded { margin-left: var(--nav-exp); }

  /* ── Top app bar ── */
  .m3-topbar {
    position: sticky; top: 0; z-index: 30;
    height: var(--top-h);
    background: var(--md-surf);
    border-bottom: 1px solid var(--md-outline-var);
    display: flex; align-items: center;
    padding: 0 16px 0 20px;
    gap: 12px;
    box-shadow: var(--md-elev1);
  }
  .m3-topbar-title { font-size: 18px; font-weight: 700; color: var(--md-on-surf); flex: 1; min-width: 0; }
  .m3-topbar-sub { font-size: 11px; color: var(--md-on-surf-var); margin-top: 1px; }

  .m3-icon-btn {
    width: 40px; height: 40px; border-radius: 50%;
    border: none; background: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; color: var(--md-on-surf-var);
    transition: background .15s;
    flex-shrink: 0;
  }
  .m3-icon-btn:hover { background: rgba(0,0,0,.06); }

  .m3-search {
    display: flex; align-items: center; gap: 8px;
    background: var(--md-surf-con);
    border: 1px solid var(--md-outline-var);
    border-radius: 28px;
    padding: 6px 14px;
    flex: 1; max-width: 400px;
    font-size: 14px; color: var(--md-on-surf-var);
    cursor: text;
    transition: border-color .15s, box-shadow .15s;
  }
  .m3-search:focus-within { border-color: var(--md-pri); box-shadow: 0 0 0 2px rgba(0,119,200,.15); }
  .m3-search input { border: none; background: none; outline: none; flex: 1; font-size: 14px; color: var(--md-on-surf); }

  /* ── Chip ── */
  .m3-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 6px 12px;
    border-radius: 8px; border: 1px solid var(--md-outline-var);
    font-size: 12px; font-weight: 600;
    cursor: pointer; background: var(--md-surf);
    color: var(--md-on-surf-var);
    transition: all .15s;
    white-space: nowrap;
  }
  .m3-chip:hover { background: var(--md-surf-con); }
  .m3-chip.selected { background: var(--md-pri-con); color: var(--md-on-pri-con); border-color: var(--md-pri); }
  .m3-chip.pri { background: var(--md-pri); color: var(--md-on-pri); border-color: var(--md-pri); }

  /* ── Cards ── */
  .m3-card {
    background: var(--md-surf);
    border-radius: 16px;
    box-shadow: var(--md-elev1);
    overflow: hidden;
  }
  .m3-card-outlined {
    background: var(--md-surf);
    border-radius: 16px;
    border: 1px solid var(--md-outline-var);
    overflow: hidden;
  }
  .m3-card-filled {
    border-radius: 16px;
    overflow: hidden;
  }

  /* ── KPI cards ── */
  .m3-kpi {
    padding: 20px 20px 16px;
    border-radius: 16px;
    display: flex; flex-direction: column; gap: 6px;
    transition: box-shadow .15s;
  }
  .m3-kpi:hover { box-shadow: var(--md-elev3); }
  .m3-kpi-icon { font-size: 24px; margin-bottom: 4px; }
  .m3-kpi-num { font-size: 36px; font-weight: 900; line-height: 1; letter-spacing: -.02em; }
  .m3-kpi-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; opacity: .75; }
  .m3-kpi-sub { font-size: 11px; opacity: .6; margin-top: 2px; }

  /* ── Status badge ── */
  .m3-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;
  }
  .m3-badge-dot { width: 6px; height: 6px; border-radius: 50%; }

  /* ── List item ── */
  .m3-list-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--md-outline-var);
    cursor: pointer;
    transition: background .1s;
  }
  .m3-list-item:last-child { border-bottom: none; }
  .m3-list-item:hover { background: var(--md-surf-con); }

  .m3-list-icon {
    width: 40px; height: 40px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
  }

  /* ── Button ── */
  .m3-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 20px; border-radius: 20px; border: none;
    font-size: 13px; font-weight: 700; cursor: pointer;
    transition: box-shadow .15s, background .15s;
  }
  .m3-btn-filled { background: var(--md-pri); color: var(--md-on-pri); }
  .m3-btn-filled:hover { box-shadow: var(--md-elev2); }
  .m3-btn-tonal { background: var(--md-pri-con); color: var(--md-on-pri-con); }
  .m3-btn-tonal:hover { box-shadow: var(--md-elev1); }
  .m3-btn-text { background: transparent; color: var(--md-pri); }
  .m3-btn-text:hover { background: rgba(0,119,200,.08); }
  .m3-btn-outlined { background: transparent; color: var(--md-pri); border: 1px solid var(--md-outline-var); }
  .m3-btn-outlined:hover { background: rgba(0,119,200,.05); }

  /* ── Divider ── */
  .m3-divider { height: 1px; background: var(--md-outline-var); margin: 0; }

  /* ── Progress bar ── */
  .m3-progress-track { height: 8px; background: var(--md-surf-con-hi); border-radius: 4px; overflow: hidden; }
  .m3-progress-fill { height: 100%; border-radius: 4px; transition: width .4s; }

  /* ── Tooltip ── */
  .recharts-tooltip-wrapper .recharts-default-tooltip {
    background: var(--md-surf) !important;
    border: 1px solid var(--md-outline-var) !important;
    border-radius: 12px !important;
    box-shadow: var(--md-elev2) !important;
    font-size: 12px !important;
  }

  /* ── Content area ── */
  .m3-content { flex: 1; padding: 24px; overflow-y: auto; }

  /* ── Grid ── */
  .m3-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
  .m3-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
  .m3-grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }
  @media(max-width:1200px){ .m3-grid-4 { grid-template-columns: repeat(2,1fr); } }
  @media(max-width:900px){
    .m3-grid-4, .m3-grid-3 { grid-template-columns: repeat(2,1fr); }
    .m3-rail { display: none; }
    .m3-main { margin-left: 0 !important; }
  }
  @media(max-width:600px){
    .m3-grid-4, .m3-grid-3, .m3-grid-2 { grid-template-columns: 1fr; }
    .m3-content { padding: 16px; }
  }

  /* ── Connection banner ── */
  .m3-connect-banner {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; padding: 48px 24px; text-align: center;
  }
  .m3-connect-icon { font-size: 56px; margin-bottom: 8px; }

  /* ── Snackbar ── */
  @keyframes m3-snack-in { from { transform: translateY(80px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .m3-snackbar {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--md-on-surf); color: var(--md-surf);
    padding: 12px 20px; border-radius: 4px;
    font-size: 13px; font-weight: 600;
    box-shadow: var(--md-elev3);
    z-index: 9999;
    animation: m3-snack-in .25s cubic-bezier(.4,0,.2,1);
    max-width: calc(100vw - 48px);
  }

  /* ── Expand toggle ── */
  .m3-expand-btn {
    width: 32px; height: 32px; border-radius: 50%;
    border: 1px solid var(--md-outline-var);
    background: var(--md-surf); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: var(--md-on-surf-var);
    flex-shrink: 0;
    transition: background .15s;
  }
  .m3-expand-btn:hover { background: var(--md-surf-con); }
`;

/* ══════════════════════════════════════════════════
   NAV ITEMS
══════════════════════════════════════════════════ */
type TabId = 'overview' | 'reports' | 'helpCenter' | 'triage' | 'ledger' | 'evidence' | 'investigations' | 'alerts' | 'aiTasks' | 'users' | 'audit' | 'integrations' | 'settings';

const NAV_ITEMS: { id: TabId; icon: string; label: string; section?: string; badge?: number }[] = [
  { id: 'overview',       icon: '◼',  label: 'Overview',        section: 'Platform' },
  { id: 'reports',        icon: '📋', label: 'Reports',         badge: 0 },
  { id: 'helpCenter',     icon: '🎫', label: 'Help Center',     badge: 0 },
  { id: 'triage',         icon: '⚡', label: 'Triage',          section: 'Operations' },
  { id: 'investigations', icon: '🔍', label: 'Investigations' },
  { id: 'alerts',         icon: '🔔', label: 'Alerts',          badge: 0 },
  { id: 'ledger',         icon: '🔗', label: 'Ledger',          section: 'Records' },
  { id: 'evidence',       icon: '📁', label: 'Evidence' },
  { id: 'aiTasks',        icon: '🤖', label: 'AI Tasks',        section: 'Admin' },
  { id: 'users',          icon: '👥', label: 'Users' },
  { id: 'audit',          icon: '📜', label: 'Audit Log' },
  { id: 'integrations',   icon: '🔌', label: 'Integrations' },
  { id: 'settings',       icon: '⚙️', label: 'Settings' },
];

/* ══════════════════════════════════════════════════
   STATUS HELPERS
══════════════════════════════════════════════════ */
const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  New:            { bg: '#FFF8E1', color: '#E65100', dot: '#F57C00' },
  Investigating:  { bg: '#E3F2FD', color: '#1565C0', dot: '#1976D2' },
  'Action Taken': { bg: '#F3E5F5', color: '#6A1B9A', dot: '#8E24AA' },
  Resolved:       { bg: '#E8F5E9', color: '#1B5E20', dot: '#2E7D32' },
  critical:       { bg: '#FFEBEE', color: '#B71C1C', dot: '#C62828' },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: '#F5F5F5', color: '#616161', dot: '#9E9E9E' };
  return (
    <span className="m3-badge" style={{ background: s.bg, color: s.color }}>
      <span className="m3-badge-dot" style={{ background: s.dot }} />
      {status}
    </span>
  );
}

const STORAGE_KEY = 'dpal_api_base_override';

/* ══════════════════════════════════════════════════
   PLACEHOLDER MODULE
══════════════════════════════════════════════════ */
function PlaceholderModule({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 16, padding: 48, textAlign: 'center' }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: 'var(--md-pri-con)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>{icon}</div>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--md-on-surf)', margin: '0 0 8px' }}>{title}</h2>
        <p style={{ fontSize: 13, color: 'var(--md-on-surf-var)', margin: 0, maxWidth: 400 }}>{description}</p>
      </div>
      <span className="m3-chip" style={{ background: 'var(--md-ter-con)', color: 'var(--md-on-ter-con)', borderColor: 'transparent' }}>🔧 Connect API to activate</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════ */
export default function MasterEnterpriseDashboard() {
  const [activeTab, setActiveTab]       = useState<TabId>('overview');
  const [railExpanded, setRailExpanded] = useState(false);
  const [apiBase, setApiBase]           = useState('');
  const [effectiveBase, setEffectiveBase] = useState('');
  const [useDemoData, setUseDemoData]   = useState(false);
  const [health, setHealth]             = useState<HealthResult | null>(null);
  const [probes, setProbes]             = useState<ProbeResult[]>([]);
  const [reports, setReports]           = useState<ReportItem[]>([]);
  const [loading, setLoading]           = useState(false);
  const [snack, setSnack]               = useState('');
  const [searchQ, setSearchQ]           = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const toast = (msg: string) => {
    setSnack(msg);
    setTimeout(() => setSnack(''), 3500);
  };

  // Load persisted API base
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) ?? '';
      setApiBase(stored);
    } catch { /* ignore */ }
    const envBase = getApiBase();
    const stored  = (() => { try { return localStorage.getItem(STORAGE_KEY) ?? ''; } catch { return ''; } })();
    setEffectiveBase(stored || envBase);
  }, []);

  const sync = useCallback(async () => {
    const base = effectiveBase;
    if (!base && !useDemoData) return;
    setLoading(true);
    try {
      if (useDemoData) {
        setReports([
          { reportId: 'DEMO-001', title: 'Workplace hazard — Zone B', category: 'Safety', severity: 'high', opsStatus: 'Investigating', location: 'La Paz, Bolivia', createdAt: new Date().toISOString() },
          { reportId: 'DEMO-002', title: 'Road condition report', category: 'Infrastructure', severity: 'normal', opsStatus: 'New', location: 'Cochabamba, Bolivia', createdAt: new Date().toISOString() },
          { reportId: 'DEMO-003', title: 'Environmental concern', category: 'Environment', severity: 'low', opsStatus: 'Resolved', location: 'Santa Cruz, Bolivia', createdAt: new Date().toISOString() },
          { reportId: 'DEMO-004', title: 'Public safety alert', category: 'Safety', severity: 'critical', opsStatus: 'New', location: 'Oruro, Bolivia', createdAt: new Date().toISOString() },
          { reportId: 'DEMO-005', title: 'Police misconduct incident', category: 'Police', severity: 'high', opsStatus: 'Investigating', location: 'Potosí, Bolivia', createdAt: new Date().toISOString() },
        ]);
        toast('Sample data loaded');
        setLoading(false);
        return;
      }
      const [h, p, r] = await Promise.all([
        checkHealth(base),
        runProbes(base),
        getReportsFeed({ limit: 50, apiBase: base }),
      ]);
      setHealth(h);
      setProbes(p);
      if (r.ok) setReports(r.items);
      toast(`Synced — ${r.items.length} report(s) loaded`);
    } catch (e) {
      toast('Sync failed — check API connection');
    }
    setLoading(false);
  }, [effectiveBase, useDemoData]);

  // Auto-sync on mount
  useEffect(() => { void sync(); }, []);  // eslint-disable-line

  const saveApiBase = () => {
    try { localStorage.setItem(STORAGE_KEY, apiBase); } catch { /* ignore */ }
    setEffectiveBase(apiBase || getApiBase());
    setShowSettings(false);
    toast('API base saved');
    setTimeout(() => void sync(), 200);
  };

  /* ── Derived stats ── */
  const total     = reports.length;
  const openCount = reports.filter(r => r.opsStatus !== 'Resolved').length;
  const critical  = reports.filter(r => (r.severity || '').toLowerCase() === 'critical' || (r.severity || '').toLowerCase() === 'high').length;
  const resolved  = reports.filter(r => r.opsStatus === 'Resolved').length;

  const byStatus = Object.entries(
    reports.reduce<Record<string, number>>((acc, r) => {
      const k = r.opsStatus || 'New';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const byCategory = Object.entries(
    reports.reduce<Record<string, number>>((acc, r) => {
      const k = r.category || 'Unknown';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).slice(0, 6);

  const PIE_COLORS = ['#0077C8', '#2FB344', '#F4A300', '#B3261E', '#9334E6', '#1565C0'];

  const filteredReports = searchQ.trim()
    ? reports.filter(r =>
        r.title?.toLowerCase().includes(searchQ.toLowerCase()) ||
        r.category?.toLowerCase().includes(searchQ.toLowerCase()) ||
        r.location?.toLowerCase().includes(searchQ.toLowerCase())
      )
    : reports;

  const isConnected = !!(effectiveBase || useDemoData || reports.length);
  const env = effectiveBase?.includes('localhost') ? 'Dev' : effectiveBase ? 'Production' : 'Staging';

  /* ─────────────────────────────────────────
     OVERVIEW TAB
  ───────────────────────────────────────── */
  const OverviewTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Connection banner when not connected */}
      {!isConnected && (
        <div className="m3-card-outlined" style={{ borderColor: '#FFF8E1', background: '#FFFDE7' }}>
          <div className="m3-connect-banner">
            <div className="m3-connect-icon">🔌</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--md-on-surf)', margin: 0 }}>HQ is not connected yet</h2>
            <p style={{ fontSize: 14, color: 'var(--md-on-surf-var)', margin: 0, maxWidth: 480 }}>
              Connect your DPAL backend API to activate live reports, health monitoring, analytics, and oversight tools.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="m3-btn m3-btn-filled" onClick={() => setShowSettings(true)}>🔗 Connect API</button>
              <button className="m3-btn m3-btn-tonal" onClick={() => { setUseDemoData(true); void sync(); }}>📦 Load sample data</button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {isConnected && (
        <>
          <div className="m3-grid-4">
            {[
              { icon: '📊', num: total,     label: 'Total Reports',  sub: 'All time',        bg: '#EEF2FF', color: '#3730A3', numCol: '#0077C8' },
              { icon: '⏳', num: openCount, label: 'Open Cases',     sub: 'Awaiting action', bg: '#FFF8E1', color: '#E65100', numCol: '#F57C00' },
              { icon: '🚨', num: critical,  label: 'High Priority',  sub: 'Needs attention', bg: '#FFEBEE', color: '#B71C1C', numCol: '#C62828' },
              { icon: '✅', num: resolved,  label: 'Resolved',       sub: 'Completed',       bg: '#E8F5E9', color: '#1B5E20', numCol: '#2E7D32' },
            ].map(k => (
              <div key={k.label} className="m3-kpi m3-card" style={{ background: k.bg }}>
                <div className="m3-kpi-icon">{k.icon}</div>
                <div className="m3-kpi-num" style={{ color: k.numCol }}>{k.num}</div>
                <div className="m3-kpi-label" style={{ color: k.color }}>{k.label}</div>
                <div className="m3-kpi-sub" style={{ color: k.color }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="m3-grid-2">
            {/* Status distribution */}
            <div className="m3-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--md-on-surf)', margin: '0 0 16px' }}>Reports by Status</h3>
              {byStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} dataKey="value">
                      {byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--md-on-surf-var)', fontSize: 13 }}>No data yet</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 8 }}>
                {byStatus.map((s, i) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--md-on-surf-var)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </div>

            {/* Category bar chart */}
            <div className="m3-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--md-on-surf)', margin: '0 0 16px' }}>Reports by Category</h3>
              {byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byCategory} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--md-outline-var)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--md-on-surf-var)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--md-on-surf-var)' }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--md-pri)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--md-on-surf-var)', fontSize: 13 }}>No data yet</div>
              )}
            </div>
          </div>

          {/* System health + recent reports */}
          <div className="m3-grid-2">
            {/* System health */}
            <div className="m3-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--md-outline-var)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--md-on-surf)' }}>System Health</h3>
                <button className="m3-btn m3-btn-text" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => void sync()}>
                  {loading ? '⏳' : '↺'} Refresh
                </button>
              </div>
              <div>
                {[
                  { label: 'API Backend',   ok: health?.ok ?? false,          latency: health?.latencyMs },
                  { label: 'Reports Feed',  ok: reports.length > 0 || useDemoData, latency: probes.find(p => p.name === 'reportsFeed')?.latencyMs },
                  { label: 'Health Probe',  ok: probes.length > 0,            latency: probes.find(p => p.name === 'health')?.latencyMs },
                  { label: 'DPAL Private Chain', ok: reports.length > 0, latency: undefined },
                ].map(s => (
                  <div key={s.label} className="m3-list-item">
                    <div className="m3-list-icon" style={{ background: s.ok ? 'var(--md-sec-con)' : '#FFEBEE', fontSize: 16 }}>
                      {s.ok ? '✅' : '❌'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--md-on-surf)' }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--md-on-surf-var)', marginTop: 1 }}>
                        {s.ok ? 'Operational' : 'Not connected'}
                        {s.latency != null && ` · ${s.latency}ms`}
                      </div>
                    </div>
                    <span className="m3-badge" style={s.ok
                      ? { background: 'var(--md-sec-con)', color: 'var(--md-on-sec-con)' }
                      : { background: 'var(--md-err-con)', color: 'var(--md-err)' }}>
                      <span className="m3-badge-dot" style={{ background: s.ok ? 'var(--md-sec)' : 'var(--md-err)' }} />
                      {s.ok ? 'Online' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent reports */}
            <div className="m3-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--md-outline-var)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--md-on-surf)' }}>Recent Reports</h3>
                <button className="m3-btn m3-btn-text" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setActiveTab('reports')}>
                  View all →
                </button>
              </div>
              <div>
                {reports.slice(0, 5).map((r, i) => (
                  <div key={r.reportId ?? i} className="m3-list-item">
                    <div className="m3-list-icon" style={{ background: 'var(--md-pri-con)', fontSize: 15 }}>
                      {r.category === 'Safety' ? '⚠️' : r.category === 'Police' ? '🚔' : '📋'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--md-on-surf)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || 'Untitled report'}</div>
                      <div style={{ fontSize: 10, color: 'var(--md-on-surf-var)', marginTop: 1 }}>
                        {r.category} · {r.location ?? '—'} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <StatusChip status={r.opsStatus ?? 'New'} />
                  </div>
                ))}
                {reports.length === 0 && (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--md-on-surf-var)', fontSize: 13 }}>
                    No reports yet — connect API or load sample data
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="m3-card-outlined" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--md-on-surf)', margin: '0 0 14px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { icon: '🎫', label: 'Open Help Center',  onClick: () => setActiveTab('helpCenter') },
                { icon: '📋', label: 'View All Reports',  onClick: () => setActiveTab('reports') },
                { icon: '🔔', label: 'Check Alerts',      onClick: () => setActiveTab('alerts') },
                { icon: '🤖', label: 'AI Task Queue',     onClick: () => setActiveTab('aiTasks') },
                { icon: '↺',  label: 'Sync Data',         onClick: () => void sync() },
                { icon: '⚙️', label: 'Settings',          onClick: () => setShowSettings(true) },
              ].map(a => (
                <button key={a.label} className="m3-btn m3-btn-outlined" onClick={a.onClick}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Next steps */}
          <div className="m3-card" style={{ padding: 20, background: 'var(--md-pri-con)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--md-on-pri-con)', margin: '0 0 12px' }}>Setup Checklist</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { done: !!effectiveBase, label: 'Connect main DPAL backend API' },
                { done: health?.ok ?? false, label: 'Verify health probe passes' },
                { done: reports.length > 0, label: 'Load reports from API feed' },
                { done: false, label: 'Configure Supabase Help Center database' },
                { done: false, label: 'Set admin secret for admin endpoints' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: step.done ? 'var(--md-sec)' : 'var(--md-outline-var)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: 'white', fontWeight: 900
                  }}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: step.done ? 400 : 600, color: 'var(--md-on-pri-con)', textDecoration: step.done ? 'line-through' : 'none', opacity: step.done ? .6 : 1 }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  /* ─────────────────────────────────────────
     REPORTS TAB
  ───────────────────────────────────────── */
  const ReportsTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="m3-search" style={{ flex: '1 1 240px' }}>
          🔍 <input placeholder="Search reports…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        </div>
        {['New', 'Investigating', 'Action Taken', 'Resolved'].map(s => (
          <span key={s} className="m3-chip" onClick={() => setSearchQ(searchQ === s ? '' : s)}
            style={searchQ === s ? { background: 'var(--md-pri-con)', color: 'var(--md-on-pri-con)', borderColor: 'var(--md-pri)' } : {}}>
            {s}
          </span>
        ))}
        <button className="m3-btn m3-btn-tonal" style={{ marginLeft: 'auto' }} onClick={() => void sync()}>
          {loading ? '⏳' : '↺'} Refresh
        </button>
      </div>

      <div className="m3-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--md-surf-con)' }}>
                {['Report ID', 'Title', 'Category', 'Severity', 'Status', 'Location', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--md-on-surf-var)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--md-outline-var)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReports.slice(0, 30).map((r, i) => (
                <tr key={r.reportId ?? i} style={{ borderBottom: '1px solid var(--md-surf-var)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-surf-con)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--md-pri)', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.reportId}</td>
                  <td style={{ padding: '10px 14px', maxWidth: 240 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--md-on-surf)' }}>{r.title || '—'}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--md-on-surf-var)' }}>{r.category || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className="m3-badge" style={{ background: (r.severity || '').toLowerCase() === 'critical' || (r.severity || '').toLowerCase() === 'high' ? '#FFEBEE' : '#F5F5F5', color: (r.severity || '').toLowerCase() === 'critical' || (r.severity || '').toLowerCase() === 'high' ? '#C62828' : '#616161' }}>
                      {r.severity || 'normal'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}><StatusChip status={r.opsStatus ?? 'New'} /></td>
                  <td style={{ padding: '10px 14px', color: 'var(--md-on-surf-var)', fontSize: 11, whiteSpace: 'nowrap' }}>{r.location || '—'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--md-on-surf-var)', fontSize: 10, whiteSpace: 'nowrap' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredReports.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--md-on-surf-var)', fontSize: 13 }}>
              {reports.length === 0 ? 'No reports — connect API or load sample data' : 'No results match your filter'}
            </div>
          )}
        </div>
        {filteredReports.length > 0 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--md-outline-var)', fontSize: 11, color: 'var(--md-on-surf-var)' }}>
            Showing {Math.min(30, filteredReports.length)} of {filteredReports.length} reports
          </div>
        )}
      </div>
    </div>
  );

  /* ─────────────────────────────────────────
     SETTINGS PANEL (floating)
  ───────────────────────────────────────── */
  const SettingsPanel = showSettings && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="m3-card" style={{ width: '100%', maxWidth: 520, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>⚙️ API Configuration</h2>
          <button className="m3-icon-btn" onClick={() => setShowSettings(false)}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--md-on-surf-var)', margin: '0 0 16px', lineHeight: 1.6 }}>
          Enter your DPAL backend Railway URL. This will be used for health checks, reports feed, and admin endpoints.
        </p>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--md-on-surf-var)', marginBottom: 6 }}>
          Backend URL
        </label>
        <input
          value={apiBase}
          onChange={e => setApiBase(e.target.value)}
          placeholder="https://your-backend.up.railway.app"
          style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--md-outline-var)', borderRadius: 12, fontSize: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="m3-btn m3-btn-filled" onClick={saveApiBase}>💾 Save & Connect</button>
          <button className="m3-btn m3-btn-tonal" onClick={() => { setUseDemoData(true); setShowSettings(false); void sync(); }}>📦 Use Demo Data</button>
          <button className="m3-btn m3-btn-text" onClick={() => setShowSettings(false)}>Cancel</button>
        </div>
        {effectiveBase && (
          <p style={{ fontSize: 11, color: 'var(--md-sec)', fontWeight: 700, marginTop: 12 }}>
            ✓ Currently connected: {effectiveBase}
          </p>
        )}
      </div>
    </div>
  );

  /* ─────────────────────────────────────────
     TAB TITLE
  ───────────────────────────────────────── */
  const tabTitle: Record<TabId, string> = {
    overview:       'Overview',
    reports:        'Reports Command Center',
    helpCenter:     'Help Center',
    triage:         'Triage Queue',
    ledger:         'Ledger & Verification',
    evidence:       'Evidence Management',
    investigations: 'Investigation Workspace',
    alerts:         'Alerts & Watchlist',
    aiTasks:        'AI Orchestration',
    users:          'Users & Roles',
    audit:          'Audit & Compliance',
    integrations:   'Integrations',
    settings:       'Settings',
  };

  const helpCenterCount = 0; // will update once API connected

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <>
      <style>{M3}</style>

      <div className="m3-shell">

        {/* ── Navigation Rail ── */}
        <nav className={`m3-rail${railExpanded ? ' expanded' : ''}`}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: railExpanded ? '0 16px' : '0 auto', marginBottom: 4, width: '100%' }}>
            <div className="m3-rail-logo" onClick={() => setRailExpanded(!railExpanded)} style={{ cursor: 'pointer' }}>D</div>
            {railExpanded && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--md-on-surf)', whiteSpace: 'nowrap' }}>DPAL HQ</div>
                <div style={{ fontSize: 9, color: 'var(--md-on-surf-var)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Enterprise</div>
              </div>
            )}
          </div>

          {/* FAB */}
          <div style={{ padding: railExpanded ? '0 12px' : '0 auto', width: '100%', display: 'flex', justifyContent: railExpanded ? 'flex-start' : 'center' }}>
            <button className="m3-rail-fab" onClick={() => void sync()} title="Sync">
              {loading ? '⏳' : '↺'}
            </button>
          </div>

          {/* Nav items */}
          <div className="m3-rail-items">
            {NAV_ITEMS.map((item, idx) => (
              <React.Fragment key={item.id}>
                {item.section && <div className="m3-rail-section">{item.section}</div>}
                {idx > 0 && NAV_ITEMS[idx - 1].section && !item.section && <div className="m3-rail-divider" />}
                <button
                  className={`m3-rail-item${activeTab === item.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                >
                  <div className="m3-rail-indicator">{item.icon}</div>
                  <div className="m3-rail-label">{item.label}</div>
                  {item.badge != null && reports.length > 0 && item.id === 'reports' && (
                    <div className="m3-rail-badge">{reports.length}</div>
                  )}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Connected status at bottom */}
          <div style={{ padding: railExpanded ? '8px 16px' : '8px 8px', width: '100%', display: 'flex', justifyContent: railExpanded ? 'flex-start' : 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? 'var(--md-sec)' : 'var(--md-err)', flexShrink: 0 }} />
              {railExpanded && <span style={{ fontSize: 10, color: 'var(--md-on-surf-var)', fontWeight: 700 }}>{isConnected ? 'Connected' : 'Not connected'}</span>}
            </div>
          </div>
        </nav>

        {/* ── Main ── */}
        <div className={`m3-main${railExpanded ? ' rail-expanded' : ''}`}>

          {/* Top App Bar */}
          <header className="m3-topbar">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="m3-topbar-title">{tabTitle[activeTab]}</div>
              <div className="m3-topbar-sub">
                {isConnected ? `${total} reports · ${env} · ${new Date().toLocaleTimeString()}` : 'Not connected — click ↺ to sync'}
              </div>
            </div>
            <div className="m3-search" style={{ flex: '0 0 220px' }}>
              🔍 <input placeholder="Search…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
            <button className="m3-icon-btn" title="Settings" onClick={() => setShowSettings(true)}>⚙️</button>
            <button className="m3-icon-btn" title="Sync" onClick={() => void sync()}>{loading ? '⏳' : '↺'}</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="m3-chip" style={{ padding: '4px 10px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? 'var(--md-sec)' : 'var(--md-err)' }} />
                {isConnected ? env : 'Offline'}
              </span>
            </div>
          </header>

          {/* Content */}
          <main className="m3-content">
            {activeTab === 'overview'       && OverviewTab}
            {activeTab === 'reports'        && ReportsTab}
            {activeTab === 'helpCenter'     && (
              <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 88px)', overflow: 'hidden', borderRadius: 16, border: '1px solid var(--md-outline-var)', background: 'white' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--md-outline-var)', background: 'var(--md-pri)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, borderRadius: '16px 16px 0 0' }}>
                  <span style={{ fontSize: 20 }}>🎫</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 900, color: 'white', margin: 0 }}>Help Center — Report Management</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.15em', margin: '2px 0 0' }}>
                      Supabase Postgres · Prisma ORM · Zod validated
                    </p>
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <HelpCenterAdminTab />
                </div>
              </div>
            )}
            {activeTab === 'triage'         && <PlaceholderModule icon="⚡" title="Triage Queue" description="Intake normalization, triage scoring, state transitions, and routing. Connect backend /api/v1/triage/* to activate." />}
            {activeTab === 'ledger'         && <PlaceholderModule icon="🔗" title="Ledger & Verification" description="DPAL Private Chain entries, hash verification, pending anchors, and validator network. Connect backend to activate." />}
            {activeTab === 'evidence'       && <PlaceholderModule icon="📁" title="Evidence Management" description="Upload, preview, hash verification, integrity checks, and request review. Connect /api/v1/evidence/* to activate." />}
            {activeTab === 'investigations' && <PlaceholderModule icon="🔍" title="Investigation Workspace" description="Timeline, linked reports, relationship graph, case notes, subtasks, and export packet. Connect backend to activate." />}
            {activeTab === 'alerts'         && <PlaceholderModule icon="🔔" title="Alerts & Watchlist" description="Anomaly detection, spikes, repeated patterns, endpoint failures, and ledger mismatches." />}
            {activeTab === 'aiTasks'        && <PlaceholderModule icon="🤖" title="AI Orchestration" description="Classify, summarize, detect duplicates, risk score, and route recommendations with human review." />}
            {activeTab === 'users'          && <PlaceholderModule icon="👥" title="Users & Roles" description="Manage moderators, investigators, legal reviewers, and validators. RBAC permission control." />}
            {activeTab === 'audit'          && <PlaceholderModule icon="📜" title="Audit & Compliance" description="Full actor-action-state audit trail filterable by actor, object, date, action type, and jurisdiction." />}
            {activeTab === 'integrations'   && <PlaceholderModule icon="🔌" title="Integrations" description="Service registry, base URLs, health paths, auth methods, and endpoint testing." />}
            {activeTab === 'settings'       && (
              <div style={{ maxWidth: 600 }}>
                <div className="m3-card" style={{ padding: 28 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 20px' }}>⚙️ API Configuration</h2>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--md-on-surf-var)', marginBottom: 6 }}>Backend URL</label>
                  <input value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder="https://your-backend.up.railway.app"
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--md-outline-var)', borderRadius: 12, fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="m3-btn m3-btn-filled" onClick={saveApiBase}>💾 Save & Connect</button>
                    <button className="m3-btn m3-btn-tonal" onClick={() => { setUseDemoData(true); void sync(); }}>📦 Use Demo Data</button>
                  </div>
                  {effectiveBase && <p style={{ fontSize: 12, color: 'var(--md-sec)', fontWeight: 700, marginTop: 12 }}>✓ Currently: {effectiveBase}</p>}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Settings modal */}
      {SettingsPanel}

      {/* Snackbar */}
      {snack && <div className="m3-snackbar">{snack}</div>}
    </>
  );
}
