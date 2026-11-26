import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationPicker, { GpsAccuracyBanner } from '../../components/map/LocationPicker.jsx';
import { ErrorMessage } from '../../components/common/Feedback.jsx';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { api } from '../../services/api.js';
import { MAP_CENTER, distanceM, formatMetres } from '../../utils/format.js';

const PIN_MOVE_WARN_M = 200; // matches server PIN_MOVE_FLAG_M

function LocationStep({ geo, manual, setManual }) {
  if (geo.status === 'locating') {
    return <div className="notice">📍 Getting your location… <span className="muted">(allow access if your browser asks)</span></div>;
  }
  if (geo.status === 'denied' || geo.status === 'unavailable') {
    return (
      <div className="alert alert-warn">
        <strong>{geo.status === 'denied' ? 'Location access is blocked.' : 'Your location is not available.'}</strong>{' '}
        Tap the map or drag the pin to the pothole's location instead. Reports placed manually may be reviewed before
        they're verified. To use GPS, allow location for this site in your browser's settings (the icon next to the
        address bar), then <button type="button" className="link" onClick={geo.request}>try again</button>.
      </div>
    );
  }
  if (geo.status === 'granted' || manual) return null;
  return (
    <div className="permission">
      <div className="permission-icon">📍</div>
      <div>
        <strong>Allow location access</strong>
        <p className="muted">
          We use your device's location to place the pin where the photo was taken, so the repair team can find the
          pothole. Your location is only read when you report and is stored only with this report.
        </p>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={geo.request}>Use my current location</button>
          <button type="button" className="btn btn-ghost" onClick={() => setManual(true)}>Place pin manually</button>
        </div>
      </div>
    </div>
  );
}

const MAX_PHOTOS = 5;
const MAX_BYTES = 8 * 1024 * 1024;

export default function ReportPothole() {
  const geo = useGeolocation();
  const navigate = useNavigate();
  const [manual, setManual] = useState(false);
  const [pin, setPin] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [photoError, setPhotoError] = useState(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Put the pin on the GPS position whenever a new fix arrives
  useEffect(() => {
    if (geo.position) setPin({ lat: geo.position.lat, lng: geo.position.lng });
  }, [geo.position]);

  // Without GPS, start the manual pin at the city centre
  const showMap = Boolean(pin) || manual || geo.status === 'denied' || geo.status === 'unavailable';
  useEffect(() => {
    if (showMap && !pin) setPin({ lat: MAP_CENTER[0], lng: MAP_CENTER[1] });
  }, [showMap, pin]);

  useEffect(() => {
    const urls = photos.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u.url));
  }, [photos]);

  const onPhotos = (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (!selected.length) return;
    setPhotoError(null);

    const oversized = selected.find((f) => f.size > MAX_BYTES);
    if (oversized) {
      setPhotoError(`"${oversized.name}" exceeds the 8 MB limit per photo.`);
      return;
    }

    const merged = [...photos, ...selected];
    if (merged.length > MAX_PHOTOS) {
      setPhotoError(`You can upload up to ${MAX_PHOTOS} photos per report.`);
    }
    setPhotos(merged.slice(0, MAX_PHOTOS));
  };

  const removePhoto = (index) => {
    setPhotoError(null);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const moved = geo.position && pin ? distanceM(geo.position, pin) : null;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!pin || !photos.length) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    photos.forEach((file) => form.append('images', file));
    form.append('lat', pin.lat);
    form.append('lng', pin.lng);
    if (geo.position) {
      form.append('gps_lat', geo.position.lat);
      form.append('gps_lng', geo.position.lng);
      form.append('gps_accuracy', geo.position.accuracy);
    }
    if (description.trim()) form.append('description', description.trim());
    try {
      const { report } = await api('/reports', { method: 'POST', form });
      navigate(`/citizen/reports/${report.id}`);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <form className="report-form" onSubmit={onSubmit}>
      <h1>Report a pothole</h1>

      <section className="card">
        <h2><span className="step-no">1</span> Location</h2>
        <LocationStep geo={geo} manual={manual} setManual={setManual} />
        {showMap && pin && (
          <>
            <LocationPicker value={pin} onChange={setPin} gps={geo.position} />
            <div className="map-info">
              <span>Drag the pin or tap the map to mark the exact spot.</span>
              {geo.position && <span>GPS accuracy ± {formatMetres(geo.position.accuracy)}</span>}
              {moved != null && moved > 5 && <span>Pin is {formatMetres(moved)} from your GPS location</span>}
              {geo.status === 'granted' && <button type="button" className="link" onClick={geo.request}>Refresh location</button>}
            </div>
            <GpsAccuracyBanner accuracy={geo.position?.accuracy} />
            {moved != null && moved > PIN_MOVE_WARN_M && (
              <div className="alert alert-warn">
                The pin is far from where you are. That's fine if you're reporting a pothole you passed earlier, but the
                report may be reviewed manually.
              </div>
            )}
          </>
        )}
      </section>

      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><span className="step-no">2</span> Photos</h2>
          <span className="muted">{photos.length} / {MAX_PHOTOS} selected</span>
        </div>
        {photos.length < MAX_PHOTOS && (
          <label className="photo-input">
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onPhotos} />
            <span>
              📷 {photos.length ? 'Add more photos' : 'Take or choose 1–5 photos of the pothole'}
              <small>JPEG, PNG or WebP · up to 8 MB each · camera EXIF GPS read automatically if present</small>
            </span>
          </label>
        )}
        {photoError && <div className="alert alert-warn" style={{ marginTop: 10 }}>{photoError}</div>}
        {previews.length > 0 && (
          <div className="photo-previews">
            {previews.map((p, i) => (
              <div key={p.url} className="photo-thumb">
                <img src={p.url} alt={p.name} />
                <button
                  type="button"
                  className="photo-remove"
                  onClick={() => removePhoto(i)}
                  aria-label={`Remove ${p.name}`}
                  title="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2><span className="step-no">3</span> Details <span className="muted">(optional)</span></h2>
        <textarea
          rows={3}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Deep pothole in the left lane near the bus stop"
        />
      </section>

      <ErrorMessage error={error} />
      <button className="btn btn-primary btn-lg" disabled={busy || !pin || !photos.length}>
        {busy ? 'Submitting…' : 'Submit report'}
      </button>
      {!pin && <p className="muted center">Set a location to continue.</p>}
    </form>
  );
}
