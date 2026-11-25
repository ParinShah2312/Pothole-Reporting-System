import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import StatusBadge from '../common/StatusBadge.jsx';
import { OSM_TILES } from '../map/ReportsMap.jsx';
import { FLAG_LABELS, formatDate, formatMetres, formatPct } from '../../utils/format.js';
import { statusColor, statusLabel } from '../../utils/status.js';

const RESULT_LABEL = { accepted: 'Accepted', rejected: 'Rejected', uncertain: 'Uncertain', error: 'AI unavailable' };

function AiResults({ items }) {
  if (!items.length) return <p className="muted">AI verification has not run yet.</p>;
  return (
    <ul className="ai-list">
      {items.map((a) => (
        <li key={a.id} className={`ai-item ai-${a.result}`}>
          <div>
            <strong>{a.type === 'initial' ? 'Pothole check' : 'Repair check'}</strong>
            <span className="ai-result">{RESULT_LABEL[a.result]}</span>
          </div>
          <div className="muted">
            Confidence {formatPct(a.confidence)} · {a.model_version || '—'} · {formatDate(a.verified_at)}
          </div>
          {a.details?.distance_m != null && (
            <div className="muted">Completion photo {formatMetres(a.details.distance_m)} from report location</div>
          )}
          {a.details?.reasons?.length > 0 && <ul className="reasons">{a.details.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
        </li>
      ))}
    </ul>
  );
}

function Timeline({ history }) {
  return (
    <ol className="timeline">
      {history.map((h) => (
        <li key={h.id} style={{ '--dot': statusColor(h.new_status) }}>
          <strong>{statusLabel(h.new_status)}</strong>
          <span className="muted">
            {formatDate(h.changed_at)} · {h.changed_by_name ? `by ${h.changed_by_name}` : 'by system (AI)'}
          </span>
          {h.note && <span>{h.note}</span>}
        </li>
      ))}
    </ol>
  );
}

/** Full report view shared by citizen and government pages. `showFlags` for staff. */
export default function ReportDetailsView({ report, showFlags = false, children }) {
  return (
    <div className="details">
      <div className="details-head">
        <div>
          <h1>Report #{report.id}</h1>
          <p className="muted">{report.address || `${report.lat.toFixed(5)}, ${report.lng.toFixed(5)}`} · Reported {formatDate(report.created_at)}</p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className="details-grid">
        <section className="card">
          <h2>Photos</h2>
          <div className="photos">
            {report.images.map((img) => (
              <figure key={img.id}>
                <img src={img.url} alt="Reported pothole" />
                <figcaption>Citizen photo</figcaption>
              </figure>
            ))}
            {report.completionImages.map((img) => (
              <figure key={`c${img.id}`}>
                <img src={img.url} alt="Completion" />
                <figcaption>Completion photo · {formatMetres(img.distance_m)} away</figcaption>
              </figure>
            ))}
          </div>
          {report.description && <p className="description">{report.description}</p>}
        </section>

        <section className="card">
          <h2>Location</h2>
          <MapContainer center={[report.lat, report.lng]} zoom={16} style={{ height: 240 }} className="map">
            <TileLayer {...OSM_TILES} />
            <CircleMarker center={[report.lat, report.lng]} radius={10} pathOptions={{ color: '#fff', weight: 2, fillColor: statusColor(report.status), fillOpacity: 1 }} />
          </MapContainer>
          <dl className="facts">
            <dt>Captured by</dt><dd>{report.location_source === 'gps' ? 'GPS + map pin' : 'Manual map pin'}</dd>
            {report.gps_accuracy_m != null && <><dt>GPS accuracy</dt><dd>± {formatMetres(report.gps_accuracy_m)}</dd></>}
            {report.pin_moved_m != null && <><dt>Pin moved</dt><dd>{formatMetres(report.pin_moved_m)} from GPS</dd></>}
            {report.department_name && <><dt>Department</dt><dd>{report.department_name}</dd></>}
          </dl>
          {showFlags && report.location_flags?.length > 0 && (
            <div className="alert alert-warn">
              {report.location_flags.map((f) => <div key={f}>⚠ {FLAG_LABELS[f] || f}</div>)}
            </div>
          )}
        </section>

        <section className="card">
          <h2>AI verification</h2>
          <AiResults items={report.aiVerifications} />
        </section>

        <section className="card">
          <h2>Status history</h2>
          <Timeline history={report.history} />
        </section>
      </div>

      {children}
    </div>
  );
}
