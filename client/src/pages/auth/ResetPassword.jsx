import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorMessage } from '../../components/common/Feedback.jsx';
import { api } from '../../services/api.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (key) => error?.details?.[key] && <span className="field-error">{error.details[key]}</span>;

  return (
    <div className="auth-card card">
      <p className="eyebrow">Account recovery</p>
      <h1>Reset password</h1>
      {done ? (
        <>
          <div className="alert alert-ok">Your password has been updated. Any lockouts have been cleared.</div>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: 14 }}>Log in with new password</Link>
        </>
      ) : (
        <form onSubmit={onSubmit} className="form">
          {!params.get('token') && (
            <label>
              Reset token
              <input value={token} onChange={(e) => setToken(e.target.value)} required />
              {fieldError('token')}
            </label>
          )}
          <label>
            New password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            <span className="hint">At least 8 characters, with a letter and a number.</span>
            {fieldError('password')}
          </label>
          <ErrorMessage error={error} />
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Updating…' : 'Set new password'}</button>
        </form>
      )}
    </div>
  );
}
