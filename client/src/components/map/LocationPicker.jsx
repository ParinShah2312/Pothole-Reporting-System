import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { OSM_TILES } from './ReportsMap.jsx';

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

/**
 * Draggable pin. `gps` ({lat,lng,accuracy}) is drawn as a blue dot with its accuracy radius;
 * `reference` (e.g. the original report location) is drawn as a red dot.
 */
export default function LocationPicker({ value, onChange, gps, reference, height = 340 }) {
  const markerRef = useRef(null);
  const handlers = useMemo(() => ({
    dragend() {
      const m = markerRef.current;
      if (m) onChange(m.getLatLng());
    },
  }), [onChange]);

  const recenterTo = useMemo(() => (gps ? [gps.lat, gps.lng] : null), [gps]);

  return (
    <MapContainer center={[value.lat, value.lng]} zoom={16} style={{ height }} className="map">
      <TileLayer {...OSM_TILES} />
      <Recenter center={recenterTo} />
      <ClickToMove onChange={onChange} />
      {gps && (
        <>
          <Circle center={[gps.lat, gps.lng]} radius={gps.accuracy || 0} pathOptions={{ color: '#3182ce', weight: 1, fillOpacity: 0.1 }} />
          <CircleMarker center={[gps.lat, gps.lng]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#3182ce', fillOpacity: 1 }} />
        </>
      )}
      {reference && (
        <CircleMarker center={[reference.lat, reference.lng]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: '#d64545', fillOpacity: 1 }} />
      )}
      <Marker position={[value.lat, value.lng]} draggable icon={pinIcon} eventHandlers={handlers} ref={markerRef} />
    </MapContainer>
  );
}
