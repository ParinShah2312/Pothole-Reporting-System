import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { homePathFor, useAuth } from '../../context/AuthContext.jsx';
import { ErrorMessage } from '../../components/common/Feedback.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homePathFor(user)} replace />;

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));
  const fieldError = (key) => error?.details?.[key] && <span className="field-error">{error.details[key]}</span>;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(fields);
      navigate('/citizen/report', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-card card">
      <p className="eyebrow">Citizen portal</p>
      <h1>Create an account</h1>
      <form onSubmit={onSubmit} className="form">
        <label>Full name<input value={fields.name} onChange={set('name')} required autoComplete="name" />{fieldError('name')}</label>
        <label>Email<input type="email" value={fields.email} onChange={set('email')} required autoComplete="email" />{fieldError('email')}</label>
        <label>
          Password
          <input type="password" value={fields.password} onChange={set('password')} required autoComplete="new-password" />
          <span className="hint">At least 8 characters, with a letter and a number.</span>
          {fieldError('password')}
        </label>
        <ErrorMessage error={error} />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="muted">Already registered? <Link to="/login">Log in</Link></p>
    </div>
  );
}
