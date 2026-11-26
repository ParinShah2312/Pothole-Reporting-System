import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorMessage } from '../../components/common/Feedback.jsx';
import { api } from '../../services/api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setResult(data);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  let resetPath = null;
  if (result?.devResetUrl) {
    try {
      const u = new URL(result.devResetUrl);
      resetPath = `${u.pathname}${u.search}`;
    } catch { /* ignore */ }
  }

  return (
    <div className="auth-card card">
      <p className="eyebrow">Account recovery</p>
      <h1>Forgot password</h1>
      {result ? (
        <>
          <div className="alert alert-ok">{result.message}</div>
          {resetPath && (
            <div className="notice" style={{ marginTop: 12 }}>
              <strong>Development reset link:</strong>
              <Link to={resetPath} className="link">Open password reset page →</Link>
            </div>
          )}
        </>
      ) : (
        <form onSubmit={onSubmit} className="form">
          <label>
            Account email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <ErrorMessage error={error} />
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      <p className="muted" style={{ marginTop: 14 }}>Remembered your password? <Link to="/login">Back to login</Link></p>
    </div>
  );
}
