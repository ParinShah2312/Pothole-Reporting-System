import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { MAP_CENTER, formatDate } from '../../utils/format.js';
import { statusColor, statusLabel } from '../../utils/status.js';

export const OSM_TILES = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

/** Map of reports as colour-coded markers. `linkTo(report)` returns a details URL (optional). */
export default function ReportsMap({ reports, height = 420, zoom = 13, linkTo }) {
  return (
    <MapContainer center={MAP_CENTER} zoom={zoom} style={{ height }} className="map" scrollWheelZoom>
      <TileLayer {...OSM_TILES} />
      {reports.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.lat, r.lng]}
          radius={9}
          pathOptions={{ color: '#fff', weight: 2, fillColor: statusColor(r.status), fillOpacity: 0.95 }}
        >
          <Popup>
            <div className="map-popup">
              {r.image_url && <img src={r.image_url} alt="Reported pothole" />}
              <strong>Report #{r.id}</strong>
              <span className="badge" style={{ '--badge': statusColor(r.status) }}>{statusLabel(r.status)}</span>
              {r.address && <div className="muted">{r.address}</div>}
              <div className="muted">Reported {formatDate(r.created_at)}</div>
              {linkTo && <Link to={linkTo(r)}>Open report →</Link>}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

export function MapLegend({ statuses }) {
  return (
    <div className="legend">
      {statuses.map((s) => (
        <span key={s}><i style={{ background: statusColor(s) }} />{statusLabel(s)}</span>
      ))}
    </div>
  );
}
