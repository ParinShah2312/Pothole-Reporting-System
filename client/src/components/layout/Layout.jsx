import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { isStaff, useAuth } from '../../context/AuthContext.jsx';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const staff = isStaff(user);

  const onLogout = () => {
    logout();
    navigate(staff ? '/gov/login' : '/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to={staff ? '/gov' : '/'} className="brand">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <div>
            <span>Smart Civic Roads</span>
            <small>{staff ? 'Government Portal' : 'Vadodara'}</small>
          </div>
        </Link>
        <nav className="nav-links">
          {staff ? (
            <NavLink to="/gov" end>Dashboard</NavLink>
          ) : (
            <>
              <NavLink to="/map">Live map</NavLink>
              {user && <NavLink to="/citizen" end>My reports</NavLink>}
              <NavLink to="/citizen/report" className="btn btn-primary btn-sm">Report a pothole</NavLink>
            </>
          )}
          {user ? (
            <span className="nav-user">
              <span className="muted">{user.name}</span>
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
