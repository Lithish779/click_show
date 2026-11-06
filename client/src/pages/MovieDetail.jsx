import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDateTime } from '../api.js';
import { useLoad } from '../hooks.js';
import { Empty, ErrorBox, Loading, Pager } from '../components.jsx';

const isoDay = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };

export default function MovieDetail() {
  const { id } = useParams();
  const [day, setDay] = useState('');
  const [page, setPage] = useState(1);
  const movie = useLoad(() => api(`/movies/${id}`), [id]);
  const range = useMemo(() => {
    if (!day) return {};
    const from = new Date(`${day}T00:00:00`), to = new Date(`${day}T23:59:59`);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [day]);
  const shows = useLoad(() => api('/shows', { query: { movie: id, ...range, page, limit: 12 } }), [id, day, page]);

  if (movie.loading) return <Loading />;
  if (movie.error) return <ErrorBox error={movie.error} />;
  const m = movie.data;
  return (
    <>
      <h1>{m.title}</h1>
      <p className="muted">{m.genres.join(', ')} · {m.language} · {m.durationMins} min · {m.rating} · {m.formats.join(' / ')}</p>
      <p>{m.description}</p>
      <h2>Showtimes</h2>
      <label className="inline">Date
        <select value={day} onChange={(e) => { setDay(e.target.value); setPage(1); }}>
          <option value="">Any upcoming</option>
          {[0, 1, 2, 3, 4, 5, 6].map((o) => <option key={o} value={isoDay(o)}>{o === 0 ? 'Today' : new Date(isoDay(o) + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</option>)}
        </select>
      </label>
      <ErrorBox error={shows.error} />
      {shows.loading && <Loading />}
      {shows.data && !shows.data.data.length && <Empty>No upcoming shows for this selection.</Empty>}
      <ul className="list">
        {shows.data?.data.map((s) => (
          <li key={s._id} className="card row">
            <div>
              <strong>{fmtDateTime(s.startsAt)}</strong>
              <div className="muted">{s.screen.theatre.name}, {s.screen.theatre.city} · {s.screen.name} · {s.format} · {s.language}</div>
            </div>
            <div className="right">
              <span className={s.availableSeats === 0 ? 'tag soldout' : s.availableSeats < 10 ? 'tag low' : 'tag'}>{s.availableSeats === 0 ? 'Sold out' : `${s.availableSeats} seats left`}</span>
              {s.availableSeats > 0 && <Link className="btn primary" to={`/shows/${s._id}`}>Select seats</Link>}
            </div>
          </li>
        ))}
      </ul>
      <Pager meta={shows.data?.meta} onPage={setPage} />
    </>
  );
}
