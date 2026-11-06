import { Link, NavLink, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { RequireRole } from './components.jsx';
import Movies from './pages/Movies.jsx';
import MovieDetail from './pages/MovieDetail.jsx';
import SeatSelection from './pages/SeatSelection.jsx';
import MyBookings from './pages/MyBookings.jsx';
import { Login, Register } from './pages/AuthPages.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Catalog from './pages/admin/Catalog.jsx';
import Shows from './pages/admin/Shows.jsx';
import Validate from './pages/Validate.jsx';

export default function App() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const isHome = loc.pathname === '/';

  return (
    <div className="app-shell">
      <a href="#main" className="skip">Skip to content</a>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand-logo" aria-label="MOVTIC CineBook Home">
            <span className="brand-badge">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 3v2h2V7H4zm16 0h-2v2h2V7zm-16 4v2h2v-2H4zm16 0h-2v2h2v-2zm-16 4v2h2v-2H4zm16 0h-2v2h2v-2zM8 7h8v10H8V7z"/>
              </svg>
            </span>
            <span className="brand-title">MOVTIC</span>
          </Link>

          <nav className="nav-main" aria-label="Main Navigation">
            <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Movies</NavLink>
            <NavLink to="/?tab=events" className="nav-link">Events</NavLink>
            <NavLink to="/?tab=sports" className="nav-link">Sports</NavLink>
            {user && <NavLink to="/bookings" className="nav-link">My Bookings</NavLink>}
            {user && ['staff', 'admin'].includes(user.role) && <NavLink to="/validate" className="nav-link">Validate Ticket</NavLink>}
            {user?.role === 'admin' && (
              <>
                <NavLink to="/admin" className="nav-link">Dashboard</NavLink>
                <NavLink to="/admin/catalog" className="nav-link">Catalog</NavLink>
                <NavLink to="/admin/shows" className="nav-link">Shows</NavLink>
              </>
            )}
          </nav>

          <div className="topbar-actions">
            {user ? (
              <div className="user-profile">
                <span className="user-avatar" aria-hidden="true">{user.name[0].toUpperCase()}</span>
                <span className="user-name">
                  {user.name} <span className="user-role-pill">{user.role}</span>
                </span>
                <button className="btn-logout" onClick={() => { logout(); nav('/'); }}>Log out</button>
              </div>
            ) : (
              <div className="auth-btns">
                <Link to="/login" className="nav-link-login">Log In</Link>
                <Link to="/register" className="btn-join-us">JOIN US</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="main" className={isHome ? 'main-full' : 'main-contained'}>
        <Routes>
          <Route path="/" element={<Movies />} />
          <Route path="/movies/:id" element={<MovieDetail />} />
          <Route path="/shows/:id" element={<RequireRole><SeatSelection /></RequireRole>} />
          <Route path="/bookings" element={<RequireRole><MyBookings /></RequireRole>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/validate" element={<RequireRole roles={['staff', 'admin']}><Validate /></RequireRole>} />
          <Route path="/admin" element={<RequireRole roles={['admin']}><Dashboard /></RequireRole>} />
          <Route path="/admin/catalog" element={<RequireRole roles={['admin']}><Catalog /></RequireRole>} />
          <Route path="/admin/shows" element={<RequireRole roles={['admin']}><Shows /></RequireRole>} />
          <Route path="*" element={<p className="empty">Page not found.</p>} />
        </Routes>
      </main>

      <footer className="footer-bar">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand-badge small">🎬</span>
            <strong>MOVTIC</strong> — Cinema Booking System
          </div>
          <div className="footer-meta">
            <span>Powered by Node.js, Express, MongoDB & React</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
