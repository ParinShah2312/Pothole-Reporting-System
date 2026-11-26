import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { formatMetres } from '../../utils/format.js';
import { OSM_TILES } from './ReportsMap.jsx';

export const TARGET_GPS_M = 25;
export const POOR_GPS_M = 100; // matches server LOW_GPS_ACCURACY_M

const pinIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

function ClickToMove({ onChange }) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, Math.max(map.getZoom(), 17));
  }, [center, map]);
  return null;
}

/** Shows a warning banner when browser GPS precision exceeds target thresholds. */
export function GpsAccuracyBanner({ accuracy }) {
  if (accuracy == null || !Number.isFinite(accuracy)) return null;
  if (accuracy > POOR_GPS_M) {
    return (
      <div className="alert alert-warn">
        <strong>Weak GPS accuracy (± {formatMetres(accuracy)}).</strong>{' '}
        This exceeds the {POOR_GPS_M} m threshold, so the report may be flagged for manual review.
        Move to an open area for a sharper fix, or zoom in and drag the pin to the exact pothole.
      </div>
    );
  }
  if (accuracy > TARGET_GPS_M) {
    return (
      <div className="notice">
        Moderate GPS accuracy (± {formatMetres(accuracy)}). Please verify the pin aligns with the road edge on the map.
      </div>
    );
  }
  return null;
}

/**
 * Draggable pin. `gps` ({lat,lng,accuracy}) is drawn as a dot with its accuracy radius;
 * `reference` (e.g. the original report location) is drawn as a red dot.
 */
export default function LocationPicker({ value, onChange, gps, reference, referenceRadiusM = null, height = 340 }) {
  const markerRef = useRef(null);
  const handlers = useMemo(() => ({
    dragend() {
      const m = markerRef.current;
      if (m) onChange(m.getLatLng());
    },
  }), [onChange]);

  const recenterTo = useMemo(() => (gps ? [gps.lat, gps.lng] : null), [gps]);
  const weakGps = gps?.accuracy > TARGET_GPS_M;
  const ringColor = weakGps ? '#d97706' : '#3182ce';

  return (
    <MapContainer center={[value.lat, value.lng]} zoom={16} style={{ height }} className="map">
      <TileLayer {...OSM_TILES} />
      <Recenter center={recenterTo} />
      <ClickToMove onChange={onChange} />
      {gps && (
        <>
          <Circle center={[gps.lat, gps.lng]} radius={gps.accuracy || 0} pathOptions={{ color: ringColor, weight: 1.5, fillOpacity: 0.12 }} />
          <CircleMarker center={[gps.lat, gps.lng]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: ringColor, fillOpacity: 1 }} />
        </>
      )}
      {reference && (
        <>
          {referenceRadiusM && (
            <Circle center={[reference.lat, reference.lng]} radius={referenceRadiusM} pathOptions={{ color: '#059669', weight: 1.5, dashArray: '4 4', fillOpacity: 0.08 }} />
          )}
          <CircleMarker center={[reference.lat, reference.lng]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: '#d64545', fillOpacity: 1 }} />
        </>
      )}
      <Marker position={[value.lat, value.lng]} draggable icon={pinIcon} eventHandlers={handlers} ref={markerRef} />
    </MapContainer>
  );
}
