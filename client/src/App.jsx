import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Landing from './pages/public/Landing.jsx';
import LiveMap from './pages/public/LiveMap.jsx';
import StatsDashboard from './pages/public/StatsDashboard.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import VerifyEmail from './pages/auth/VerifyEmail.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import CitizenDashboard from './pages/citizen/CitizenDashboard.jsx';
import CitizenProfile from './pages/citizen/CitizenProfile.jsx';
import ReportPothole from './pages/citizen/ReportPothole.jsx';
import CitizenReportDetails from './pages/citizen/CitizenReportDetails.jsx';
import GovDashboard from './pages/government/GovDashboard.jsx';
import GovReportDetails from './pages/government/GovReportDetails.jsx';
import AdminReviewQueue from './pages/admin/AdminReviewQueue.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminAuditLogs from './pages/admin/AdminAuditLogs.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="map" element={<LiveMap />} />
        <Route path="stats" element={<StatsDashboard />} />
        <Route path="login" element={<Login portal="citizen" />} />
        <Route path="register" element={<Register />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="gov/login" element={<Login portal="government" />} />

        <Route element={<ProtectedRoute roles={['citizen']} />}>
          <Route path="citizen" element={<CitizenDashboard />} />
          <Route path="citizen/profile" element={<CitizenProfile />} />
          <Route path="citizen/report" element={<ReportPothole />} />
          <Route path="citizen/reports/:id" element={<CitizenReportDetails />} />
        </Route>

        <Route element={<ProtectedRoute roles={['government', 'admin']} loginPath="/gov/login" />}>
          <Route path="gov" element={<GovDashboard />} />
          <Route path="gov/reports/:id" element={<GovReportDetails />} />
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} loginPath="/gov/login" />}>
          <Route path="admin" element={<Navigate to="/admin/review" replace />} />
          <Route path="admin/review" element={<AdminReviewQueue />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/audit-logs" element={<AdminAuditLogs />} />
          <Route path="admin/settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
