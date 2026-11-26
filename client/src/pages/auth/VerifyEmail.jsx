import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { homePathFor, useAuth } from '../../context/AuthContext.jsx';
import { ErrorMessage } from '../../components/common/Feedback.jsx';
import { api } from '../../services/api.js';

// Deduplicates React StrictMode double-effects and refreshes for the same token
const verifyRequests = new Map();
function verifyTokenOnce(token) {
  if (!verifyRequests.has(token)) {
    verifyRequests.set(token, api('/auth/verify-email', { method: 'POST', body: { token } }));
  }
  return verifyRequests.get(token);
}

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { user, updateUser } = useAuth();
  const token = params.get('token') || '';
  const [status, setStatus] = useState(token ? 'verifying' : 'missing');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    verifyTokenOnce(token)
      .then(({ user: verifiedUser }) => {
        if (!active) return;
        setStatus('verified');
        if (user && verifiedUser && user.id === verifiedUser.id) {
          updateUser(verifiedUser);
        }
      })
      .catch((err) => {
        if (!active) return;
        verifyRequests.delete(token);
        setError(err);
        setStatus('error');
      });
    return () => { active = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="auth-card card">
      <p className="eyebrow">Account verification</p>
      <h1>Verify email</h1>
      {status === 'verifying' && <div className="notice">Verifying your email address…</div>}
      {status === 'missing' && (
        <div className="alert alert-warn">No verification token found in the link. Open the link from registration or resend one from your profile.</div>
      )}
      {status === 'verified' && (
        <div className="alert alert-ok">
          Your email address has been verified successfully.
        </div>
      )}
      {status === 'error' && <ErrorMessage error={error} />}
      <div className="row" style={{ marginTop: 16 }}>
        <Link to={user ? homePathFor(user) : '/login'} className="btn btn-primary">
          {user ? 'Go to dashboard' : 'Go to login'}
        </Link>
      </div>
    </div>
  );
}
