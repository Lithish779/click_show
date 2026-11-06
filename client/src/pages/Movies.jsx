import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad } from '../hooks.js';
import { Empty, ErrorBox, Loading, Pager } from '../components.jsx';

const POSTER_FALLBACKS = {
  'Cyber Samurai': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
  'Stellar Drift': 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80',
  'Midnight Express': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
  'The Last Monsoon': 'https://images.unsplash.com/photo-1514632595-4944383f2737?auto=format&fit=crop&w=600&q=80',
  'Garden of Echoes': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
  'Laughter Lane': 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=600&q=80',
};

export default function Movies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'movies';

  const [f, setF] = useState({ q: '', genre: '', language: '', city: '', theatre: '', date: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sortBy, setSortBy] = useState('now-showing');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const filters = useLoad(() => api('/movies/filters'), []);
  const theatres = useLoad(() => api('/theatres'), []);

  // Filter distinct cities from theatres
  const cities = useMemo(() => {
    if (!theatres.data) return [];
    return [...new Set(theatres.data.map((t) => t.city))].sort();
  }, [theatres.data]);

  // Filter theatres for chosen city
  const filteredTheatres = useMemo(() => {
    if (!theatres.data) return [];
    if (!f.city) return theatres.data;
    return theatres.data.filter((t) => t.city === f.city);
  }, [theatres.data, f.city]);

  const { data, error, loading } = useLoad(
    () => api('/movies', { query: { q: f.q, genre: f.genre, language: f.language, page, limit: pageSize } }),
    [f.q, f.genre, f.language, page, pageSize]
  );

  const change = (k) => (e) => {
    setPage(1);
    setF((prev) => ({ ...prev, [k]: e.target.value }));
  };

  const handleTabChange = (tab) => {
    setSearchParams(tab === 'movies' ? {} : { tab });
  };

  const handleTmdbSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await api('/tmdb/sync?limit=15', { method: 'POST' });
      setSyncMessage(res?.message || 'Successfully updated live movies from TMDB!');
      setTimeout(() => {
        setSyncMessage('');
        window.location.reload();
      }, 1200);
    } catch (err) {
      setSyncMessage('Sync failed: ' + (err.message || 'Error connecting to TMDB'));
    } finally {
      setSyncing(false);
    }
  };

  // Sort movies client-side according to selection
  const sortedMovies = useMemo(() => {
    if (!data?.data) return [];
    const list = [...data.data];
    if (sortBy === 'top-rated') {
      return list.sort((a, b) => (b.rating || '').localeCompare(a.rating || ''));
    }
    if (sortBy === 'duration-asc') {
      return list.sort((a, b) => a.durationMins - b.durationMins);
    }
    if (sortBy === 'duration-desc') {
      return list.sort((a, b) => b.durationMins - a.durationMins);
    }
    if (sortBy === 'title-asc') {
      return list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [data?.data, sortBy]);

  return (
    <div className="home-container">
      {/* ===== HERO SECTION ===== */}
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-bg-glow" aria-hidden="true"></div>
        <div className="hero-decorations" aria-hidden="true">
          {/* Film reel & strip subtle graphic decorations */}
          <div className="decor-reel left">
            <svg viewBox="0 0 200 200" width="220" height="220" fill="currentColor">
              <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray="8 6" opacity="0.18" />
              <circle cx="100" cy="100" r="45" fill="none" stroke="currentColor" strokeWidth="8" opacity="0.25" />
              <circle cx="100" cy="100" r="18" fill="currentColor" opacity="0.3" />
              <circle cx="100" cy="35" r="14" fill="currentColor" opacity="0.18" />
              <circle cx="100" cy="165" r="14" fill="currentColor" opacity="0.18" />
              <circle cx="35" cy="100" r="14" fill="currentColor" opacity="0.18" />
              <circle cx="165" cy="100" r="14" fill="currentColor" opacity="0.18" />
            </svg>
          </div>
          <div className="decor-reel right">
            <svg viewBox="0 0 240 160" width="260" height="180" fill="currentColor">
              <rect x="20" y="20" width="200" height="120" rx="16" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="12 8" opacity="0.16" />
              <line x1="80" y1="20" x2="80" y2="140" stroke="currentColor" strokeWidth="3" opacity="0.14" strokeDasharray="4 4" />
              <circle cx="140" cy="80" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.22" />
            </svg>
          </div>
        </div>

        <div className="hero-content">
          <h1 id="hero-title" className="hero-title">GET MOVIE TICKETS</h1>
          <p className="hero-subtitle">
            Buy movie tickets in advance, find movie times watch trailers, read movie reviews and much more
          </p>
        </div>

        {/* ===== WHAT ARE YOU LOOKING FOR (SEARCH CARD) ===== */}
        <div className="search-card-wrapper">
          <div className="search-card">
            {/* Card Header with Welcome & Category Tabs */}
            <div className="search-card-header">
              <div className="search-card-title-group">
                <span className="search-card-sub">WELCOME TO MOVTIC</span>
                <h2 className="search-card-main">WHAT ARE YOU LOOKING FOR</h2>
              </div>

              <div className="search-category-tabs" role="tablist" aria-label="Entertainment categories">
                <button
                  type="button"
                  role="tab"
                  aria-selected={currentTab === 'movies'}
                  className={`cat-tab ${currentTab === 'movies' ? 'active' : ''}`}
                  onClick={() => handleTabChange('movies')}
                >
                  <span className="cat-icon" aria-hidden="true">🎟️</span>
                  <span>MOVIES</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={currentTab === 'events'}
                  className={`cat-tab ${currentTab === 'events' ? 'active' : ''}`}
                  onClick={() => handleTabChange('events')}
                >
                  <span className="cat-icon" aria-hidden="true">🎪</span>
                  <span>EVENTS</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={currentTab === 'sports'}
                  className={`cat-tab ${currentTab === 'sports' ? 'active' : ''}`}
                  onClick={() => handleTabChange('sports')}
                >
                  <span className="cat-icon" aria-hidden="true">⚽</span>
                  <span>SPORTS</span>
                </button>
              </div>
            </div>

            {/* Inset Search and Unified Filter Bar */}
            <form className="search-bar-unified" role="search" onSubmit={(e) => e.preventDefault()}>
              {/* Field 1: Search Query */}
              <div className="search-field query-field">
                <span className="field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="search"
                  aria-label="Search for Movies"
                  placeholder="Search for Movies"
                  value={f.q}
                  onChange={change('q')}
                  className="search-input"
                />
              </div>

              <div className="field-divider" aria-hidden="true"></div>

              {/* Field 2: City */}
              <div className="search-field select-field">
                <span className="field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>
                <div className="select-inner">
                  <span className="field-label">City</span>
                  <select aria-label="Select City" value={f.city} onChange={change('city')} className="search-select">
                    <option value="">All Cities</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field-divider" aria-hidden="true"></div>

              {/* Field 3: Date */}
              <div className="search-field select-field">
                <span className="field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </span>
                <div className="select-inner">
                  <span className="field-label">Date</span>
                  <select aria-label="Select Date" value={f.date} onChange={change('date')} className="search-select">
                    <option value="">Any Date</option>
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="weekend">This Weekend</option>
                  </select>
                </div>
              </div>

              <div className="field-divider" aria-hidden="true"></div>

              {/* Field 4: Cinema */}
              <div className="search-field select-field">
                <span className="field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="3"></rect>
                    <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"></path>
                  </svg>
                </span>
                <div className="select-inner">
                  <span className="field-label">Cinema</span>
                  <select aria-label="Select Cinema" value={f.theatre} onChange={change('theatre')} className="search-select">
                    <option value="">All Cinemas</option>
                    {filteredTheatres.map((t) => (
                      <option key={t._id} value={t._id}>{t.name} ({t.city})</option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ===== UPCOMING BANNER FOR EVENTS / SPORTS TAB ===== */}
      {currentTab !== 'movies' && (
        <div className="special-notice-banner" role="region" aria-label="Category Notice">
          <div className="special-notice-content">
            <span className="notice-badge">Coming Soon</span>
            <strong>{currentTab.toUpperCase()} Booking:</strong> Exciting live {currentTab} events are joining CineBook shortly. Meanwhile, check out today's blockbuster films below!
          </div>
          <button type="button" className="notice-close" onClick={() => handleTabChange('movies')}>View Movies</button>
        </div>
      )}

      {/* ===== MOVIES CATALOG SECTION ===== */}
      <section className="catalog-section" aria-labelledby="catalog-heading">
        <h2 id="catalog-heading" className="sr-only">Now Showing Movies</h2>

        {/* Filter and View Controls Bar */}
        <div className="catalog-toolbar">
          <div className="toolbar-left">
            {/* Quick Genre Pills */}
            <div className="genre-pills" role="radiogroup" aria-label="Genre Filter">
              <button
                type="button"
                className={`genre-pill ${!f.genre ? 'active' : ''}`}
                onClick={() => { setPage(1); setF((prev) => ({ ...prev, genre: '' })); }}
              >
                All
              </button>
              {filters.data?.genres.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`genre-pill ${f.genre === g ? 'active' : ''}`}
                  onClick={() => { setPage(1); setF((prev) => ({ ...prev, genre: g })); }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="toolbar-right">
            {/* Live TMDB Status & Sync */}
            <div className="tmdb-live-badge" title="Connected to The Movie Database API">
              <span className="tmdb-live-dot" aria-hidden="true"></span>
              <span>TMDB Live</span>
            </div>
            <button
              type="button"
              className="btn-tmdb-sync"
              onClick={handleTmdbSync}
              disabled={syncing}
              title="Fetch latest now-playing movies from TMDB"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              <span>{syncing ? 'Syncing…' : 'Sync TMDB'}</span>
            </button>

            {/* Show Count */}
            <div className="toolbar-control">
              <span className="control-label">Show:</span>
              <select
                aria-label="Items per page"
                value={pageSize}
                onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
                className="select-mini"
              >
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={16}>16</option>
              </select>
            </div>

            {/* Sort by */}
            <div className="toolbar-control">
              <span className="control-label">Sort by:</span>
              <select
                aria-label="Sort movies by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select-mini"
              >
                <option value="now-showing">Now Showing</option>
                <option value="top-rated">Top Rated</option>
                <option value="duration-asc">Duration (Shortest)</option>
                <option value="duration-desc">Duration (Longest)</option>
                <option value="title-asc">Title (A to Z)</option>
              </select>
            </div>

            {/* Grid / List View Switcher */}
            <div className="view-mode-toggle" role="group" aria-label="View Mode">
              <button
                type="button"
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid View"
                title="Grid View"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                  <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                  <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
                  <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
                </svg>
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="List View"
                title="List View"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"></line>
                  <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"></line>
                  <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {syncMessage && <p className="alert success" role="status">{syncMessage}</p>}
        <ErrorBox error={error} />
        {loading && <Loading label="Loading movies…" />}
        {data && !sortedMovies.length && <Empty>No movies match your search filters.</Empty>}

        {/* ===== MOVIE CARDS (GRID OR LIST) ===== */}
        {viewMode === 'grid' ? (
          <ul className="movtic-grid">
            {sortedMovies.map((m) => {
              const poster = m.posterUrl || POSTER_FALLBACKS[m.title];
              return (
                <li key={m._id} className="movtic-card">
                  <div className="card-poster-wrap">
                    {poster ? (
                      <img
                        src={poster}
                        alt={`${m.title} poster`}
                        className="card-poster-img"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="card-poster-fallback" style={{ display: poster ? 'none' : 'flex' }}>
                      <span className="fallback-symbol">🎬</span>
                      <span className="fallback-title">{m.title}</span>
                    </div>

                    {/* Format and Rating Badges */}
                    <div className="poster-badges">
                      <span className="badge-rating">{m.rating || 'U/A'}</span>
                      <span className="badge-format">{m.formats?.join(' · ') || '2D'}</span>
                    </div>
                  </div>

                  <div className="card-body">
                    <h3 className="card-title">
                      <Link to={`/movies/${m._id}`}>{m.title}</Link>
                    </h3>
                    <p className="card-meta">
                      <span>{m.genres?.join(', ')}</span>
                      <span className="meta-bullet">·</span>
                      <span>{m.language}</span>
                      <span className="meta-bullet">·</span>
                      <span>{m.durationMins}m</span>
                    </p>

                    <div className="card-footer">
                      <span className="card-price">From ₹180</span>
                      <Link to={`/movies/${m._id}`} className="btn-book-ticket">
                        <span>Book Ticket</span>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="movtic-list">
            {sortedMovies.map((m) => {
              const poster = m.posterUrl || POSTER_FALLBACKS[m.title];
              return (
                <li key={m._id} className="movtic-list-item">
                  <div className="list-poster-wrap">
                    {poster ? (
                      <img
                        src={poster}
                        alt={`${m.title} poster`}
                        className="list-poster-img"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="card-poster-fallback list-mode" style={{ display: poster ? 'none' : 'flex' }}>
                      <span>🎬</span>
                    </div>
                  </div>

                  <div className="list-content">
                    <div className="list-header">
                      <h3 className="list-title">
                        <Link to={`/movies/${m._id}`}>{m.title}</Link>
                      </h3>
                      <div className="list-badges">
                        <span className="badge-rating">{m.rating || 'U/A'}</span>
                        <span className="badge-format">{m.formats?.join(' · ') || '2D'}</span>
                      </div>
                    </div>

                    <p className="list-meta">
                      <strong>{m.language}</strong> · {m.genres?.join(', ')} · {m.durationMins} mins
                    </p>
                    <p className="list-desc">{m.description}</p>
                  </div>

                  <div className="list-action">
                    <span className="card-price">Starting ₹180</span>
                    <Link to={`/movies/${m._id}`} className="btn-book-ticket">
                      <span>Select Seats</span>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Pager meta={data?.meta} onPage={setPage} />
      </section>
    </div>
  );
}
