import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Snapshare
        </Link>

        {user ? (
          <nav className="nav-links">
            <NavLink to="/" end>Feed</NavLink>
            <NavLink to="/upload" className="btn btn-primary btn-sm">+ Upload</NavLink>
            <span className="nav-user" title={user.email}>@{user.username}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
          </nav>
        ) : (
          <nav className="nav-links">
            <NavLink to="/login">Log in</NavLink>
            <NavLink to="/register" className="btn btn-primary btn-sm">Sign up</NavLink>
          </nav>
        )}
      </div>
    </header>
  );
}
