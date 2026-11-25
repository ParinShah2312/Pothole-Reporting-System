import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Landing from './pages/public/Landing.jsx';
import LiveMap from './pages/public/LiveMap.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import CitizenDashboard from './pages/citizen/CitizenDashboard.jsx';
import ReportPothole from './pages/citizen/ReportPothole.jsx';
import CitizenReportDetails from './pages/citizen/CitizenReportDetails.jsx';
import GovDashboard from './pages/government/GovDashboard.jsx';
import GovReportDetails from './pages/government/GovReportDetails.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="map" element={<LiveMap />} />
        <Route path="login" element={<Login portal="citizen" />} />
        <Route path="register" element={<Register />} />
        <Route path="gov/login" element={<Login portal="government" />} />

        <Route element={<ProtectedRoute roles={['citizen']} />}>
          <Route path="citizen" element={<CitizenDashboard />} />
          <Route path="citizen/report" element={<ReportPothole />} />
          <Route path="citizen/reports/:id" element={<CitizenReportDetails />} />
        </Route>

        <Route element={<ProtectedRoute roles={['government', 'admin']} loginPath="/gov/login" />}>
          <Route path="gov" element={<GovDashboard />} />
          <Route path="gov/reports/:id" element={<GovReportDetails />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
