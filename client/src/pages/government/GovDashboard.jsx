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
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('open');

  useEffect(() => {
    api('/gov/reports').then((d) => setReports(d.reports)).catch(setError);
  }, []);

  const counts = useMemo(() => {
    const c = {};
    reports?.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [reports]);

  const shown = useMemo(() => {
    if (!reports) return [];
    if (filter === 'all') return reports;
    if (filter === 'open') return reports.filter((r) => NEEDS_ACTION.has(r.status));
    return reports.filter((r) => r.status === filter);
  }, [reports, filter]);

  const tabs = [['open', 'Needs action'], ...MAP_STATUSES.map((s) => [s, statusLabel(s)]), ['all', 'All']];

  return (
    <>
      <div className="page-head">
        <h1>Government dashboard</h1>
      </div>
      <Counters />
      <ErrorMessage error={error} />

      <div className="tabs">
        {tabs.map(([key, label]) => {
          const n = key === 'all' ? reports?.length : key === 'open'
            ? reports?.filter((r) => NEEDS_ACTION.has(r.status)).length : counts[key];
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
                        {r.image_url && <img src={r.image_url} alt="" />}#{r.id}
                      </Link>
                    </td>
                    <td>{r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}</td>
                    <td>{formatDate(r.created_at)}</td>
                    <td>{r.department_name || <span className="muted">Unassigned</span>}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={5} className="muted center">No reports in this view.</td></tr>}
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
