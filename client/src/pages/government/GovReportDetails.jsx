import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReportDetailsView from '../../components/report/ReportDetailsView.jsx';
import LocationPicker from '../../components/map/LocationPicker.jsx';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { api } from '../../services/api.js';
import { distanceM, formatMetres, formatPct } from '../../utils/format.js';

const REPAIR_RADIUS_M = 50; // matches server REPAIR_RADIUS_M

/** Assign → start repair → mark completed (Workflows D, E). */
function StatusActions({ report, onDone }) {
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (report.status === 'active') api('/gov/departments').then((d) => setDepartments(d.departments)).catch(setError);
  }, [report.status]);

  const action = {
    active: { to: 'assigned', label: 'Assign to department', help: 'Route this verified report to the responsible repair team.' },
    assigned: { to: 'in_progress', label: 'Start repair', help: 'Mark that the repair crew has started work on site.' },
    in_progress: { to: 'repair_completed', label: 'Mark repair completed', help: 'The crew has finished. Next, upload a completion photo for AI verification.' },
  }[report.status];
  if (!action) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/gov/reports/${report.id}/status`, {
        method: 'PATCH',
        body: { status: action.to, note: note || undefined, departmentId: departmentId ? Number(departmentId) : undefined },
      });
      setNote('');
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card action-card form" onSubmit={submit}>
      <h2>Next step</h2>
      <p className="muted">{action.help}</p>
      {report.status === 'active' && (
        <label>
          Department
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
            <option value="">Select a department…</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      )}
      <label>
        Note <span className="muted">(optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Assigned to crew B" />
      </label>
      <ErrorMessage error={error} />
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : action.label}</button>
    </form>
  );
}

/** Completion photo upload + AI repair verification (Workflows F, G, H). */
function CompletionUpload({ report, onDone }) {
  const geo = useGeolocation();
  const reportLoc = { lat: report.lat, lng: report.lng };
  const [pin, setPin] = useState(reportLoc);
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (geo.position) setPin({ lat: geo.position.lat, lng: geo.position.lng });
  }, [geo.position]);

  const dist = distanceM(pin, reportLoc);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    const form = new FormData();
    form.append('image', photo);
    form.append('lat', pin.lat);
    form.append('lng', pin.lng);
    try {
      const res = await api(`/gov/reports/${report.id}/completion`, { method: 'POST', form });
      setResult(res);
      if (res.result === 'accepted') onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card action-card form" onSubmit={submit}>
      <h2>Upload completion photo</h2>
      <p className="muted">
        Take the after-repair photo at the pothole. It must be within {REPAIR_RADIUS_M} m of the reported location
        (red dot), and the AI must confirm the road is repaired.
      </p>
      <label className="photo-input small">
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] || null)} required />
        <span>{photo ? `📷 ${photo.name}` : '📷 Take / choose completion photo'}</span>
      </label>
      <div className="row">
        <button type="button" className="btn btn-ghost btn-sm" onClick={geo.request}>
          {geo.status === 'locating' ? 'Locating…' : 'Use my current GPS location'}
        </button>
        <span className={dist <= REPAIR_RADIUS_M ? 'ok' : 'warn'}>Photo location is {formatMetres(dist)} from the report</span>
      </div>
      {geo.status === 'denied' && <div className="alert alert-warn">Location is blocked. Drag the pin to where the photo was taken.</div>}
      <LocationPicker value={pin} onChange={setPin} gps={geo.position} reference={reportLoc} height={260} />
      <ErrorMessage error={error} />
      {result && result.result !== 'accepted' && (
        <div className="alert alert-error">
          <strong>Repair not verified ({result.result}).</strong>
          <ul className="reasons">{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          Fix the issue and upload a new photo.
        </div>
      )}
      <button className="btn btn-primary" disabled={busy || !photo}>{busy ? '🤖 Verifying repair…' : 'Submit for AI verification'}</button>
      {result?.result === 'accepted' && <div className="alert alert-ok">Repair verified ({formatPct(result.confidence)}). Report marked solved.</div>}
    </form>
  );
}

export default function GovReportDetails() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => api(`/reports/${id}`).then((d) => setReport(d.report)).catch(setError), [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorMessage error={error} />;
  if (!report) return <Loading />;

  return (
    <>
      <Link to="/gov" className="back">← Dashboard</Link>
      <ReportDetailsView report={report} showFlags>
        <StatusActions report={report} onDone={load} />
        {report.status === 'repair_completed' && <CompletionUpload key={report.id} report={report} onDone={load} />}
        {report.status === 'solved' && <div className="alert alert-ok">✅ This problem is solved and the repair was verified.</div>}
      </ReportDetailsView>
    </>
  );
}
