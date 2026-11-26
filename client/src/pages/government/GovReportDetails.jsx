import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReportDetailsView from '../../components/report/ReportDetailsView.jsx';
import LocationPicker, { GpsAccuracyBanner } from '../../components/map/LocationPicker.jsx';
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
    in_progress: { to: 'repair_completed', label: 'Mark repair completed', help: 'The crew has finished. Next, upload a live completion photo for AI verification.' },
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
        Repair note <span className="muted">(optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Dispatched East Zone patching crew" />
      </label>
      <ErrorMessage error={error} />
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : action.label}</button>
    </form>
  );
}

/** Completion photo upload + AI repair verification + retry/escalation UX. */
function CompletionUpload({ report, onDone }) {
  const geo = useGeolocation();
  const reportLoc = { lat: report.lat, lng: report.lng };
  const [pin, setPin] = useState(reportLoc);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [escalating, setEscalating] = useState(false);
  const [escalateNote, setEscalateNote] = useState('');
  const [escalateBusy, setEscalateBusy] = useState(false);
  const [escalateError, setEscalateError] = useState(null);

  useEffect(() => {
    if (geo.position) setPin({ lat: geo.position.lat, lng: geo.position.lng });
  }, [geo.position]);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const dist = distanceM(pin, reportLoc);
  const inRadius = dist <= REPAIR_RADIUS_M;

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

  const escalate = async (e) => {
    e.preventDefault();
    if (!escalateNote.trim()) return;
    setEscalateBusy(true);
    setEscalateError(null);
    try {
      await api(`/gov/reports/${report.id}/status`, {
        method: 'PATCH',
        body: { status: 'under_review', note: escalateNote.trim() },
      });
      onDone();
    } catch (err) {
      setEscalateError(err);
    } finally {
      setEscalateBusy(false);
    }
  };

  return (
    <div className="card action-card">
      <form className="form" onSubmit={submit}>
        <h2>Upload completion photo</h2>
        <p className="muted">
          Capture the after-repair road photo on site within {REPAIR_RADIUS_M} m of the reported pin
          (green dashed geo-fence around the red dot).
        </p>
        <label className="photo-input small">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(e) => { setPhoto(e.target.files?.[0] || null); setResult(null); setError(null); }}
            required
          />
          <span>{photo ? `📷 ${photo.name}` : '📷 Capture / choose live after-repair photo'}</span>
        </label>

        {preview && (
          <div className="photo-previews">
            <div className="photo-preview-card">
              <img src={preview} alt="Completion preview" />
              <div className="photo-preview-meta"><span>Preview ready</span></div>
            </div>
          </div>
        )}

        <div className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={geo.request}>
            {geo.status === 'locating' ? 'Locating…' : 'Use my current GPS location'}
          </button>
          <span className={inRadius ? 'ok' : 'warn'}>
            {inRadius ? `✓ Within ${REPAIR_RADIUS_M} m limit (${formatMetres(dist)} away)` : `⚠ ${formatMetres(dist)} away (exceeds ${REPAIR_RADIUS_M} m limit)`}
          </span>
        </div>
        {geo.status === 'denied' && <div className="alert alert-warn">Location is blocked. Drag the pin inside the green {REPAIR_RADIUS_M} m circle.</div>}
        <GpsAccuracyBanner accuracy={geo.position?.accuracy} />
        <LocationPicker value={pin} onChange={setPin} gps={geo.position} reference={reportLoc} referenceRadiusM={REPAIR_RADIUS_M} height={260} />

        <ErrorMessage error={error} />
        {result && result.result !== 'accepted' && (
          <div className="alert alert-error">
            <strong>Repair not verified ({result.result}).</strong>
            <ul className="reasons">{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            Retake a clearer photo within {REPAIR_RADIUS_M} m and retry, or escalate to Admin Review below.
          </div>
        )}

        <div className="row">
          <button className="btn btn-primary" disabled={busy || !photo}>
            {busy ? '🤖 Verifying repair…' : result || error ? 'Retry AI verification' : 'Submit for AI verification'}
          </button>
          {!escalating && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEscalating(true)}>
              Escalate to Admin Review
            </button>
          )}
        </div>
        {result?.result === 'accepted' && <div className="alert alert-ok">Repair verified ({formatPct(result.confidence)}). Report marked solved.</div>}
      </form>

      {escalating && (
        <form className="form" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }} onSubmit={escalate}>
          <h3>Escalate to Admin Review Queue</h3>
          <p className="muted" style={{ margin: 0 }}>
            If repair is complete on site but GPS interference or AI disagreement blocks closure, route this report for manual Admin sign-off.
          </p>
          <label>
            Escalation reason
            <input
              value={escalateNote}
              onChange={(e) => setEscalateNote(e.target.value)}
              maxLength={500}
              placeholder="e.g. Road resurfaced smoothly, AI failed under low evening light"
              required
            />
          </label>
          <ErrorMessage error={escalateError} />
          <div className="row">
            <button className="btn btn-primary btn-sm" disabled={escalateBusy || !escalateNote.trim()}>
              {escalateBusy ? 'Escalating…' : 'Send to Admin Review'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEscalating(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
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
        {report.status === 'under_review' && (
          <div className="alert alert-warn">Escalated to Admin Review queue for manual resolution sign-off.</div>
        )}
        {report.status === 'solved' && <div className="alert alert-ok">✅ This problem is solved and the repair was verified.</div>}
      </ReportDetailsView>
    </>
  );
}
