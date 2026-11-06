import { useState, useEffect } from 'react';
import { api, money } from '../api';
import { Loading } from '../components';

export default function StreamPage() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rented, setRented] = useState(null);

  useEffect(() => {
    api('/bms/stream')
      .then((data) => {
        setStreams(data?.streams || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="bms-page-container">
      {/* Stream Hero Banner */}
      <div className="stream-hero-banner">
        <div className="stream-hero-content">
          <span className="stream-crown">👑 BMS STREAM PREMIERE</span>
          <h1 className="stream-hero-title">Handpicked Cinema. Every Friday.</h1>
          <p className="stream-hero-desc">
            Rent or buy new releases directly to your home screen. No subscription required.
          </p>
        </div>
      </div>

      {loading && <Loading label="Loading stream library..." />}

      <div className="stream-section">
        <h2 className="stream-section-title">Premiere Releases</h2>
        <div className="stream-grid">
          {streams.map((movie) => (
            <div key={movie.id} className="stream-card">
              <div className="stream-poster-wrap">
                <img src={movie.poster} alt={movie.title} className="stream-poster-img" loading="lazy" />
                <span className="stream-tag-badge">{movie.tag}</span>
                <span className="stream-rating-badge">{movie.rating}</span>
              </div>

              <div className="stream-body">
                <h3 className="stream-title">{movie.title}</h3>
                <p className="stream-meta">{movie.genre} · {movie.duration} · {movie.releaseYear}</p>

                <div className="stream-actions">
                  <button
                    type="button"
                    className="btn-rent"
                    onClick={() => setRented({ ...movie, plan: 'Rent' })}
                  >
                    Rent {money(movie.rentPrice)}
                  </button>
                  <button
                    type="button"
                    className="btn-buy"
                    onClick={() => setRented({ ...movie, plan: 'Buy' })}
                  >
                    Buy {money(movie.buyPrice)}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {rented && (
        <div className="stream-modal-overlay" onClick={() => setRented(null)}>
          <div className="stream-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setRented(null)}>✕</button>
            <span className="stream-badge-mini">STREAM READY</span>
            <h2>{rented.title}</h2>
            <p className="stream-modal-sub">
              {rented.plan === 'Rent' ? '30 Days to start watching · 48 Hours once started' : 'Lifetime Watch Access in 4K UHD'}
            </p>
            <div className="stream-player-mock">
              <div className="player-screen">
                <span className="play-icon">▶</span>
                <p>Streaming in 4K Dolby Atmos</p>
              </div>
            </div>
            <p className="stream-receipt">
              Billed: <strong>{money(rented.plan === 'Rent' ? rented.rentPrice : rented.buyPrice)}</strong> to your linked wallet.
            </p>
            <button className="btn-done-pass" onClick={() => setRented(null)}>
              Start Watching
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
