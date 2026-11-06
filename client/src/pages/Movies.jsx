import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, money } from '../api.js';
import { useLoad } from '../hooks.js';
import { Empty, ErrorBox, Loading, Pager } from '../components.jsx';

const TRAILER_MAP = {
  'Wildwood': 'https://www.youtube-nocookie.com/embed/Way9Dexny3w',
  'Resident Evil': 'https://www.youtube-nocookie.com/embed/4q6UacoxL6A',
  'Hope': 'https://www.youtube-nocookie.com/embed/zSWdZVtXT7E',
  'A Story of Derry': 'https://www.youtube-nocookie.com/embed/fn3KqVaZwCU',
  'Cyber Samurai': 'https://www.youtube-nocookie.com/embed/8X2kIfS6fb8',
  'Midnight Express': 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  'Stellar Drift': 'https://www.youtube-nocookie.com/embed/zSWdZVtXT7E',
  'default': 'https://www.youtube-nocookie.com/embed/Way9Dexny3w',
};

function getTrailerFor(title = '') {
  for (const [k, v] of Object.entries(TRAILER_MAP)) {
    if (k !== 'default' && title.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return TRAILER_MAP.default;
}

export default function Movies({ currentCity, onOpenCityModal }) {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const [f, setF] = useState({ q: urlQuery, genre: '', language: '', format: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sortBy, setSortBy] = useState('now-showing');
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('movies');
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedCinema, setSelectedCinema] = useState('all');

  const [activeTrailer, setActiveTrailer] = useState(null);
  const trailerDialogRef = useRef(null);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Sync urlQuery if changed
  useEffect(() => {
    if (urlQuery !== f.q) {
      setF((prev) => ({ ...prev, q: urlQuery }));
    }
  }, [urlQuery]);

  const filters = useLoad(() => api('/movies/filters'), []);
  const liveEvents = useLoad(() => api('/bms/events', { query: { city: currentCity } }), [currentCity]);
  const liveOffers = useLoad(() => api('/bms/offers'), []);
  const theatresRes = useLoad(() => api('/theatres'), []);

  const theatresList = useMemo(() => {
    if (theatresRes.data && theatresRes.data.length > 0) return theatresRes.data;
    return [
      { _id: 't1', name: 'Starlight Cinemas', city: 'Jalandhar' },
      { _id: 't2', name: 'Grand Palace', city: 'Phagwara' },
      { _id: 't3', name: 'PVR INOX: Palladium', city: 'Mumbai' },
      { _id: 't4', name: 'Cinépolis VIP: Select Citywalk', city: 'Delhi-NCR' },
      { _id: 't5', name: 'Odeon Luxe: Leicester Square', city: 'London' },
    ];
  }, [theatresRes.data]);

  const { data, error, loading } = useLoad(
    () => api('/movies', { query: { q: f.q, genre: f.genre, language: f.language, page, limit: pageSize } }),
    [f.q, f.genre, f.language, page, pageSize]
  );

  const change = (k) => (e) => {
    setPage(1);
    setF((prev) => ({ ...prev, [k]: e.target.value }));
  };

  const handleTmdbSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await api('/tmdb/sync?limit=15', { method: 'POST' });
      setSyncMsg(res?.message || 'Updated live movies from TMDB!');
      setTimeout(() => {
        setSyncMsg('');
        window.location.reload();
      }, 1200);
    } catch (err) {
      setSyncMsg('Sync error: ' + (err.message || 'Failed to fetch from TMDB'));
    } finally {
      setSyncing(false);
    }
  };

  const openTrailer = (movie) => {
    const url = getTrailerFor(movie.title);
    setActiveTrailer({ title: movie.title, url });
    setTimeout(() => {
      if (trailerDialogRef.current && !trailerDialogRef.current.open) {
        trailerDialogRef.current.showModal();
      }
    }, 50);
  };

  const closeTrailer = () => {
    if (trailerDialogRef.current && trailerDialogRef.current.open) {
      trailerDialogRef.current.close();
    }
    setActiveTrailer(null);
  };

  // Sort movies client side
  const sortedMovies = useMemo(() => {
    if (!data?.data) return [];
    const list = [...data.data];
    if (sortBy === 'top-rated') {
      return list.sort((a, b) => (b.rating || '').localeCompare(a.rating || ''));
    }
    if (sortBy === 'duration') {
      return list.sort((a, b) => a.durationMins - b.durationMins);
    }
    if (sortBy === 'title') {
      return list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [data?.data, sortBy]);

  return (
    <div className="main-full">
      {/* =====================================================================
          HERO SECTION WITH LUXURY BRANDING & VECTOR FILM REELS
          ===================================================================== */}
      <section className="hero-section" aria-label="Hero Banner">
        <div className="hero-bg-glow" aria-hidden="true" />
        
        {/* Cinema Film Reel Vector Artwork */}
        <div className="hero-decorations" aria-hidden="true">
          <svg className="decor-reel left" width="220" height="220" viewBox="0 0 200 200" fill="currentColor">
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.3" />
            <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.4" />
            <circle cx="100" cy="45" r="14" fill="currentColor" opacity="0.35" />
            <circle cx="100" cy="155" r="14" fill="currentColor" opacity="0.35" />
            <circle cx="45" cy="100" r="14" fill="currentColor" opacity="0.35" />
            <circle cx="155" cy="100" r="14" fill="currentColor" opacity="0.35" />
          </svg>
          <svg className="decor-reel right" width="260" height="260" viewBox="0 0 200 200" fill="currentColor">
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.3" />
            <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.4" />
            <circle cx="100" cy="45" r="14" fill="currentColor" opacity="0.35" />
            <circle cx="100" cy="155" r="14" fill="currentColor" opacity="0.35" />
            <circle cx="45" cy="100" r="14" fill="currentColor" opacity="0.35" />
            <circle cx="155" cy="100" r="14" fill="currentColor" opacity="0.35" />
          </svg>
        </div>

        {/* Hero Title & Subtitle with Luxury Badges */}
        <div className="hero-content">
          <div className="hero-vip-badge">
            <span className="vip-crown">👑</span>
            <span>ULTRA LUXURY CINEMA DESTINATION</span>
          </div>

          <h1 className="hero-title">GET MOVIE TICKETS</h1>
          <p className="hero-subtitle">
            Buy movie tickets in advance, find movie times, watch 4K trailers, and reserve VIP recliners in luxury auditoriums.
          </p>

          <div className="hero-amenities-row">
            <span className="hero-amenity">🛋️ Full-Recline Loungers</span>
            <span className="hero-amenity">🍿 Gourmet Butler Dining</span>
            <span className="hero-amenity">🔊 Dolby Atmos 7.1</span>
            <span className="hero-amenity">🎟️ Instant QR Entry</span>
          </div>

          <div className="hero-action-buttons">
            <button
              type="button"
              className="btn-hero-trailer-play"
              onClick={() => openTrailer({ title: 'Feature Film Spotlight' })}
            >
              <span className="play-triangle">▶</span>
              <span>Watch 4K Trailer Reel</span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            FLOATING SEARCH CARD ("WHAT ARE YOU LOOKING FOR")
            =================================================================== */}
        <div className="search-card-wrapper">
          <div className="search-card">
            {/* Top row of card */}
            <div className="search-card-header">
              <div className="search-card-title-group">
                <span className="search-card-sub">WELCOME TO MOVTIC</span>
                <h2 className="search-card-main">WHAT ARE YOU LOOKING FOR</h2>
              </div>

              {/* Category tabs on right */}
              <div className="search-category-tabs" role="tablist" aria-label="Entertainment Types">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'movies'}
                  className={`cat-tab ${activeTab === 'movies' ? 'active' : ''}`}
                  onClick={() => setActiveTab('movies')}
                >
                  <span className="cat-icon" aria-hidden="true">🍿</span>
                  <span>MOVIES</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'events'}
                  className={`cat-tab ${activeTab === 'events' ? 'active' : ''}`}
                  onClick={() => setActiveTab('events')}
                >
                  <span className="cat-icon" aria-hidden="true">🎟️</span>
                  <span>EVENTS</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'sports'}
                  className={`cat-tab ${activeTab === 'sports' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sports')}
                >
                  <span className="cat-icon" aria-hidden="true">⚽</span>
                  <span>SPORTS</span>
                </button>
              </div>
            </div>

            {/* 4-Segment Unified Search & Filter Bar */}
            <div className="search-bar-unified">
              {/* 1. Search for Movies */}
              <div className="search-field query-field">
                <span className="field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="text"
                  className="search-input"
                  placeholder={activeTab === 'events' ? 'Search for Live Events, Concerts' : activeTab === 'sports' ? 'Search for Sports Matches' : 'Search for Movies'}
                  value={f.q}
                  onChange={change('q')}
                  aria-label="Search entertainment"
                />
              </div>

              <div className="field-divider" aria-hidden="true" />

              {/* 2. City Selector */}
              <div
                className="search-field select-field"
                onClick={onOpenCityModal}
                style={{ cursor: 'pointer' }}
                title="Click to change city"
              >
                <span className="field-icon" aria-hidden="true">📍</span>
                <div className="select-inner">
                  <span className="field-label">City</span>
                  <span className="search-select" style={{ display: 'flex', alignItems: 'center' }}>
                    {currentCity}
                  </span>
                </div>
              </div>

              <div className="field-divider" aria-hidden="true" />

              {/* 3. Date Selector */}
              <div className="search-field select-field">
                <span className="field-icon" aria-hidden="true">📅</span>
                <div className="select-inner">
                  <span className="field-label">Date</span>
                  <select
                    className="search-select"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    aria-label="Filter by date"
                  >
                    <option value="today">Today, 07 Nov</option>
                    <option value="tomorrow">Tomorrow, 08 Nov</option>
                    <option value="weekend">Weekend, 09 Nov</option>
                    <option value="all">Any Date</option>
                  </select>
                </div>
              </div>

              <div className="field-divider" aria-hidden="true" />

              {/* 4. Cinema Selector */}
              <div className="search-field select-field">
                <span className="field-icon" aria-hidden="true">🎥</span>
                <div className="select-inner">
                  <span className="field-label">Cinema</span>
                  <select
                    className="search-select"
                    value={selectedCinema}
                    onChange={(e) => setSelectedCinema(e.target.value)}
                    aria-label="Filter by cinema"
                  >
                    <option value="all">All Theatres</option>
                    {theatresList.map((th) => (
                      <option key={th._id || th.name} value={th.name}>
                        {th.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CATALOG SECTION WITH TOOLBAR
          ===================================================================== */}
      <section className="catalog-section" aria-labelledby="catalog-heading">
        {/* Toolbar matching screenshot: Genre filters on left, controls on right */}
        <div className="catalog-toolbar">
          <div className="toolbar-left">
            <div className="genre-pills">
              <button
                type="button"
                className={`genre-pill ${!f.genre ? 'active' : ''}`}
                onClick={() => { setPage(1); setF((p) => ({ ...p, genre: '' })); }}
              >
                All Genres
              </button>
              {(filters.data?.genres || []).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`genre-pill ${f.genre === g ? 'active' : ''}`}
                  onClick={() => { setPage(1); setF((p) => ({ ...p, genre: g })); }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="toolbar-right">
            {/* TMDB Live Indicator */}
            <div className="tmdb-live-badge" title="Real-time live synchronization with TMDB">
              <span className="tmdb-live-dot" aria-hidden="true" />
              <span>TMDB Live Feed</span>
            </div>

            <button
              type="button"
              className="btn-tmdb-sync"
              onClick={handleTmdbSync}
              disabled={syncing}
            >
              🔄 {syncing ? 'Syncing...' : 'Sync Live Movies'}
            </button>

            {/* Show Count Dropdown */}
            <div className="toolbar-control">
              <label htmlFor="select-show-count" className="control-label">Show:</label>
              <select
                id="select-show-count"
                value={pageSize}
                onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
                className="select-mini"
                aria-label="Movies per page"
              >
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={16}>16</option>
                <option value={24}>24</option>
              </select>
            </div>

            {/* Sort by Dropdown */}
            <div className="toolbar-control">
              <label htmlFor="select-sort-by" className="control-label">Sort by:</label>
              <select
                id="select-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select-mini"
                aria-label="Sort movies"
              >
                <option value="now-showing">Now Showing</option>
                <option value="top-rated">Top Rated</option>
                <option value="duration">Shortest Duration</option>
                <option value="title">Alphabetical (A-Z)</option>
              </select>
            </div>

            {/* View Mode Toggle: Grid [ ⊞ ] vs List [ ☰ ] */}
            <div className="view-mode-toggle" role="group" aria-label="Catalog view style">
              <button
                type="button"
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
                aria-pressed={viewMode === 'grid'}
              >
                ⊞
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
                aria-pressed={viewMode === 'list'}
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Sync alert & states */}
        {syncMsg && <p className="alert success">{syncMsg}</p>}
        <ErrorBox error={error} />
        {loading && <Loading label="Loading movies in your city..." />}

        {/* Active tab content: MOVIES */}
        {activeTab === 'movies' && (
          <>
            {data && !sortedMovies.length && (
              <Empty>No movies found matching your filters. Try selecting &quot;All Genres&quot; or clearing your search.</Empty>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
              <ul className="movtic-grid">
                {sortedMovies.map((m) => (
                  <li key={m._id} className="movtic-card">
                    <Link to={`/movies/${m._id}`} className="card-poster-wrap">
                      {m.posterUrl ? (
                        <img src={m.posterUrl} alt={`${m.title} poster`} className="card-poster-img" loading="lazy" />
                      ) : (
                        <div className="card-poster-fallback">
                          <span className="fallback-symbol">🎬</span>
                          <strong className="fallback-title">{m.title}</strong>
                        </div>
                      )}

                      {/* BookMyShow Rating Strip */}
                      <div className="bms-rating-strip">
                        <span className="bms-rating-star">★</span>
                        <strong className="bms-rating-num">{m.rating || '8.8/10'}</strong>
                        <span className="bms-vote-count">42.8K Votes</span>
                      </div>

                      {/* Badges on Poster */}
                      <div className="poster-badges">
                        <span className="badge-rating">{m.rating || 'U/A'}</span>
                        <span className="badge-format">{m.formats?.[0] || '2D'}</span>
                      </div>
                    </Link>

                    <div className="card-body">
                      <div className="card-occupancy-pill">
                        <span className="occ-dot" />
                        <span>⚡ 85% Seats Filled</span>
                      </div>

                      <h3 className="card-title">
                        <Link to={`/movies/${m._id}`}>{m.title}</Link>
                      </h3>
                      <div className="card-meta">
                        <span>{m.language}</span>
                        <span className="meta-bullet">•</span>
                        <span>{m.durationMins} mins</span>
                        <span className="meta-bullet">•</span>
                        <span>{m.genres?.slice(0, 2).join(', ')}</span>
                      </div>

                      <div className="card-footer">
                        <div className="price-tag-wrap">
                          <span className="price-sub">Tickets</span>
                          <span className="card-price">From ₹180</span>
                        </div>
                        <div className="card-btn-group">
                          <button
                            type="button"
                            className="btn-card-trailer"
                            onClick={() => openTrailer(m)}
                            title={`Watch 4K Trailer for ${m.title}`}
                          >
                            ▶ Trailer
                          </button>
                          <Link to={`/movies/${m._id}`} className="btn-book-ticket">
                            Select Seats →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
              <ul className="movtic-list">
                {sortedMovies.map((m) => (
                  <li key={m._id} className="movtic-list-item">
                    <Link to={`/movies/${m._id}`} className="list-poster-wrap">
                      {m.posterUrl ? (
                        <img src={m.posterUrl} alt={`${m.title} poster`} className="list-poster-img" loading="lazy" />
                      ) : (
                        <div className="card-poster-fallback">🎬</div>
                      )}
                    </Link>

                    <div className="list-content">
                      <div className="list-header">
                        <h3 className="list-title">
                          <Link to={`/movies/${m._id}`}>{m.title}</Link>
                        </h3>
                        <div className="list-badges">
                          <span className="badge-rating">★ {m.rating || '8.8/10'}</span>
                          <span className="badge-format">{m.formats?.join(', ') || '2D'}</span>
                        </div>
                      </div>

                      <div className="list-meta">
                        <span>{m.language}</span>
                        <span className="meta-bullet">•</span>
                        <span>{m.durationMins} mins</span>
                        <span className="meta-bullet">•</span>
                        <span>{m.genres?.join(', ')}</span>
                      </div>

                      <p className="list-desc">{m.description}</p>
                    </div>

                    <div className="list-action">
                      <span className="card-price">From ₹180</span>
                      <div className="list-btn-group">
                        <button
                          type="button"
                          className="btn-card-trailer"
                          onClick={() => openTrailer(m)}
                        >
                          ▶ Trailer
                        </button>
                        <Link to={`/movies/${m._id}`} className="btn-book-ticket">
                          Select Seats →
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Pager meta={data?.meta} onPage={setPage} />
          </>
        )}

        {/* Active tab content: EVENTS */}
        {activeTab === 'events' && (
          <div className="tab-pane-events">
            <div className="bms-events-grid-preview" style={{ marginTop: '1.5rem' }}>
              {(liveEvents.data?.events || []).map((evt) => (
                <div key={evt.id} className="bms-event-card-preview">
                  <div className="evt-preview-poster">
                    <img src={evt.poster} alt={evt.title} loading="lazy" />
                    <span className="evt-type-badge">{evt.type}</span>
                  </div>
                  <div className="evt-preview-info">
                    <h4 className="evt-preview-title">{evt.title}</h4>
                    <p className="evt-preview-venue">📍 {evt.venue}</p>
                    <div className="evt-preview-bottom">
                      <span>From <strong>{money(evt.priceFrom)}</strong></span>
                      <Link to="/events" className="btn-book-ticket">Select Tickets →</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active tab content: SPORTS */}
        {activeTab === 'sports' && (
          <div className="tab-pane-sports">
            <div className="bms-events-grid-preview" style={{ marginTop: '1.5rem' }}>
              {(liveEvents.data?.events || []).filter((e) => e.category === 'Sports' || e.type.includes('Cricket') || e.type.includes('Football')).map((evt) => (
                <div key={evt.id} className="bms-event-card-preview">
                  <div className="evt-preview-poster">
                    <img src={evt.poster} alt={evt.title} loading="lazy" />
                    <span className="evt-type-badge">{evt.type}</span>
                  </div>
                  <div className="evt-preview-info">
                    <h4 className="evt-preview-title">{evt.title}</h4>
                    <p className="evt-preview-venue">📍 {evt.venue}</p>
                    <div className="evt-preview-bottom">
                      <span>From <strong>{money(evt.priceFrom)}</strong></span>
                      <Link to="/sports" className="btn-book-ticket">Select Tickets →</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          BOOKMYSHOW SIGNATURE EXPERIENCES: STREAM, EVENTS, OFFERS
          ===================================================================== */}
      {/* 1. Live Events Showcase */}
      <section className="bms-section-container bms-events-highlight" aria-labelledby="live-events-heading">
        <div className="bms-section-header">
          <div>
            <span className="bms-tag-section">Live Experiences</span>
            <h2 id="live-events-heading" className="bms-section-title">The Best Of Live Events</h2>
            <p className="bms-section-subtitle">Music festivals, comedy specials, and cricket fan screenings</p>
          </div>
          <Link to="/events" className="bms-link-see-all">See All ›</Link>
        </div>

        <div className="bms-events-grid-preview">
          {(liveEvents.data?.events || []).slice(0, 4).map((evt) => (
            <div key={evt.id} className="bms-event-card-preview">
              <div className="evt-preview-poster">
                <img src={evt.poster} alt={evt.title} loading="lazy" />
                <span className="evt-type-badge">{evt.type}</span>
              </div>
              <div className="evt-preview-info">
                <h4 className="evt-preview-title">{evt.title}</h4>
                <p className="evt-preview-venue">📍 {evt.venue}</p>
                <div className="evt-preview-bottom">
                  <span>From <strong>{money(evt.priceFrom)}</strong></span>
                  <Link to="/events" className="bms-btn-book-sm">Select Tickets</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Stream Showcase */}
      <section className="bms-stream-strip">
        <div className="stream-strip-content">
          <div className="stream-strip-left">
            <span className="crown-badge">👑 CLICKSHOW STREAM</span>
            <h3>Handpicked Cinema. Delivered Fresh Every Week.</h3>
            <p>Rent or buy digital premiere releases in 4K UHD. No monthly subscription required.</p>
            <Link to="/stream" className="bms-btn-explore-stream">Explore Stream Releases</Link>
          </div>
          <div className="stream-strip-right">
            <div className="stream-poster-stack">
              <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80" alt="Stream premiere 1" />
              <img src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80" alt="Stream premiere 2" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Offers & Promotions Strip */}
      <section className="bms-section-container" aria-labelledby="offers-heading" id="contact-footer">
        <div className="bms-section-header">
          <div>
            <h2 id="offers-heading" className="bms-section-title">Exclusive Bank & Promo Offers</h2>
            <p className="bms-section-subtitle">Save up to 50% with credit cards, BOGO passes, and cashback codes</p>
          </div>
          <Link to="/offers" className="bms-link-see-all">View All Offers ›</Link>
        </div>

        <div className="bms-offers-row">
          {(liveOffers.data?.offers || []).slice(0, 3).map((offer) => (
            <div key={offer.code} className="bms-mini-offer-card">
              <span className="offer-bank-tag">{offer.bank}</span>
              <h4>{offer.title}</h4>
              <p>{offer.description}</p>
              <div className="mini-offer-bottom">
                <span className="offer-code-pill">CODE: {offer.code}</span>
                <Link to="/offers" className="offer-apply-link">Details →</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          NATIVE 4K OFFICIAL TRAILER MODAL DIALOG
          ===================================================================== */}
      <dialog
        ref={trailerDialogRef}
        className="bms-trailer-dialog"
        aria-labelledby="trailer-dialog-title"
        onClose={closeTrailer}
      >
        <div className="trailer-dialog-inner">
          <div className="trailer-dialog-top">
            <h3 id="trailer-dialog-title" className="trailer-title-heading">
              🎬 {activeTrailer?.title || 'Official Trailer'} — 4K UHD Preview
            </h3>
            <button
              type="button"
              className="btn-close-trailer"
              onClick={closeTrailer}
              aria-label="Close trailer dialog"
            >
              ✕
            </button>
          </div>
          <div className="trailer-iframe-box">
            {activeTrailer && (
              <iframe
                src={`${activeTrailer.url}?autoplay=1&rel=0&modestbranding=1`}
                title={`${activeTrailer.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="trailer-iframe"
              />
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
