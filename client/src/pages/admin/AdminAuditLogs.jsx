import { useEffect, useState } from 'react';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import { api } from '../../services/api.js';
import { formatDate } from '../../utils/format.js';

const COMMON_ACTIONS = [
  'auth.login',
  'auth.login_failed',
  'auth.account_locked',
  'user.register',
  'report.create',
  'report.status_change',
  'report.completion_upload',
  'admin.report_override',
  'admin.user_create',
  'admin.user_update',
  'admin.settings_update',
];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState(null);
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams();
    if (action) params.set('action', action);
    if (q.trim()) params.set('q', q.trim());
    const qs = params.toString();

    const t = setTimeout(() => {
      api(`/admin/audit-logs${qs ? `?${qs}` : ''}`)
        .then((d) => { if (alive) { setLogs(d.logs); setError(null); } })
        .catch((err) => { if (alive) setError(err); });
    }, q ? 200 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [action, q]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin Governance</p>
          <h1>Audit log viewer</h1>
        </div>
      </div>

      <div className="card gov-filters">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor name, email, or details…" />
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All event actions</option>
          {COMMON_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <ErrorMessage error={error} />
      {!logs && !error && <Loading />}
      {logs && (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(l.created_at)}</td>
                  <td>
                    {l.actor_name ? (
                      <>
                        <strong>{l.actor_name}</strong>
                        <div className="muted" style={{ fontSize: '0.8rem' }}>{l.actor_role}</div>
                      </>
                    ) : <span className="muted">System / Anonymous</span>}
                  </td>
                  <td><code>{l.action}</code></td>
                  <td>{l.entity_type ? `${l.entity_type}${l.entity_id ? ` #${l.entity_id}` : ''}` : '—'}</td>
                  <td style={{ maxWidth: 320, fontSize: '0.82rem', wordBreak: 'break-word' }}>
                    {l.details && Object.keys(l.details).length ? JSON.stringify(l.details) : <span className="muted">—</span>}
                  </td>
                  <td className="muted" style={{ fontSize: '0.82rem' }}>{l.ip_address || '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="muted center">No audit events found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
