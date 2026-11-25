import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReportDetailsView from '../../components/report/ReportDetailsView.jsx';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import { api } from '../../services/api.js';

export default function CitizenReportDetails() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => api(`/reports/${id}`).then((d) => setReport(d.report)).catch(setError), [id]);
  useEffect(() => { load(); }, [load]);

  // While the AI check is running, poll for the result
  const pending = report?.status === 'pending_verification';
  useEffect(() => {
    if (!pending) return undefined;
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [pending, load]);

  if (error) return <ErrorMessage error={error} />;
  if (!report) return <Loading />;

  return (
    <>
      <Link to="/citizen" className="back">← My reports</Link>
      {pending && <div className="notice pulse">🤖 AI is checking your photo for a pothole…</div>}
      {report.status === 'rejected' && (
        <div className="alert alert-error">
          The AI could not confirm a pothole in this photo, so the report was rejected. An administrator can review it.
        </div>
      )}
      {report.status === 'under_review' && (
        <div className="alert alert-warn">The AI result was uncertain, so this report will be reviewed by an administrator.</div>
      )}
      <ReportDetailsView report={report} />
    </>
  );
}
