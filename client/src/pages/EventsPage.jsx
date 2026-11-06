import { useState, useEffect } from 'react';
import { api, money } from '../api';
import { Loading } from '../components';

export default function EventsPage({ defaultCategory = 'Events', pageTitle = 'Live Events & Shows' }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultCategory);
  const [bookedEvent, setBookedEvent] = useState(null);

  useEffect(() => {
    setActiveTab(defaultCategory);
  }, [defaultCategory]);

  useEffect(() => {
    setLoading(true);
    const query = activeTab === 'All' ? {} : { category: activeTab };
    api('/bms/events', { query })
      .then((data) => {
        setEvents(data?.events || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="bms-page-container">
      <div className="bms-page-header">
        <span className="bms-page-badge">Live Experiences</span>
        <h1 className="bms-page-title">{pageTitle}</h1>
        <p className="bms-page-desc">
          Discover music concerts, stand-up comedy specials, cricket fan parks, and world-class theatrical plays.
        </p>

        {/* Categories Bar */}
        <div className="events-category-bar">
          {['Events', 'Plays', 'Sports', 'All'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`event-cat-btn ${activeTab === cat ? 'active' : ''}`}
              onClick={() => setActiveTab(cat)}
            >
              {cat === 'Events' && '🎤 '}
              {cat === 'Plays' && '🎭 '}
              {cat === 'Sports' && '🏏 '}
              {cat === 'All' && '🌟 '}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading && <Loading label="Loading live experiences..." />}

      <div className="events-grid">
        {events.map((evt) => (
          <div key={evt.id} className="event-card">
            <div className="event-poster-wrap">
              <img src={evt.poster} alt={evt.title} className="event-poster-img" loading="lazy" />
              <div className="event-badge-row">
                <span className="event-rating">{evt.rating}</span>
                <span className="event-type">{evt.type}</span>
              </div>
            </div>

            <div className="event-body">
              <h3 className="event-title">{evt.title}</h3>
              <p className="event-venue">📍 {evt.venue}, {evt.city}</p>
              <p className="event-date">
                📅 {new Date(evt.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>

              <div className="event-tags-row">
                {evt.tags?.map((t) => (
                  <span key={t} className="event-tag">{t}</span>
                ))}
              </div>

              <div className="event-footer">
                <div>
                  <span className="event-price-label">From</span>
                  <strong className="event-price">{money(evt.priceFrom)}</strong>
                </div>
                <button
                  type="button"
                  className="btn-book-event"
                  onClick={() => setBookedEvent(evt)}
                >
                  Book Tickets
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Simulated Event Ticket Modal */}
      {bookedEvent && (
        <div className="event-modal-overlay" onClick={() => setBookedEvent(null)}>
          <div className="event-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setBookedEvent(null)}>✕</button>
            <div className="ticket-header-bms">
              <span className="ticket-badge-bms">CONFIRMED PASS</span>
              <h2>{bookedEvent.title}</h2>
              <p className="ticket-venue">📍 {bookedEvent.venue}, {bookedEvent.city}</p>
              <p className="ticket-time">📅 {new Date(bookedEvent.date).toLocaleString('en-IN')}</p>
            </div>

            <div className="ticket-body-bms">
              <div className="ticket-row-bms">
                <span>Pass Category:</span>
                <strong>VIP Access (Early Bird)</strong>
              </div>
              <div className="ticket-row-bms">
                <span>Pass Price:</span>
                <strong>{money(bookedEvent.priceFrom)}</strong>
              </div>
              <div className="ticket-row-bms">
                <span>Booking ID:</span>
                <strong className="ticket-code">BMS-EVT-{Math.floor(100000 + Math.random() * 900000)}</strong>
              </div>
            </div>

            <div className="ticket-qr-bms">
              <div className="qr-simulated">
                <svg viewBox="0 0 100 100" width="110" height="110">
                  <rect width="100" height="100" fill="#fff" />
                  <path d="M10 10h30v30H10zm5 5v20h20V15zm45-5h30v30H60zm5 5v20h20V15zM10 60h30v30H10zm5 5v20h20V65zm45 0h10v10H60zm15 0h15v15H75zm-15 15h10v15H60zm15 10h15v5H75z" fill="#111" />
                </svg>
              </div>
              <p className="qr-note">Scan this M-Pass at the venue gate for instant check-in</p>
            </div>

            <button className="btn-done-pass" onClick={() => setBookedEvent(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
