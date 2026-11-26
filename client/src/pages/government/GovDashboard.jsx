import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Counters from '../../components/common/Counters.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import ReportsMap, { MapLegend } from '../../components/map/ReportsMap.jsx';
import { api } from '../../services/api.js';
import { formatDate } from '../../utils/format.js';
import { MAP_STATUSES, statusLabel } from '../../utils/status.js';

// Which statuses need action from government staff
const NEEDS_ACTION = new Set(['active', 'assigned', 'in_progress', 'repair_completed']);

export default function GovDashboard() {
  const [reports, setReports] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null);

  const [filter, setFilter] = useState('open');
  const [q, setQ] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  useEffect(() => {
    api('/gov/departments').then((d) => setDepartments(d.departments)).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (departmentId) params.set('departmentId', departmentId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (flaggedOnly) params.set('flagged', 'true');
    const qs = params.toString();

    const timer = setTimeout(() => {
      api(`/gov/reports${qs ? `?${qs}` : ''}`)
        .then((d) => { if (alive) { setReports(d.reports); setError(null); } })
        .catch((err) => { if (alive) setError(err); });
    }, q ? 220 : 0);

    return () => { alive = false; clearTimeout(timer); };
  }, [q, departmentId, from, to, flaggedOnly]);

  const counts = useMemo(() => {
    const c = { open: 0, flagged: 0 };
    reports?.forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1;
      if (NEEDS_ACTION.has(r.status)) c.open += 1;
      if (r.location_flags?.length) c.flagged += 1;
    });
    return c;
  }, [reports]);

  const shown = useMemo(() => {
    if (!reports) return [];
    if (filter === 'all') return reports;
    if (filter === 'open') return reports.filter((r) => NEEDS_ACTION.has(r.status));
    return reports.filter((r) => r.status === filter);
  }, [reports, filter]);

  const hasFilters = Boolean(q || departmentId || from || to || flaggedOnly);
  const clearFilters = () => {
    setQ('');
    setDepartmentId('');
    setFrom('');
    setTo('');
    setFlaggedOnly(false);
  };

  const tabs = [['open', 'Needs action'], ...MAP_STATUSES.map((s) => [s, statusLabel(s)]), ['all', 'All']];

  return (
    <>
      <div className="page-head">
        <h1>Government dashboard</h1>
      </div>
      <Counters />

      {reports && (
        <div className="gov-summary">
          <div className="mini-stat"><span>Needs Action</span><strong>{counts.open}</strong></div>
          <div className="mini-stat"><span>Awaiting Completion</span><strong>{counts.repair_completed ?? 0}</strong></div>
          <div className="mini-stat"><span>In Progress</span><strong>{counts.in_progress ?? 0}</strong></div>
          <div className="mini-stat"><span>Location / EXIF Flagged</span><strong>{counts.flagged}</strong></div>
        </div>
      )}

      <div className="card gov-filters">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search #ID, address, or description…"
        />
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">All zones / departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
        <label className="chip">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
          Flagged only
        </label>
        {hasFilters && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
        )}
      </div>

      <ErrorMessage error={error} />

      <div className="tabs">
        {tabs.map(([key, label]) => {
          const n = key === 'all' ? reports?.length : key === 'open' ? counts.open : counts[key];
          return (
            <button key={key} type="button" className={filter === key ? 'tab active' : 'tab'} onClick={() => setFilter(key)}>
              {label} <span className="tab-count">{n ?? 0}</span>
            </button>
          );
        })}
      </div>

      {!reports && !error && <Loading />}
      {reports && (
        <div className="gov-grid">
          <div className="card table-card">
            <table className="table">
              <thead>
                <tr><th>Report</th><th>Location</th><th>Reported</th><th>Department</th><th>Status</th></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/gov/reports/${r.id}`} className="cell-report">
                        {r.image_url && <img src={r.image_url} alt="" />}
                        <span>
                          #{r.id}
                          {r.location_flags?.length > 0 && <span className="flag-pill" title={r.location_flags.join(', ')}>⚠ {r.location_flags.length}</span>}
                        </span>
                      </Link>
                    </td>
                    <td>{r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}</td>
                    <td>{formatDate(r.created_at)}</td>
                    <td>{r.department_name || <span className="muted">Unassigned</span>}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={5} className="muted center">No reports match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="card">
            <MapLegend statuses={MAP_STATUSES} />
            <ReportsMap reports={shown} height={460} zoom={12} linkTo={(r) => `/gov/reports/${r.id}`} />
          </div>
        </div>
      )}
    </>
  );
}
