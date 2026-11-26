import { useEffect, useMemo, useState } from 'react';
import Counters from '../../components/common/Counters.jsx';
import { ErrorMessage } from '../../components/common/Feedback.jsx';
import ReportsMap from '../../components/map/ReportsMap.jsx';
import { api } from '../../services/api.js';
import { MAP_CENTER } from '../../utils/format.js';
import { MAP_STATUSES, statusColor, statusLabel } from '../../utils/status.js';

export default function LiveMap() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(new Set(MAP_STATUSES));
  const [clustered, setClustered] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const [focusLocation, setFocusLocation] = useState(null);

  useEffect(() => {
    api('/reports/map').then((d) => setReports(d.reports)).catch(setError);
  }, []);

  const shown = useMemo(() => reports.filter((r) => visible.has(r.status)), [reports, visible]);
  const toggle = (s) => setVisible((v) => {
    const next = new Set(v);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(`${q}, Vadodara, Gujarat, India`)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Geocoding lookup failed');
      const items = await res.json();
      if (!items.length) {
        setSearchError(`No locations matching "${q}" found in Vadodara.`);
      } else {
        setSearchResults(items);
        const first = items[0];
        setFocusLocation({ lat: Number(first.lat), lng: Number(first.lon), zoom: 15, label: first.display_name, ts: Date.now() });
      }
    } catch {
      setSearchError('Location search is temporarily unavailable. Check your internet connection or pan manually.');
    } finally {
      setSearching(false);
    }
  };

  const resetView = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setFocusLocation({ lat: MAP_CENTER[0], lng: MAP_CENTER[1], zoom: 13, label: 'Vadodara City Center', ts: Date.now() });
  };

  return (
    <>
      <div className="page-head">
        <h1>Live map</h1>
        <Counters />
      </div>
      <ErrorMessage error={error} />

      <div className="map-toolbar">
        <form className="map-search" onSubmit={handleSearch}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Vadodara area or road (e.g. Alkapuri, Gotri, Fatehgunj)…"
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={searching || !searchQuery.trim()}>
            {searching ? 'Searching…' : 'Find'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetView}>Reset</button>
        </form>

        <label className="chip">
          <input type="checkbox" checked={clustered} onChange={(e) => setClustered(e.target.checked)} />
          Cluster markers
        </label>
      </div>

      {searchError && <div className="notice">{searchError}</div>}
      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((item) => (
            <button
              key={item.place_id}
              type="button"
              className="chip"
              onClick={() => setFocusLocation({ lat: Number(item.lat), lng: Number(item.lon), zoom: 16, label: item.display_name, ts: Date.now() })}
            >
              📍 {item.display_name.split(',').slice(0, 2).join(',')}
            </button>
          ))}
        </div>
      )}

      <div className="filters">
        {MAP_STATUSES.map((s) => (
          <label key={s} className="chip">
            <input type="checkbox" checked={visible.has(s)} onChange={() => toggle(s)} />
            <i style={{ background: statusColor(s) }} />
            {statusLabel(s)} ({reports.filter((r) => r.status === s).length})
          </label>
        ))}
      </div>

      <ReportsMap
        reports={shown}
        height="65vh"
        clustered={clustered}
        focusLocation={focusLocation}
      />
    </>
  );
}
