import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

/** Total / Active / Solved counters (README §5). Refreshes every 15 s. */
export default function Counters({ refreshKey }) {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => api('/stats/counters').then((c) => alive && setCounts(c)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [refreshKey]);

  const items = [
    { label: 'Total Verified Reports', n: counts?.total, key: 'total', sub: 'Cumulative valid issues' },
    { label: 'Active in Pipeline', n: counts?.active, key: 'active', sub: 'Assigned or being repaired' },
    { label: 'Repaired & Solved', n: counts?.solved, key: 'solved', sub: 'Confirmed fixed by city' },
  ];
  return (
    <div className="counters">
      {items.map((item) => (
        <div key={item.key} className={`counter counter-${item.key}`}>
          <span className="counter-label">{item.label}</span>
          <span className="counter-value">{item.n ?? '–'}</span>
          <span className="muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>{item.sub}</span>
        </div>
      ))}
    </div>
  );
}
