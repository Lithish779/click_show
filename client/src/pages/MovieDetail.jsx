import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDateTime, money } from '../api.js';
import { useLoad } from '../hooks.js';
import { Empty, ErrorBox, Loading, Pager } from '../components.jsx';

const isoDay = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export default function MovieDetail({ currentCity }) {
  const { id } = useParams();
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  const [userRating, setUserRating] = useState(null);
  const [ratingModal, setRatingModal] = useState(false);
  const [page, setPage] = useState(1);

  const selectedIso = isoDay(dayOffset);

  const movie = useLoad(() => api(`/movies/${id}`), [id]);

  const range = useMemo(() => {
    const from = new Date(`${selectedIso}T00:00:00`);
    const to = new Date(`${selectedIso}T23:59:59`);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [selectedIso]);

  const shows = useLoad(() => api('/shows', { query: { movie: id, ...range, page, limit: 30 } }), [id, range, page]);

  // Group shows by Theatre
  const groupedTheatres = useMemo(() => {
    if (!shows.data?.data) return [];
    const map = new Map();

    shows.data.data.forEach((s) => {
      if (selectedFormat !== 'ALL' && s.format !== selectedFormat) return;
      const thId = s.screen.theatre._id;
      if (!map.has(thId)) {
        map.set(thId, {
          theatre: s.screen.theatre,
          shows: [],
        });
      }
      map.get(thId).shows.push(s);
    });

    return Array.from(map.values());
  }, [shows.data?.data, selectedFormat]);

  if (movie.loading) return <Loading label="Loading movie details…" />;
  if (movie.error) return <ErrorBox error={movie.error} />;
  const m = movie.data;

  const dateTabs = [0, 1, 2, 3, 4, 5, 6].map((o) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + o);
    const dayName = o === 0 ? 'TODAY' : o === 1 ? 'TOM' : dt.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();
    const dayNum = dt.getDate();
    const month = dt.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
    return { offset: o, dayName, dayNum, month };
  });

  return (
    <div className="bms-detail-container">
      {/* ===== HERO BACKDROP SECTION ===== */}
      <section
        className="bms-detail-hero"
        style={{
          backgroundImage: `linear-gradient(to right, #090c20 20%, rgba(9, 12, 32, 0.82) 65%, rgba(9, 12, 32, 0.95) 100%), url(${m.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200'})`,
        }}
      >
        <div className="detail-hero-content">
          <div className="detail-poster-col">
            <img src={m.posterUrl} alt={m.title} className="detail-poster-img" />
            <span className="poster-status-tag">IN CINEMAS</span>
          </div>

          <div className="detail-info-col">
            <h1 className="detail-title">{m.title}</h1>

            {/* BMS Rating Box */}
            <div className="bms-rating-card-box">
              <div className="rating-left">
                <span className="star-icon">★</span>
                <div>
                  <strong className="rating-score">{m.rating || '8.8/10'}</strong>
                  <span className="rating-votes">(45.2K Votes)</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-rate-movie"
                onClick={() => setRatingModal(true)}
              >
                {userRating ? `★ Rated ${userRating}/10` : 'Rate now'}
              </button>
            </div>

            <div className="detail-meta-pills">
              <span className="meta-pill">{m.formats?.join(', ') || '2D, 3D'}</span>
              <span className="meta-pill">{m.language}</span>
              <span className="meta-pill">{m.rating || 'U/A'}</span>
              <span className="meta-pill">{m.durationMins} mins</span>
              <span className="meta-pill">{m.genres?.join(', ')}</span>
            </div>

            <div className="detail-cta-row">
              <a href="#showtimes-section" className="bms-btn-book-big">
                Book Tickets
              </a>
              <button type="button" className="bms-btn-share">
                🔗 Share
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT THE MOVIE ===== */}
      <section className="bms-about-section">
        <div className="about-content">
          <h2>About the Movie</h2>
          <p className="movie-desc-full">{m.description}</p>
        </div>

        {/* Cast & Crew preview */}
        <div className="cast-crew-section">
          <h3>Cast & Crew</h3>
          <div className="cast-avatars-row">
            <div className="cast-member">
              <div className="avatar-circle">🎭</div>
              <strong>Lead Cast</strong>
              <span>Main Protagonist</span>
            </div>
            <div className="cast-member">
              <div className="avatar-circle">🎬</div>
              <strong>Director</strong>
              <span>Visionary Filmmaker</span>
            </div>
            <div className="cast-member">
              <div className="avatar-circle">🎵</div>
              <strong>Composer</strong>
              <span>Original Score</span>
            </div>
            <div className="cast-member">
              <div className="avatar-circle">🎥</div>
              <strong>Cinematography</strong>
              <span>Visual Design</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== THEATRES & SHOWTIMES SECTION ===== */}
      <section id="showtimes-section" className="bms-showtimes-section" aria-labelledby="showtimes-heading">
        <h2 id="showtimes-heading" className="sr-only">Theatres & Showtimes</h2>

        {/* Horizontal Date Picker */}
        <div className="bms-date-picker-bar">
          <div className="date-tabs-list" role="tablist">
            {dateTabs.map((dt) => (
              <button
                key={dt.offset}
                type="button"
                role="tab"
                aria-selected={dayOffset === dt.offset}
                className={`date-tab-btn ${dayOffset === dt.offset ? 'active' : ''}`}
                onClick={() => { setDayOffset(dt.offset); setPage(1); }}
              >
                <span className="tab-day">{dt.dayName}</span>
                <strong className="tab-num">{dt.dayNum}</strong>
                <span className="tab-month">{dt.month}</span>
              </button>
            ))}
          </div>

          <div className="format-filter-pills">
            {['ALL', '2D', '3D', 'IMAX'].map((fmt) => (
              <button
                key={fmt}
                type="button"
                className={`fmt-chip ${selectedFormat === fmt ? 'active' : ''}`}
                onClick={() => setSelectedFormat(fmt)}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Showtimes Legend */}
        <div className="bms-legend-bar">
          <span className="legend-item"><span className="legend-dot green"></span> Available</span>
          <span className="legend-item"><span className="legend-dot orange"></span> Fast Filling</span>
          <span className="legend-item"><span className="legend-dot red"></span> Almost Full</span>
          <span className="legend-item"><span className="legend-icon">🎟️</span> M-Ticket Available</span>
          <span className="legend-item"><span className="legend-icon">🍿</span> F&B Available</span>
        </div>

        <ErrorBox error={shows.error} />
        {shows.loading && <Loading label="Finding best cinema showtimes…" />}
        {shows.data && !groupedTheatres.length && (
          <Empty>
            No shows scheduled on {new Date(selectedIso).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })} for {selectedFormat} format.
          </Empty>
        )}

        {/* Theatres & Showtimes List */}
        <div className="bms-theatres-list">
          {groupedTheatres.map(({ theatre, shows: thShows }) => (
            <div key={theatre._id} className="bms-theatre-card">
              <div className="theatre-info-col">
                <div className="theatre-name-row">
                  <span className="theatre-heart" title="Favorite Theatre">♡</span>
                  <h3 className="theatre-name">{theatre.name}: {theatre.city}</h3>
                </div>
                <div className="theatre-badges">
                  <span className="th-badge mticket">🎟️ M-Ticket</span>
                  <span className="th-badge fnb">🍿 Food & Beverage</span>
                  <span className="th-badge sound">DOLBY 7.1</span>
                </div>
              </div>

              <div className="theatre-showtimes-col">
                {thShows.map((s) => {
                  const startTime = new Date(s.startsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                  const isLow = s.availableSeats > 0 && s.availableSeats < 15;
                  const isSoldOut = s.availableSeats === 0;

                  return (
                    <div key={s._id} className="showtime-pill-wrap">
                      <Link
                        to={`/shows/${s._id}`}
                        className={`showtime-pill ${isSoldOut ? 'soldout' : isLow ? 'low' : 'available'}`}
                        title={`Screen: ${s.screen.name} | ${s.format} | ${s.availableSeats} seats available`}
                      >
                        <span className="time-text">{startTime}</span>
                        <span className="format-text">{s.format}</span>
                        {isLow && <span className="low-sub">Filling fast</span>}
                      </Link>

                      {/* Tooltip on hover showing prices */}
                      <div className="showtime-price-tooltip">
                        <span className="tt-row">Screen: <strong>{s.screen.name}</strong></span>
                        <span className="tt-row">STANDARD: <strong>{money(s.prices?.STANDARD || 200)}</strong></span>
                        <span className="tt-row">PREMIUM: <strong>{money(s.prices?.PREMIUM || 320)}</strong></span>
                        {s.prices?.RECLINER && (
                          <span className="tt-row">RECLINER: <strong>{money(s.prices.RECLINER)}</strong></span>
                        )}
                        <span className="tt-seats">{s.availableSeats} seats left</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Pager meta={shows.data?.meta} onPage={setPage} />
      </section>

      {/* User Rating Modal */}
      {ratingModal && (
        <div className="rating-modal-overlay" onClick={() => setRatingModal(false)}>
          <div className="rating-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setRatingModal(false)}>✕</button>
            <h3>Rate {m.title}</h3>
            <p>How was your cinema experience?</p>
            <div className="rating-stars-row">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-select-btn ${userRating >= star ? 'active' : ''}`}
                  onClick={() => setUserRating(star)}
                >
                  ★ {star}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-submit-rating"
              onClick={() => setRatingModal(false)}
            >
              Submit Rating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
