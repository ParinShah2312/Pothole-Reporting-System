import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Counters from '../../components/common/Counters.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import { api } from '../../services/api.js';
import { formatDate } from '../../utils/format.js';

export default function CitizenDashboard() {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/reports/mine').then((d) => setReports(d.reports)).catch(setError);
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>My reports</h1>
        <Link to="/citizen/report" className="btn btn-primary">+ Report new</Link>
      </div>
      <Counters />
      <ErrorMessage error={error} />
      {!reports && !error && <Loading />}
      {reports?.length === 0 && (
        <div className="empty card">
          <p>You haven't reported any potholes yet.</p>
          <Link to="/citizen/report" className="btn btn-primary">Report your first pothole</Link>
        </div>
      )}
      <ul className="report-list">
        {reports?.map((r) => (
          <li key={r.id}>
            <Link to={`/citizen/reports/${r.id}`} className="report-row card">
              {r.image_url && <img src={r.image_url} alt="" />}
              <div>
                <strong>Report #{r.id}</strong>
                <span className="muted">{r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}</span>
                <span className="muted">{formatDate(r.created_at)}</span>
              </div>
              <StatusBadge status={r.status} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
