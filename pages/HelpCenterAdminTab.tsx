'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getHelpReports,
  getHelpStats,
  getHelpReportDetail,
  updateHelpReportStatus,
  addHelpReportNote,
  assignHelpReport,
  type HelpReportRow,
  type HelpReportDetail,
  type HelpReportStatus,
  type HelpReportUrgency,
  type AdminListParams,
} from '@/src/lib/help-center-api';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<HelpReportStatus, string> = {
  submitted:          'Submitted',
  under_review:       'Under Review',
  awaiting_contact:   'Awaiting Contact',
  awaiting_documents: 'Awaiting Documents',
  assigned:           'Assigned',
  in_progress:        'In Progress',
  referred_out:       'Referred Out',
  resolved:           'Resolved',
  closed:             'Closed',
  rejected:           'Rejected',
  duplicate:          'Duplicate',
};

const STATUS_COLORS: Record<HelpReportStatus, { bg: string; text: string; dot: string }> = {
  submitted:          { bg: '#F9FAFB', text: '#374151', dot: '#9CA3AF' },
  under_review:       { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  awaiting_contact:   { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
  awaiting_documents: { bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  assigned:           { bg: '#F0F9FF', text: '#075985', dot: '#0EA5E9' },
  in_progress:        { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  referred_out:       { bg: '#FAF5FF', text: '#6B21A8', dot: '#A855F7' },
  resolved:           { bg: '#F0FDF4', text: '#166534', dot: '#22C55E' },
  closed:             { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF' },
  rejected:           { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' },
  duplicate:          { bg: '#FAFAFA', text: '#6B7280', dot: '#D1D5DB' },
};

const URGENCY_COLORS: Record<HelpReportUrgency, { bg: string; text: string }> = {
  low:       { bg: '#F9FAFB', text: '#6B7280' },
  normal:    { bg: '#EFF6FF', text: '#1D4ED8' },
  high:      { bg: '#FFFBEB', text: '#B45309' },
  urgent:    { bg: '#FEF2F2', text: '#B91C1C' },
  emergency: { bg: '#450A0A', text: '#FCA5A5' },
};

const ALL_STATUSES = Object.keys(STATUS_LABELS) as HelpReportStatus[];
const ALL_URGENCIES: HelpReportUrgency[] = ['low', 'normal', 'high', 'urgent', 'emergency'];

// ─── Helper components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: HelpReportStatus }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.submitted;
  return (
    <span style={{ background: c.bg, color: c.text, display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
      padding: '2px 8px', borderRadius: 20 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: HelpReportUrgency }) {
  const c = URGENCY_COLORS[urgency] ?? URGENCY_COLORS.normal;
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 20 }}>
      {urgency}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function HelpCenterAdminTab() {
  const [rows, setRows]           = useState<HelpReportRow[]>([]);
  const [meta, setMeta]           = useState({ total: 0, page: 1, limit: 25, totalPages: 0 });
  const [stats, setStats]         = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<HelpReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteBody, setNoteBody]   = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [statusBusy, setStatusBusy]   = useState(false);
  const [assignBusy, setAssignBusy]   = useState(false);
  const [assignTo, setAssignTo]       = useState('');

  const [filters, setFilters] = useState<AdminListParams>({
    page: 1, limit: 25, sortBy: 'createdAt', sortDir: 'desc',
  });
  const [searchDraft, setSearchDraft] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadList = useCallback(async (params: AdminListParams) => {
    setLoading(true);
    const res = await getHelpReports(params);
    if (res.ok) { setRows(res.data); setMeta(res.meta); }
    setLoading(false);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await getHelpStats();
    if (res.ok) setStats(res.stats);
  }, []);

  useEffect(() => { void loadList(filters); void loadStats(); }, []);

  const applyFilters = (patch: Partial<AdminListParams>) => {
    const next = { ...filters, ...patch, page: 1 };
    setFilters(next);
    void loadList(next);
  };

  const handleSearch = (v: string) => {
    setSearchDraft(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => applyFilters({ search: v || undefined }), 400);
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    const res = await getHelpReportDetail(id);
    if (res.ok && res.report) setSelected(res.report);
    setDetailLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: HelpReportStatus) => {
    setStatusBusy(true);
    await updateHelpReportStatus(id, newStatus);
    await loadList(filters);
    if (selected?.id === id) await openDetail(id);
    setStatusBusy(false);
  };

  const handleAddNote = async () => {
    if (!selected || !noteBody.trim()) return;
    setNoteLoading(true);
    await addHelpReportNote(selected.id, noteBody.trim());
    setNoteBody('');
    await openDetail(selected.id);
    setNoteLoading(false);
  };

  const handleAssign = async () => {
    if (!selected || !assignTo.trim()) return;
    setAssignBusy(true);
    await assignHelpReport(selected.id, assignTo.trim());
    setAssignTo('');
    await loadList(filters);
    await openDetail(selected.id);
    setAssignBusy(false);
  };

  const paginate = (p: number) => {
    const next = { ...filters, page: p };
    setFilters(next);
    void loadList(next);
  };

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', minHeight: 0, overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── LEFT: list + filters ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid #E5E7EB', overflow: 'hidden' }}>

        {/* Stats bar */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
            {[
              ['Total', stats.total, '#374151'],
              ['Today', stats.todayCount, '#0077C8'],
              ['Urgent', (stats.byUrgency?.urgent ?? 0) + (stats.byUrgency?.emergency ?? 0), '#DC2626'],
              ['Open', stats.total - (stats.byStatus?.resolved ?? 0) - (stats.byStatus?.closed ?? 0), '#059669'],
            ].map(([label, val, color]) => (
              <div key={label as string} style={{ padding: '12px 16px', borderRight: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9CA3AF', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: color as string, margin: 0, fontFamily: 'monospace' }}>{val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '1px solid #E5E7EB', flexWrap: 'wrap', flexShrink: 0, background: '#FAFAFA' }}>
          <input
            placeholder="Search reports…"
            value={searchDraft}
            onChange={e => handleSearch(e.target.value)}
            style={{ flex: '1 1 180px', padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 12, outline: 'none' }}
          />
          <select
            value={filters.status ?? ''}
            onChange={e => applyFilters({ status: (e.target.value as HelpReportStatus) || undefined })}
            style={{ padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select
            value={filters.urgency ?? ''}
            onChange={e => applyFilters({ urgency: (e.target.value as HelpReportUrgency) || undefined })}
            style={{ padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
          >
            <option value="">All Urgencies</option>
            {ALL_URGENCIES.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
          </select>
          <select
            value={filters.sortBy ?? 'createdAt'}
            onChange={e => applyFilters({ sortBy: e.target.value as any })}
            style={{ padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
          >
            <option value="createdAt">Newest First</option>
            <option value="updatedAt">Recently Updated</option>
            <option value="urgency">By Urgency</option>
          </select>
          <button
            onClick={() => { void loadList(filters); void loadStats(); }}
            style={{ padding: '6px 12px', background: '#0077C8', color: 'white', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading reports…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              No reports found. Adjust filters or submit a help ticket from the DPAL app.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                  {['Report #', 'Title', 'Category', 'Urgency', 'Status', 'Location', 'Date', 'Attachments'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => void openDetail(r.id)}
                    style={{
                      borderBottom: '1px solid #F3F4F6',
                      cursor: 'pointer',
                      background: selected?.id === r.id ? '#EFF6FF' : r.isDuplicate ? '#FFFBEB' : 'white',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (selected?.id !== r.id) (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected?.id === r.id ? '#EFF6FF' : r.isDuplicate ? '#FFFBEB' : 'white'; }}
                  >
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#1D4ED8', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {r.reportNumber}
                      {r.isDuplicate && <span style={{ marginLeft: 4, fontSize: 9, background: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: 10, fontFamily: 'system-ui' }}>DUP</span>}
                    </td>
                    <td style={{ padding: '8px 12px', maxWidth: 220 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: '#111827' }}>{r.title}</span>
                      {r.contact?.fullName && <span style={{ fontSize: 10, color: '#9CA3AF' }}>{r.contact.fullName}</span>}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#374151' }}>{r.category}</td>
                    <td style={{ padding: '8px 12px' }}><UrgencyBadge urgency={r.urgency} /></td>
                    <td style={{ padding: '8px 12px' }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: '8px 12px', color: '#6B7280', fontSize: 11 }}>
                      {[r.location?.city, r.location?.stateRegion].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#9CA3AF', fontSize: 10, whiteSpace: 'nowrap' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: r.attachments.length ? '#0077C8' : '#D1D5DB', fontWeight: 700 }}>
                      {r.attachments.length || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderTop: '1px solid #E5E7EB', flexShrink: 0 }}>
            <button onClick={() => paginate(meta.page - 1)} disabled={meta.page <= 1}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 11, cursor: meta.page <= 1 ? 'not-allowed' : 'pointer', opacity: meta.page <= 1 ? 0.4 : 1, fontWeight: 700 }}>
              ← Prev
            </button>
            <span style={{ fontSize: 11, color: '#6B7280' }}>Page {meta.page} of {meta.totalPages} · {meta.total} total</span>
            <button onClick={() => paginate(meta.page + 1)} disabled={meta.page >= meta.totalPages}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 11, cursor: meta.page >= meta.totalPages ? 'not-allowed' : 'pointer', opacity: meta.page >= meta.totalPages ? 0.4 : 1, fontWeight: 700 }}>
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT: detail panel ── */}
      <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FAFAFA' }}>
        {detailLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
        ) : !selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9CA3AF', padding: 32 }}>
            <span style={{ fontSize: 32 }}>☰</span>
            <p style={{ fontSize: 12, textAlign: 'center', margin: 0 }}>Click any row to open the detail panel</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Header */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#1D4ED8', fontWeight: 800 }}>{selected.reportNumber}</span>
                <button onClick={() => setSelected(null)} style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕ Close</button>
              </div>
              <h2 style={{ fontSize: 14, fontWeight: 900, color: '#111827', margin: '0 0 8px', lineHeight: 1.3 }}>{selected.title}</h2>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <StatusBadge status={selected.status} />
                <UrgencyBadge urgency={selected.urgency} />
                {selected.isDuplicate && <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 20, fontWeight: 800 }}>DUPLICATE</span>}
              </div>
            </div>

            {/* Description */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9CA3AF', margin: '0 0 6px' }}>Description</p>
              <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6 }}>{selected.description}</p>
            </div>

            {/* Meta grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['Category',  selected.category],
                ['Submitted', new Date(selected.createdAt).toLocaleDateString()],
                ['Name',      selected.contact?.fullName || 'Anonymous'],
                ['Email',     selected.contact?.email   || '—'],
                ['Phone',     selected.contact?.phone   || '—'],
                ['Location',  [selected.location?.city, selected.location?.country].filter(Boolean).join(', ') || '—'],
              ].map(([label, val]) => (
                <div key={label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 10px' }}>
                  <p style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9CA3AF', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Change Status */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9CA3AF', margin: '0 0 8px' }}>Update Status</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  defaultValue={selected.status}
                  onChange={e => { if (!statusBusy) void handleStatusChange(selected.id, e.target.value as HelpReportStatus); }}
                  disabled={statusBusy}
                  style={{ flex: 1, padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                >
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
                {statusBusy && <span style={{ fontSize: 10, color: '#9CA3AF', alignSelf: 'center' }}>Saving…</span>}
              </div>
            </div>

            {/* Assign */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9CA3AF', margin: '0 0 8px' }}>Assign Report</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  placeholder="Staff ID or name"
                  value={assignTo}
                  onChange={e => setAssignTo(e.target.value)}
                  style={{ flex: 1, padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 11, outline: 'none' }}
                />
                <button
                  onClick={handleAssign}
                  disabled={assignBusy || !assignTo.trim()}
                  style={{ padding: '6px 12px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: assignBusy || !assignTo.trim() ? 0.5 : 1 }}
                >
                  {assignBusy ? '…' : 'Assign'}
                </button>
              </div>
              {selected.assignments.length > 0 && (
                <p style={{ fontSize: 10, color: '#6B7280', margin: '6px 0 0' }}>
                  Currently: {selected.assignments[0]?.assignedTo ?? '—'}
                </p>
              )}
            </div>

            {/* Status history */}
            {selected.statusHistory.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9CA3AF', margin: '0 0 8px' }}>Status History</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selected.statusHistory.slice(0, 6).map(h => (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, gap: 8 }}>
                      <span style={{ color: '#374151', fontWeight: 600 }}>
                        {h.oldStatus ? `${STATUS_LABELS[h.oldStatus as HelpReportStatus] ?? h.oldStatus} → ` : ''}
                        {STATUS_LABELS[h.newStatus as HelpReportStatus] ?? h.newStatus}
                      </span>
                      <span style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>{new Date(h.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9CA3AF', margin: '0 0 8px' }}>Internal Notes ({selected.notes.length})</p>
              {selected.notes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, maxHeight: 200, overflow: 'auto' }}>
                  {selected.notes.map(n => (
                    <div key={n.id} style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 6, padding: '8px 10px' }}>
                      <p style={{ fontSize: 11, color: '#374151', margin: '0 0 4px', lineHeight: 1.5 }}>{n.body}</p>
                      <p style={{ fontSize: 9, color: '#9CA3AF', margin: 0 }}>{n.authorId} · {new Date(n.createdAt).toLocaleDateString()} · {n.noteType}</p>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                placeholder="Add internal note…"
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 11, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
              <button
                onClick={handleAddNote}
                disabled={noteLoading || !noteBody.trim()}
                style={{ marginTop: 6, width: '100%', padding: '7px', background: '#1D4ED8', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: noteLoading || !noteBody.trim() ? 0.5 : 1 }}
              >
                {noteLoading ? 'Saving…' : 'Add Note'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
