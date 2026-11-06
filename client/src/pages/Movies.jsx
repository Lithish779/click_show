import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, money } from '../api.js';
import { useLoad } from '../hooks.js';
import { Empty, ErrorBox, Loading, Pager } from '../components.jsx';

// Hero promotional carousel slides
const PROMO_SLIDES = [
  {
    id: 'promo-1',
    title: 'Wildwood: The Enchanted Realm',
    tagline: 'An Epic Fantasy Adventure Beyond Imagination',
    certification: 'U/A',
    formats: 'IMAX 3D · 4DX · 2D',
    rating: '★ 8.8/10',
    votes: '48.2K Votes',
    languages: 'English, Hindi, Tamil',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    badge: 'Trending #1 in Cinemas',
  },
  {
    id: 'promo-2',
    title: 'Resident Evil: The Beginning',
    tagline: 'Experience The Terror In Dolby Atmos Sound',
    certification: 'A',
    formats: '2D · 3D · 4DX',
    rating: '★ 7.8/10',
    votes: '62.4K Votes',
    languages: 'English, Hindi',
    backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    badge: 'Blockbuster Weekend',
  },
  {
    id: 'promo-3',
    title: 'Hope: The Cosmic Voyage',
    tagline: 'A Thrilling Sci-Fi Mystery That Redefines Space Cinema',
    certification: 'U/A',
    formats: 'IMAX · 2D',
    rating: '★ 8.4/10',
    votes: '31.9K Votes',
    languages: 'English',
    backdrop: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    badge: 'Critics Choice Award',
  },
];

