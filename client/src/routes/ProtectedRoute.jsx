import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homePathFor, useAuth } from '../context/AuthContext.jsx';
import { Loading } from '../components/common/Feedback.jsx';

/** Renders child routes only for logged-in users with one of `roles`. */
export default function ProtectedRoute({ roles, loginPath = '/login' }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
}
