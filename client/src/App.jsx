import { useState, useEffect } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { RequireRole } from './components.jsx';
import CityModal from './components/CityModal.jsx';

import Movies from './pages/Movies.jsx';
import MovieDetail from './pages/MovieDetail.jsx';
import SeatSelection from './pages/SeatSelection.jsx';
import MyBookings from './pages/MyBookings.jsx';
import OffersPage from './pages/OffersPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import StreamPage from './pages/StreamPage.jsx';
import { Login, Register } from './pages/AuthPages.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Catalog from './pages/admin/Catalog.jsx';
import Shows from './pages/admin/Shows.jsx';
import Validate from './pages/Validate.jsx';

export default function App() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  // Selected city persisted in localStorage
  const [selectedCity, setSelectedCity] = useState(
    () => localStorage.getItem('bms_city') || 'Jalandhar'
  );
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleCityChange = (city) => {
    setSelectedCity(city);
    localStorage.setItem('bms_city', city);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      nav(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="bms-app-shell">
      <a href="#main" className="skip">Skip to content</a>

      {/* ===== TOP NAVIGATION BAR (MOVTIC / BOOKMYSHOW) ===== */}
      <header className="topbar">
        <div className="topbar-inner">
          {/* Brand Logo matching screenshot */}
          <Link to="/" className="brand-logo" aria-label="MOVTIC Home">
            <span className="brand-badge">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 3v2h2V7H4zm16 0h-2v2h2V7zm-16 4v2h2v-2H4zm16 0h-2v2h2v-2zm-16 4v2h2v-2H4zm16 0h-2v2h2v-2zM8 7h8v10H8V7z"/>
              </svg>
            </span>
            <span className="brand-title">MOVTIC</span>
          </Link>

          {/* Navigation Links matching screenshot */}
          <nav className="nav-main" aria-label="Main navigation">
            <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              MOVIES
            </NavLink>
            <NavLink to="/events" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              EVENTS
            </NavLink>
            <NavLink to="/sports" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              SPORTS
            </NavLink>
            <NavLink to="/stream" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              PAGES
            </NavLink>
            <NavLink to="/offers" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              OFFERS
            </NavLink>
            <a href="#contact-footer" className="nav-link">
              CONTACT
            </a>
          </nav>

          {/* Right actions: City selector + Join Us / User profile */}
          <div className="topbar-actions">
            <button
              type="button"
              className="bms-city-selector-btn"
              onClick={() => setIsCityModalOpen(true)}
              aria-label={`Current city ${selectedCity}. Click to change city.`}
            >
              <span className="city-pin-icon" aria-hidden="true">📍</span>
              <span className="city-current-name">{selectedCity}</span>
              <span className="city-caret" aria-hidden="true">▼</span>
            </button>

            {user ? (
              <div className="bms-user-dropdown-wrap">
                <button
                  type="button"
                  className="bms-user-btn"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-expanded={userMenuOpen}
                >
                  <span className="bms-user-avatar" aria-hidden="true">
                    {user.name[0].toUpperCase()}
                  </span>
                  <span className="bms-user-name">{user.name.split(' ')[0]}</span>
                  <span className="bms-user-caret">▼</span>
                </button>

                {userMenuOpen && (
                  <div className="bms-user-menu" onClick={() => setUserMenuOpen(false)}>
                    <div className="user-menu-header">
                      <strong>{user.name}</strong>
                      <span className="user-menu-role">{user.role}</span>
                    </div>
                    <Link to="/bookings" className="user-menu-item">🎟️ My Bookings</Link>
                    {['staff', 'admin'].includes(user.role) && (
                      <Link to="/validate" className="user-menu-item">✅ Validate Ticket</Link>
                    )}
                    {user.role === 'admin' && (
                      <>
                        <Link to="/admin" className="user-menu-item">📊 Admin Dashboard</Link>
                        <Link to="/admin/catalog" className="user-menu-item">🎬 Manage Catalog</Link>
                        <Link to="/admin/shows" className="user-menu-item">🗓️ Manage Shows</Link>
                      </>
                    )}
                    <button
                      type="button"
                      className="user-menu-item logout"
                      onClick={() => { logout(); nav('/'); }}
                    >
                      🚪 Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-btns">
                <Link to="/login" className="nav-link-login">
                  Sign in
                </Link>
                <Link to="/register" className="btn-join-us">
                  JOIN US
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Router */}
      <main id="main" className="bms-main-content">
        <Routes>
          <Route path="/" element={<Movies currentCity={selectedCity} onOpenCityModal={() => setIsCityModalOpen(true)} />} />
          <Route path="/movies/:id" element={<MovieDetail currentCity={selectedCity} />} />
          <Route path="/shows/:id" element={<RequireRole><SeatSelection /></RequireRole>} />
          <Route path="/bookings" element={<RequireRole><MyBookings /></RequireRole>} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/events" element={<EventsPage defaultCategory="Events" pageTitle="Live Events & Music Concerts" />} />
          <Route path="/plays" element={<EventsPage defaultCategory="Plays" pageTitle="Theatre Plays & Musicals" />} />
          <Route path="/sports" element={<EventsPage defaultCategory="Sports" pageTitle="Sports Screenings & Fan Parks" />} />
          <Route path="/stream" element={<StreamPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/validate" element={<RequireRole roles={['staff', 'admin']}><Validate /></RequireRole>} />
          <Route path="/admin" element={<RequireRole roles={['admin']}><Dashboard /></RequireRole>} />
          <Route path="/admin/catalog" element={<RequireRole roles={['admin']}><Catalog /></RequireRole>} />
          <Route path="/admin/shows" element={<RequireRole roles={['admin']}><Shows /></RequireRole>} />
          <Route path="*" element={<p className="empty">Page not found.</p>} />
        </Routes>
      </main>

      {/* BookMyShow Footer */}
      <footer className="bms-footer">
        <div className="bms-footer-features">
          <div className="footer-feature-item">
            <span className="feat-icon" aria-hidden="true">🎟️</span>
            <div>
              <strong>100% Genuine Tickets</strong>
              <p>Authentic M-tickets with QR entry verification</p>
            </div>
          </div>
          <div className="footer-feature-item">
            <span className="feat-icon" aria-hidden="true">⚡</span>
            <div>
              <strong>Fast Cancellation & Refunds</strong>
              <p>Cancel up to 1 hr before showtime with auto refund</p>
            </div>
          </div>
          <div className="footer-feature-item">
            <span className="feat-icon" aria-hidden="true">🍿</span>
            <div>
              <strong>F&B Pre-Booking</strong>
              <p>Skip the cinema queue with combo snacks pre-ordered</p>
            </div>
          </div>
          <div className="footer-feature-item">
            <span className="feat-icon" aria-hidden="true">🔒</span>
            <div>
              <strong>Safe & Secure Checkout</strong>
              <p>256-bit encryption with UPI, Cards, and Net Banking</p>
            </div>
          </div>
        </div>

        <div className="bms-footer-bottom">
          <div className="bms-footer-inner">
            <div className="bms-footer-brand">
              <span className="bms-logo-badge small">🎬</span>
              <strong>ClickShow</strong> — Powered by BookMyShow Experience & TMDB Live API
            </div>
            <p className="bms-footer-copy">
              © 2026 ClickShow Entertainment Pvt. Ltd. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Global City Selector Modal */}
      <CityModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={selectedCity}
        onSelectCity={handleCityChange}
      />
    </div>
  );
}
