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
    ['Total problems', counts?.total, 'total'],
    ['Active problems', counts?.active, 'active'],
    ['Solved problems', counts?.solved, 'solved'],
  ];
  return (
    <div className="counters">
      {items.map(([label, n, key]) => (
        <div key={key} className={`counter counter-${key}`}>
          <span className="counter-value">{n ?? '–'}</span>
          <span className="counter-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
