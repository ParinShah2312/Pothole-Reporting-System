import { useEffect, useMemo, useState } from 'react';
import Counters from '../../components/common/Counters.jsx';
import { ErrorMessage } from '../../components/common/Feedback.jsx';
import ReportsMap from '../../components/map/ReportsMap.jsx';
import { api } from '../../services/api.js';
import { MAP_STATUSES, statusColor, statusLabel } from '../../utils/status.js';

export default function LiveMap() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(new Set(MAP_STATUSES));

  useEffect(() => {
    api('/reports/map').then((d) => setReports(d.reports)).catch(setError);
  }, []);

  const shown = useMemo(() => reports.filter((r) => visible.has(r.status)), [reports, visible]);
  const toggle = (s) => setVisible((v) => {
    const next = new Set(v);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });

  return (
    <>
      <div className="page-head">
        <h1>Live map</h1>
        <Counters />
      </div>
      <ErrorMessage error={error} />
      <div className="filters">
        {MAP_STATUSES.map((s) => (
          <label key={s} className="chip">
            <input type="checkbox" checked={visible.has(s)} onChange={() => toggle(s)} />
            <i style={{ background: statusColor(s) }} />
            {statusLabel(s)} ({reports.filter((r) => r.status === s).length})
          </label>
        ))}
      </div>
      <ReportsMap reports={shown} height="65vh" />
    </>
  );
}
