import { useCallback, useEffect, useState } from 'react';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { formatDate } from '../../utils/format.js';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Create government / admin form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('government');
  const [departmentId, setDepartmentId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (roleFilter) params.set('role', roleFilter);
    if (q.trim()) params.set('q', q.trim());
    const qs = params.toString();
    api(`/admin/users${qs ? `?${qs}` : ''}`)
      .then((d) => { setUsers(d.users); setDepartments(d.departments); setError(null); })
      .catch(setError);
  }, [roleFilter, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 200 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const onCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setNotice(null);
    try {
      const { user } = await api('/admin/users', {
        method: 'POST',
        body: {
          name,
          email,
          password,
          role,
          departmentId: role === 'government' && departmentId ? Number(departmentId) : null,
        },
      });
      setName('');
      setEmail('');
      setPassword('');
      setDepartmentId('');
      setNotice(`Created ${user.role} account for ${user.email}.`);
      load();
    } catch (err) {
      setCreateError(err);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (target) => {
    setError(null);
    setNotice(null);
    try {
      const { user } = await api(`/admin/users/${target.id}`, {
        method: 'PATCH',
        body: { isActive: !target.is_active },
      });
      setNotice(`${user.email} is now ${user.is_active ? 'active' : 'suspended'}.`);
      load();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin Governance</p>
          <h1>User management</h1>
        </div>
      </div>

      {notice && <div className="alert alert-ok">{notice}</div>}
      <ErrorMessage error={error} />

      <form className="card form" onSubmit={onCreate}>
        <h2>Create municipal officer or admin</h2>
        <div className="gov-filters" style={{ padding: 0, border: 'none', background: 'transparent' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required minLength={2} style={{ flex: '1 1 180px', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="officer@vadodara.gov.in" required style={{ flex: '1 1 200px', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8, letter + number)" required minLength={8} style={{ flex: '1 1 200px', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }} />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="government">Government officer</option>
            <option value="admin">System admin</option>
          </select>
          {role === 'government' && (
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">No specific zone</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <button className="btn btn-primary btn-sm" disabled={creating}>{creating ? 'Creating…' : 'Add account'}</button>
        </div>
        <ErrorMessage error={createError} />
      </form>

      <div className="card gov-filters">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users by name or email…" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="citizen">Citizens</option>
          <option value="government">Government officers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {!users && !error && <Loading />}
      {users && (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Department</th><th>Verified</th><th>Reports</th><th>Status</th><th>Joined</th><th>Action</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <div className="muted" style={{ fontSize: '0.82rem' }}>{u.email}</div>
                  </td>
                  <td><span className="badge" style={{ '--badge': u.role === 'admin' ? '#7c3aed' : u.role === 'government' ? '#2563eb' : '#475569' }}>{u.role}</span></td>
                  <td>{u.department_name || <span className="muted">—</span>}</td>
                  <td>{u.email_verified ? <span className="ok">Verified</span> : <span className="muted">Pending</span>}</td>
                  <td>{u.report_count}</td>
                  <td>{u.is_active ? <span className="ok">Active</span> : <span className="warn">Suspended</span>}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className={`btn btn-sm ${u.is_active ? 'btn-ghost' : 'btn-primary'}`}
                      disabled={u.id === me?.id}
                      onClick={() => toggleActive(u)}
                    >
                      {u.id === me?.id ? 'You' : u.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={8} className="muted center">No matching users.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
