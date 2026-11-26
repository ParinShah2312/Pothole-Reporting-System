import { useEffect, useState } from 'react';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import { api } from '../../services/api.js';

export default function AdminSettings() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    api('/admin/settings')
      .then((d) => setForm(d.settings))
      .catch(setError);
  }, []);

  const setNum = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { settings } = await api('/admin/settings', {
        method: 'PATCH',
        body: Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)])),
      });
      setForm(settings);
      setNotice('Thresholds updated cleanly and recorded in the audit log.');
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  if (!form && !error) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin Governance</p>
          <h1>AI &amp; spatial thresholds</h1>
        </div>
      </div>

      {notice && <div className="alert alert-ok">{notice}</div>}
      <ErrorMessage error={error} />

      {form && (
        <form className="card form" onSubmit={onSave}>
          <div className="settings-grid">
            <label>
              AI accept threshold (0.10 – 0.99)
              <input type="number" step="0.01" min="0.1" max="0.99" value={form.ai_accept_threshold} onChange={setNum('ai_accept_threshold')} required />
              <small className="muted">Confidence &ge; this auto-accepts citizen potholes &amp; repairs.</small>
            </label>
            <label>
              AI reject threshold (0.01 – 0.95)
              <input type="number" step="0.01" min="0.01" max="0.95" value={form.ai_reject_threshold} onChange={setNum('ai_reject_threshold')} required />
              <small className="muted">Confidence &lt; this rejects; values between reject &amp; accept go to Review Queue.</small>
            </label>
            <label>
              Repair geo-fence radius (m)
              <input type="number" min="10" max="2000" value={form.repair_radius_m} onChange={setNum('repair_radius_m')} required />
              <small className="muted">Max distance allowed between completion photo and original pothole.</small>
            </label>
            <label>
              Pin movement flag threshold (m)
              <input type="number" min="10" max="5000" value={form.pin_move_flag_m} onChange={setNum('pin_move_flag_m')} required />
              <small className="muted">Dragging pin further than this from device GPS triggers manual review flag.</small>
            </label>
            <label>
              Low GPS accuracy threshold (m)
              <input type="number" min="10" max="5000" value={form.low_gps_accuracy_m} onChange={setNum('low_gps_accuracy_m')} required />
              <small className="muted">GPS uncertainty above this flags the report for verification.</small>
            </label>
            <label>
              Duplicate proximity radius (m)
              <input type="number" min="5" max="2000" value={form.duplicate_radius_m} onChange={setNum('duplicate_radius_m')} required />
              <small className="muted">PostGIS ST_DWithin radius for flagging nearby open reports.</small>
            </label>
            <label>
              EXIF GPS mismatch distance (m)
              <input type="number" min="10" max="10000" value={form.exif_mismatch_m} onChange={setNum('exif_mismatch_m')} required />
              <small className="muted">Flags when camera EXIF GPS differs from pin beyond this distance.</small>
            </label>
          </div>
          <div>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving settings…' : 'Save thresholds'}</button>
          </div>
        </form>
      )}
    </>
  );
}
