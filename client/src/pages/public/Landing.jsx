import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Counters from '../../components/common/Counters.jsx';
import ReportsMap, { MapLegend } from '../../components/map/ReportsMap.jsx';
import { api } from '../../services/api.js';
import { MAP_STATUSES } from '../../utils/status.js';

const STEPS = [
  ['Report', 'Citizen submits a photo and location'],
  ['AI verify', 'Photo is checked for a genuine pothole'],
  ['Assign', 'Routed to the responsible department'],
  ['Repair', 'Crew fixes the road'],
  ['Verify again', 'Completion photo is AI-checked'],
  ['Solved', 'Report closes and counters update'],
];

export default function Landing() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    api('/reports/map').then((d) => setReports(d.reports)).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Civic tech · Vadodara</p>
          <h1>Report a pothole. Track it until it's actually fixed.</h1>
          <p className="lead">
            Snap a photo, drop a pin, and follow your report from AI verification to a verified repair.
            A report only closes when the fix is confirmed.
          </p>
          <div className="hero-actions">
            <Link to="/citizen/report" className="btn btn-primary">Report a pothole</Link>
            <Link to="/map" className="btn btn-ghost">View live map</Link>
          </div>
        </div>
        <Counters />
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Reported problems across the city</h2>
          <MapLegend statuses={MAP_STATUSES} />
        </div>
        <ReportsMap reports={reports} height={380} />
      </section>

      <section>
        <h2>How it works</h2>
        <ol className="steps">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <span className="step-no">{i + 1}</span>
              <strong>{title}</strong>
              <span className="muted">{text}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
