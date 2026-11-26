import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import { api } from '../../services/api.js';
import { FLAG_LABELS, formatDate, formatPct } from '../../utils/format.js';

export default function AdminReviewQueue() {
  const [reports, setReports] = useState(null);
  const [scope, setScope] = useState('attention');
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState('active');
  const [clearFlags, setClearFlags] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => {
    setError(null);
    api(`/admin/review-queue?scope=${scope}`)
      .then((d) => setReports(d.reports))
      .catch(setError);
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  const openDecision = (report) => {
    setSelected(report);
    setDecision(report.status === 'repair_completed' || report.status === 'under_review' ? 'active' : 'active');
    setClearFlags(Boolean(report.location_flags?.length));
    setNote('');
    setActionError(null);
  };

  const submitOverride = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await api(`/admin/reports/${selected.id}/override`, {
        method: 'PATCH',
        body: {
          status: decision || undefined,
          clearFlags,
          note,
        },
      });
      setNotice(`Report #${selected.id} updated by admin override.`);
      setSelected(null);
      load();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin Governance</p>
          <h1>Review queue &amp; overrides</h1>
        </div>
        <div className="tabs">
          <button type="button" className={scope === 'attention' ? 'tab active' : 'tab'} onClick={() => setScope('attention')}>
            Needs review
          </button>
          <button type="button" className={scope === 'all' ? 'tab active' : 'tab'} onClick={() => setScope('all')}>
            All reports
          </button>
        </div>
      </div>

      {notice && <div className="alert alert-ok">{notice}</div>}
      <ErrorMessage error={error} />

      {selected && (
        <form className="card form" onSubmit={submitOverride}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Override Report #{selected.id}</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Current status: <strong>{selected.status}</strong> · Flags: {selected.location_flags?.length ? selected.location_flags.map((f) => FLAG_LABELS[f] || f).join(', ') : 'None'}
          </p>
          <div className="row">
            <label style={{ flex: 1, minWidth: 200 }}>
              Target status
              <select value={decision} onChange={(e) => setDecision(e.target.value)}>
                <option value="">Keep current status ({selected.status})</option>
                <option value="active">Approve → Active</option>
                <option value="solved">Override → Solved</option>
                <option value="rejected">Uphold / Mark Rejected</option>
              </select>
            </label>
            <label style={{ flex: 2, minWidth: 260 }}>
              Reason note (logged in status history &amp; audit trail)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                minLength={3}
                maxLength={500}
                placeholder="e.g. Verified clear road crack on site photos despite EXIF drift"
              />
            </label>
          </div>
          {selected.location_flags?.length > 0 && (
            <label className="chip" style={{ width: 'fit-content' }}>
              <input type="checkbox" checked={clearFlags} onChange={(e) => setClearFlags(e.target.checked)} />
              Clear location / EXIF warning flags
            </label>
          )}
          <ErrorMessage error={actionError} />
          <div className="row">
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving override…' : 'Apply Admin Override'}</button>
            <Link to={`/gov/reports/${selected.id}`} className="btn btn-ghost">Inspect full report →</Link>
          </div>
        </form>
      )}

      {!reports && !error && <Loading />}
      {reports && (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr><th>Report</th><th>Location</th><th>Status</th><th>Flags</th><th>Latest AI</th><th>Reported</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/gov/reports/${r.id}`} className="cell-report">
                      {r.image_url && <img src={r.image_url} alt="" />}#{r.id}
                    </Link>
                  </td>
                  <td>{r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {r.location_flags?.length ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {r.location_flags.map((f) => (
                          <span key={f} className="flag-pill">{f}</span>
                        ))}
                      </div>
                    ) : <span className="muted">None</span>}
                  </td>
                  <td>
                    {r.latest_ai ? (
                      <span>{r.latest_ai.result} ({formatPct(r.latest_ai.confidence)})</span>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td>{formatDate(r.created_at)}</td>
                  <td>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openDecision(r)}>Review / Override</button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={7} className="muted center">Queue is clear — no reports pending manual review.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
