const dateFmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export const formatDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : '—');
export const formatMetres = (m) => (m == null ? '—' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
export const formatPct = (c) => (c == null ? '—' : `${Math.round(Number(c) * 100)}%`);

export const FLAG_LABELS = {
  manual_location: 'Location placed manually (no GPS)',
  pin_moved_far: 'Pin moved far from GPS location',
  low_gps_accuracy: 'Low GPS accuracy',
  possible_duplicate: 'Possible duplicate of a nearby report',
};

/** Distance in metres between two lat/lng points (haversine). */
export function distanceM(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const MAP_CENTER = [
  Number(import.meta.env.VITE_MAP_CENTER_LAT || 22.3072),
  Number(import.meta.env.VITE_MAP_CENTER_LNG || 73.1812),
];
