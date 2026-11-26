import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { homePathFor, useAuth } from '../../context/AuthContext.jsx';
import { ErrorMessage } from '../../components/common/Feedback.jsx';

/** Login form for the citizen portal or the government portal (`portal` prop). */
export default function Login({ portal = 'citizen' }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const isGov = portal === 'government';

  if (user) return <Navigate to={homePathFor(user)} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(email, password, portal);
      navigate(location.state?.from || homePathFor(u), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`auth-card card ${isGov ? 'auth-gov' : ''}`}>
      <p className="eyebrow">{isGov ? 'Government / Municipal staff' : 'Citizen portal'}</p>
      <h1>{isGov ? 'Government portal login' : 'Log in'}</h1>
      <form onSubmit={onSubmit} className="form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        <ErrorMessage error={error} />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      {isGov ? (
        <p className="muted">Citizen? <Link to="/login">Use the citizen login</Link></p>
      ) : (
        <p className="muted">New here? <Link to="/register">Create an account</Link> · <Link to="/forgot-password">Forgot password?</Link> · Staff? <Link to="/gov/login">Government login</Link></p>
      )}
    </div>
  );
}
