import { useEffect } from 'react';
import L from 'leaflet';
import { MarkerClusterGroup } from 'leaflet.markercluster';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link, useNavigate } from 'react-router-dom';
import { MAP_CENTER, formatDate } from '../../utils/format.js';
import { statusColor, statusLabel } from '../../utils/status.js';

export const OSM_TILES = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

/** Builds a DOM node safely with textContent to avoid HTML injection in Leaflet popups. */
function buildPopupContent(report, linkTo, navigate) {
  const wrap = document.createElement('div');
  wrap.className = 'map-popup';

  if (report.image_url) {
    const img = document.createElement('img');
    img.src = report.image_url;
    img.alt = 'Reported pothole';
    wrap.appendChild(img);
  }

  const title = document.createElement('strong');
  title.textContent = `Report #${report.id}`;
  wrap.appendChild(title);

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.style.setProperty('--badge', statusColor(report.status));
  badge.textContent = statusLabel(report.status);
  wrap.appendChild(badge);

  if (report.address) {
    const addr = document.createElement('div');
    addr.className = 'muted';
    addr.textContent = report.address;
    wrap.appendChild(addr);
  }

  const date = document.createElement('div');
  date.className = 'muted';
  date.textContent = `Reported ${formatDate(report.created_at)}`;
  wrap.appendChild(date);

  if (linkTo) {
    const path = linkTo(report);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'link';
    btn.style.textAlign = 'left';
    btn.textContent = 'Open report →';
    btn.onclick = () => navigate(path);
    wrap.appendChild(btn);
  }

  return wrap;
}

function ClusteredReportMarkers({ reports, linkTo }) {
  const map = useMap();
  const navigate = useNavigate();

  useEffect(() => {
    const group = new MarkerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const size = count >= 20 ? 'lg' : count >= 6 ? 'md' : 'sm';
        return L.divIcon({
          html: `<span>${count}</span>`,
          className: `cluster-badge cluster-${size}`,
          iconSize: L.point(38, 38),
        });
      },
    });

    const markers = reports.map((r) => {
      const m = L.circleMarker([r.lat, r.lng], {
        radius: 9,
        color: '#fff',
        weight: 2,
        fillColor: statusColor(r.status),
        fillOpacity: 0.95,
      });
      m.bindPopup(() => buildPopupContent(r, linkTo, navigate));
      return m;
    });

    group.addLayers(markers);
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, reports, linkTo, navigate]);

  return null;
}

function FlyToLocation({ focus }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.lat, focus.lng], focus.zoom ?? 15, { duration: 0.8 });
  }, [map, focus]);
  return null;
}

/** Map of reports as colour-coded (and optionally clustered) markers. */
export default function ReportsMap({ reports, height = 420, zoom = 13, linkTo, clustered = true, focusLocation = null }) {
  return (
    <MapContainer center={MAP_CENTER} zoom={zoom} style={{ height }} className="map" scrollWheelZoom>
      <TileLayer {...OSM_TILES} />
      <FlyToLocation focus={focusLocation} />
      {clustered ? (
        <ClusteredReportMarkers reports={reports} linkTo={linkTo} />
      ) : (
        reports.map((r) => (
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
        ))
      )}
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
