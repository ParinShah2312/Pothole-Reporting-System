import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Counters from '../../components/common/Counters.jsx';
import ReportsMap, { MapLegend } from '../../components/map/ReportsMap.jsx';
import { api } from '../../services/api.js';
import { MAP_STATUSES } from '../../utils/status.js';

const STEPS = [
  { no: '1', title: 'Citizen Reports', text: 'Snap a photo and drop the exact location pin' },
  { no: '2', title: 'AI Verification', text: 'Computer vision checks for genuine pothole' },
  { no: '3', title: 'Zone Assignment', text: 'Routed to the responsible department' },
  { no: '4', title: 'Field Repair', text: 'Repair crew works on site' },
  { no: '5', title: 'Repair Check', text: 'Completion photo is verified at the location' },
  { no: '6', title: 'Closed & Solved', text: 'Report closed and civic counters update' },
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
          <p className="eyebrow">Vadodara · Civic Technology</p>
          <h1>Report a road issue. Track it until it's verifiably fixed.</h1>
          <p className="lead">
            Snap a photo, pin the location, and track your complaint through automated verification,
            municipal department dispatch, and photo-confirmed repair resolution.
          </p>
          <div className="hero-actions">
            <Link to="/citizen/report" className="btn btn-primary btn-lg" style={{ width: 'auto' }}>
              Report a pothole
            </Link>
            <Link to="/map" className="btn btn-ghost btn-lg" style={{ width: 'auto' }}>
              View live map
            </Link>
          </div>
        </div>
        <Counters />
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2>Reported Issues Across Vadodara</h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>Live public map showing verified potholes and repair progress</p>
          </div>
          <MapLegend statuses={MAP_STATUSES} />
        </div>
        <ReportsMap reports={reports} height={400} />
      </section>

      <section>
        <div className="section-head">
          <div>
            <h2>The Closed-Loop Resolution Cycle</h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>Every complaint is verified twice: before work begins, and after completion</p>
          </div>
        </div>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.no}>
              <span className="step-no">{s.no}</span>
              <strong style={{ marginTop: '4px' }}>{s.title}</strong>
              <span className="muted">{s.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
