import { useEffect, useState } from 'react';
import Counters from '../../components/common/Counters.jsx';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import { api } from '../../services/api.js';
import { statusColor, statusLabel } from '../../utils/status.js';

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

export default function StatsDashboard() {
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(() => today());
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    api(`/stats/trends?from=${from}&to=${to}`)
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((err) => { if (alive) setError(err); });
    return () => { alive = false; };
  }, [from, to]);

  const maxDaily = data?.daily?.reduce((m, d) => Math.max(m, d.reported, d.solved), 1) || 1;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Public Transparency &amp; Analytics</p>
          <h1>Civic road statistics</h1>
        </div>
        <div className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFrom(daysAgo(6)); setTo(today()); }}>7d</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFrom(daysAgo(29)); setTo(today()); }}>30d</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFrom(daysAgo(89)); setTo(today()); }}>90d</button>
        </div>
      </div>

      <Counters />

      <div className="card gov-filters">
        <label className="row" style={{ gap: 6 }}>
          <span className="muted">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="row" style={{ gap: 6 }}>
          <span className="muted">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <ErrorMessage error={error} />
      {!data && !error && <Loading />}

      {data && (
        <>
          <div className="gov-summary">
            <div className="mini-stat"><span>Submitted in Range</span><strong>{data.summary.submitted}</strong></div>
            <div className="mini-stat"><span>Verified Reports</span><strong>{data.summary.verified_total}</strong></div>
            <div className="mini-stat"><span>Solved in Range</span><strong>{data.summary.solved}</strong></div>
            <div className="mini-stat">
              <span>Avg Resolution Time</span>
              <strong>{data.summary.avg_resolution_hours != null ? `${data.summary.avg_resolution_hours} h` : '—'}</strong>
            </div>
          </div>

          <section className="card">
            <div className="section-head">
              <h2>Daily reported vs. solved trend</h2>
              <div className="legend">
                <span><i style={{ background: '#2563eb' }} />Reported</span>
                <span><i style={{ background: '#059669' }} />Solved</span>
              </div>
            </div>
            <div className="trend-bars" role="img" aria-label="Daily reported vs solved pothole counts">
              {data.daily.map((d) => (
                <div key={d.date} className="bar-col" title={`${d.date}: ${d.reported} reported, ${d.solved} solved`}>
                  <div className="bar-pair">
                    <div className="bar bar-reported" style={{ height: `${Math.max(4, (d.reported / maxDaily) * 100)}%`, opacity: d.reported ? 1 : 0.18 }} />
                    <div className="bar bar-solved" style={{ height: `${Math.max(4, (d.solved / maxDaily) * 100)}%`, opacity: d.solved ? 1 : 0.18 }} />
                  </div>
                  <span className="bar-label">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="details-grid">
            <section className="card">
              <h2>Status distribution</h2>
              <table className="table">
                <thead><tr><th>Status</th><th>Count</th></tr></thead>
                <tbody>
                  {data.byStatus.map((s) => (
                    <tr key={s.status}>
                      <td>
                        <span className="badge" style={{ '--badge': statusColor(s.status) }}>{statusLabel(s.status)}</span>
                      </td>
                      <td><strong>{s.count}</strong></td>
                    </tr>
                  ))}
                  {data.byStatus.length === 0 && <tr><td colSpan={2} className="muted center">No reports in this date range.</td></tr>}
                </tbody>
              </table>
            </section>

            <section className="card">
              <h2>Department / zone workload</h2>
              <table className="table">
                <thead><tr><th>Department</th><th>Zone</th><th>Total</th><th>Active</th><th>Solved</th></tr></thead>
                <tbody>
                  {data.byDepartment.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.name}</strong></td>
                      <td>{d.zone}</td>
                      <td>{d.total}</td>
                      <td>{d.active}</td>
                      <td>{d.solved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </>
  );
}
