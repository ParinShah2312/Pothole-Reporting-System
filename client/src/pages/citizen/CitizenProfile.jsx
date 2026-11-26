import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ErrorMessage } from '../../components/common/Feedback.jsx';
import { api } from '../../services/api.js';
import { formatDate } from '../../utils/format.js';

export default function CitizenProfile() {
  const { user, devVerifyUrl, setDevVerifyUrl, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileErr, setProfileErr] = useState(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdErr, setPwdErr] = useState(null);
  const [pwdBusy, setPwdBusy] = useState(false);

  const [verifyMsg, setVerifyMsg] = useState(null);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileBusy(true);
    setProfileErr(null);
    setProfileMsg(null);
    try {
      const { user: updated } = await api('/auth/profile', { method: 'PATCH', body: { name } });
      updateUser(updated);
      setProfileMsg('Profile updated.');
    } catch (err) {
      setProfileErr(err);
    } finally {
      setProfileBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwdBusy(true);
    setPwdErr(null);
    setPwdMsg(null);
    try {
      await api('/auth/password', { method: 'PATCH', body: passwords });
      setPasswords({ currentPassword: '', newPassword: '' });
      setPwdMsg('Password changed successfully.');
    } catch (err) {
      setPwdErr(err);
    } finally {
      setPwdBusy(false);
    }
  };

  const resendVerify = async () => {
    setVerifyMsg(null);
    try {
      const res = await api('/auth/resend-verification', { method: 'POST' });
      if (res.devVerifyUrl) setDevVerifyUrl(res.devVerifyUrl);
      setVerifyMsg(res.alreadyVerified ? 'Email is already verified.' : 'Verification link generated.');
    } catch (err) {
      setVerifyMsg(err.message);
    }
  };

  let verifyPath = null;
  if (devVerifyUrl) {
    try {
      const u = new URL(devVerifyUrl);
      verifyPath = `${u.pathname}${u.search}`;
    } catch { /* ignore */ }
  }

  return (
    <div className="report-form">
      <div className="page-head">
        <div>
          <Link to="/citizen" className="back">← My reports</Link>
          <h1>My profile</h1>
        </div>
      </div>

      <section className="card">
        <h2>Account details</h2>
        <dl className="facts">
          <dt>Email</dt><dd>{user?.email}</dd>
          <dt>Email status</dt>
          <dd>
            {user?.email_verified
              ? <span className="pill" style={{ background: '#d1fae5', color: '#065f46' }}>Verified</span>
              : <span className="pill" style={{ background: '#fef3c7', color: '#92400e' }}>Unverified</span>}
          </dd>
          <dt>Member since</dt><dd>{formatDate(user?.created_at)}</dd>
        </dl>
        {!user?.email_verified && (
          <div className="alert alert-warn" style={{ marginTop: 14 }}>
            <div>Your email address is not verified yet.</div>
            <div className="row" style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={resendVerify}>Generate verification link</button>
              {verifyPath && <Link to={verifyPath} className="btn btn-primary btn-sm">Verify email now →</Link>}
            </div>
            {verifyMsg && <span className="muted" style={{ marginTop: 6 }}>{verifyMsg}</span>}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Edit profile</h2>
        <form onSubmit={saveProfile} className="form">
          <label>
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} />
          </label>
          <ErrorMessage error={profileErr} />
          {profileMsg && <div className="alert alert-ok">{profileMsg}</div>}
          <button className="btn btn-primary" disabled={profileBusy}>{profileBusy ? 'Saving…' : 'Save name'}</button>
        </form>
      </section>

      <section className="card">
        <h2>Change password</h2>
        <form onSubmit={changePassword} className="form">
          <label>
            Current password
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
              required
              autoComplete="new-password"
            />
            <span className="hint">At least 8 characters, with a letter and a number.</span>
          </label>
          <ErrorMessage error={pwdErr} />
          {pwdMsg && <div className="alert alert-ok">{pwdMsg}</div>}
          <button className="btn btn-primary" disabled={pwdBusy}>{pwdBusy ? 'Updating…' : 'Update password'}</button>
        </form>
      </section>
    </div>
  );
}