export default function Movies({ currentCity, onOpenCityModal }) {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const [f, setF] = useState({ q: urlQuery, genre: '', language: '', format: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sortBy, setSortBy] = useState('now-showing');
  const [activeSlide, setActiveSlide] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Auto carousel rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  // Sync urlQuery if changed
  useEffect(() => {
    if (urlQuery !== f.q) {
      setF((prev) => ({ ...prev, q: urlQuery }));
    }
  }, [urlQuery]);

  const filters = useLoad(() => api('/movies/filters'), []);
  const liveEvents = useLoad(() => api('/bms/events', { query: { city: currentCity } }), [currentCity]);
  const liveOffers = useLoad(() => api('/bms/offers'), []);

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

  const currentSlide = PROMO_SLIDES[activeSlide];

  return (
    <div className="bms-home-wrap">
      {/* ===== HERO CAROUSEL BANNER ===== */}
      <section className="bms-hero-carousel" aria-label="Featured Releases">
        <div
          className="bms-carousel-slide"
          style={{ backgroundImage: `linear-gradient(to right, rgba(10, 14, 30, 0.95) 20%, rgba(10, 14, 30, 0.4) 60%, rgba(10, 14, 30, 0.85) 100%), url(${currentSlide.backdrop})` }}
        >
          <div className="carousel-slide-content">
            <span className="carousel-badge">{currentSlide.badge}</span>
            <h1 className="carousel-title">{currentSlide.title}</h1>
            <p className="carousel-tagline">{currentSlide.tagline}</p>

            <div className="carousel-meta-row">
              <span className="bms-meta-rating">{currentSlide.rating} <small>({currentSlide.votes})</small></span>
              <span className="bms-meta-badge">{currentSlide.certification}</span>
              <span className="bms-meta-formats">{currentSlide.formats}</span>
              <span className="bms-meta-langs">{currentSlide.languages}</span>
            </div>

            <div className="carousel-cta-row">
              <a href="#recommended-movies" className="bms-btn-book-hero">
                Book Tickets
              </a>
              <button type="button" className="bms-btn-trailer">
                ▶ Watch Trailer
              </button>
            </div>
          </div>

          {/* Carousel Arrows */}
          <button
            type="button"
            className="carousel-nav-btn prev"
            onClick={() => setActiveSlide((prev) => (prev === 0 ? PROMO_SLIDES.length - 1 : prev - 1))}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            type="button"
            className="carousel-nav-btn next"
            onClick={() => setActiveSlide((prev) => (prev + 1) % PROMO_SLIDES.length)}
            aria-label="Next slide"
          >
            ›
          </button>

          {/* Indicators */}
          <div className="carousel-indicators">
            {PROMO_SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                className={`indicator-dot ${activeSlide === idx ? 'active' : ''}`}
                onClick={() => setActiveSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ===== RECOMMENDED MOVIES / NOW SHOWING SECTION ===== */}
      <section id="recommended-movies" className="bms-section-container" aria-labelledby="rec-movies-heading">
        <div className="bms-section-header">
          <div>
            <h2 id="rec-movies-heading" className="bms-section-title">
              Recommended Movies in {currentCity}
            </h2>
            <p className="bms-section-subtitle">
              Book tickets with real-time seat availability across all theatres in {currentCity}
            </p>
          </div>

          <div className="bms-section-actions">
            <div className="tmdb-live-indicator" title="Connected to live The Movie Database API">
              <span className="pulse-dot" aria-hidden="true"></span>
              <span>TMDB Live Feed</span>
            </div>
            <button
              type="button"
              className="btn-sync-tmdb-bms"
              onClick={handleTmdbSync}
              disabled={syncing}
            >
              🔄 {syncing ? 'Syncing...' : 'Sync Live Movies'}
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bms-filters-bar">
          <div className="bms-genre-scroll">
            <button
              type="button"
              className={`bms-chip ${!f.genre ? 'active' : ''}`}
              onClick={() => { setPage(1); setF((prev) => ({ ...prev, genre: '' })); }}
            >
              All Genres
            </button>
            {filters.data?.genres.map((g) => (
              <button
                key={g}
                type="button"
                className={`bms-chip ${f.genre === g ? 'active' : ''}`}
                onClick={() => { setPage(1); setF((prev) => ({ ...prev, genre: g })); }}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="bms-filter-controls">
            {/* Language filter */}
            <select
              value={f.language}
              onChange={change('language')}
              className="bms-select-ctrl"
              aria-label="Filter by language"
            >
              <option value="">All Languages</option>
              {filters.data?.languages.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            {/* Sort filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bms-select-ctrl"
              aria-label="Sort movies"
            >
              <option value="now-showing">Now Showing</option>
              <option value="top-rated">Highest Rated</option>
              <option value="duration">Shortest Duration</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {syncMsg && <p className="alert success">{syncMsg}</p>}
        <ErrorBox error={error} />
        {loading && <Loading label="Loading movies in your city..." />}
        {data && !sortedMovies.length && (
          <Empty>No movies matching your criteria. Try changing genre, language, or search query.</Empty>
        )}

        {/* Movies Grid */}
        <div className="bms-movie-grid">
          {sortedMovies.map((m) => (
            <div key={m._id} className="bms-movie-card">
              <Link to={`/movies/${m._id}`} className="bms-card-poster-link">
                <div className="bms-poster-container">
                  {m.posterUrl ? (
                    <img src={m.posterUrl} alt={`${m.title} poster`} className="bms-poster-img" loading="lazy" />
                  ) : (
                    <div className="bms-poster-placeholder">
                      <span>🎬</span>
                      <strong>{m.title}</strong>
                    </div>
                  )}

                  {/* BMS Signature Rating Strip */}
                  <div className="bms-rating-strip">
                    <span className="bms-rating-star">★</span>
                    <strong className="bms-rating-num">{m.rating || '8.4/10'}</strong>
                    <span className="bms-vote-count">38.4K Votes</span>
                  </div>

                  {/* Format Badges */}
                  <div className="bms-format-badges">
                    <span className="format-badge">{m.formats?.join(', ') || '2D'}</span>
                  </div>
                </div>
              </Link>

              <div className="bms-movie-info">
                <h3 className="bms-movie-title">
                  <Link to={`/movies/${m._id}`}>{m.title}</Link>
                </h3>
                <p className="bms-movie-sub">{m.rating || 'U/A'} · {m.language}</p>
                <p className="bms-movie-genres">{m.genres?.join(', ')}</p>

                <div className="bms-card-bottom">
                  <span className="bms-ticket-price">From ₹180</span>
                  <Link to={`/movies/${m._id}`} className="bms-btn-book">
                    Book Tickets
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Pager meta={data?.meta} onPage={setPage} />
      </section>

      {/* ===== THE BEST OF LIVE EVENTS STRIP ===== */}
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
                  <Link to="/events" className="bms-btn-book-sm">Book</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== BOOKMYSHOW STREAM SHOWCASE ===== */}
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

      {/* ===== OFFERS & PROMOTIONS STRIP ===== */}
      <section className="bms-section-container" aria-labelledby="offers-heading">
        <div className="bms-section-header">
          <div>
            <h2 id="offers-heading" className="bms-section-title">Offers For You</h2>
            <p className="bms-section-subtitle">Save big with bank credit cards, BOGO passes, and cashback coupons</p>
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
    </div>
  );
}
