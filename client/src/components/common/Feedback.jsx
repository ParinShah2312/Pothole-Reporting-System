export function ErrorMessage({ error }) {
  if (!error) return null;
  return <div className="alert alert-error" role="alert">{error.message || String(error)}</div>;
}

export function Loading({ label = 'Loading…' }) {
  return <div className="loading">{label}</div>;
}
