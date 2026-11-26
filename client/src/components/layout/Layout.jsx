import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { isStaff, useAuth } from '../../context/AuthContext.jsx';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const staff = isStaff(user);
  const isAdmin = user?.role === 'admin';

  const onLogout = () => {
    logout();
    navigate(staff ? '/gov/login' : '/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to={isAdmin ? '/admin/review' : staff ? '/gov' : '/'} className="brand">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <div>
            <span>Smart Civic Roads</span>
            <small>{isAdmin ? 'Admin Console' : staff ? 'Government Portal' : 'Vadodara'}</small>
          </div>
        </Link>
        <nav className="nav-links">
          {isAdmin ? (
            <>
              <NavLink to="/admin/review">Review queue</NavLink>
              <NavLink to="/admin/users">Users</NavLink>
              <NavLink to="/admin/audit-logs">Audit logs</NavLink>
              <NavLink to="/admin/settings">Settings</NavLink>
              <NavLink to="/gov" end>Gov view</NavLink>
              <NavLink to="/stats">Stats</NavLink>
            </>
          ) : staff ? (
            <>
              <NavLink to="/gov" end>Dashboard</NavLink>
              <NavLink to="/stats">Stats</NavLink>
              <NavLink to="/map">Live map</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/map">Live map</NavLink>
              <NavLink to="/stats">Stats</NavLink>
              {user && <NavLink to="/citizen" end>My reports</NavLink>}
              <NavLink to="/citizen/report" className="btn btn-primary btn-sm">Report a pothole</NavLink>
            </>
          )}
          {user ? (
            <span className="nav-user">
              {!staff ? (
                <NavLink to="/citizen/profile">{user.name}</NavLink>
              ) : (
                <span className="muted">{user.name}</span>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>Log out</button>
            </span>
          ) : (
            <NavLink to="/login">Log in</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="container main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <strong>Smart Civic Roads</strong> · Road Issue Reporting &amp; Pothole Verification for Vadodara
          </div>
          <div>
            <Link to="/gov/login" className="link" style={{ fontSize: '0.86rem' }}>Government login</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
