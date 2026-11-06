import { useState } from 'react';
import { api, fmtDateTime, money } from '../../api.js';
import { useLoad } from '../../hooks.js';
import { Empty, ErrorBox, Notice, Pager } from '../../components.jsx';

export default function Shows() {
  const movies = useLoad(() => api('/movies', { query: { limit: 50 } }), []);
  const screens = useLoad(() => api('/screens'), []);
  const [page, setPage] = useState(1);
  const shows = useLoad(() => api('/shows', { query: { page, limit: 10 } }), [page]);
  const [f, setF] = useState({ movie: '', screen: '', startsAt: '', format: '2D', prices: { STANDARD: 200, PREMIUM: 320, RECLINER: 500 } });
  const [error, setError] = useState(null);
  const [ok, setOk] = useState('');
  const screen = screens.data?.find((s) => s._id === f.screen);

  async function create(e) {
    e.preventDefault(); setError(null); setOk('');
    try {
      const prices = Object.fromEntries(screen.categories.map((c) => [c, Number(f.prices[c])]));
      await api('/shows', { method: 'POST', body: { movie: f.movie, screen: f.screen, startsAt: new Date(f.startsAt).toISOString(), format: f.format, prices } });
      setOk('Show scheduled'); shows.reload();
    } catch (err) { setError(err); }
  }
  async function remove(s) {
    if (!window.confirm('Delete this show?')) return;
    setError(null); setOk('');
    try { await api(`/shows/${s._id}`, { method: 'DELETE' }); setOk('Show deleted'); shows.reload(); } catch (err) { setError(err); }
  }

  return (
    <>
      <h1>Schedule shows</h1>
      <form className="card" onSubmit={create}>
        <ErrorBox error={error} /><Notice>{ok}</Notice>
        <div className="two-col">
          <label>Movie<select required value={f.movie} onChange={(e) => setF({ ...f, movie: e.target.value })}><option value="">Select…</option>{movies.data?.data.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}</select></label>
          <label>Screen<select required value={f.screen} onChange={(e) => setF({ ...f, screen: e.target.value })}><option value="">Select…</option>{screens.data?.map((s) => <option key={s._id} value={s._id}>{s.theatre.name} – {s.name}</option>)}</select></label>
          <label>Starts at<input type="datetime-local" required value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></label>
          <label>Format<select value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })}>{['2D', '3D', 'IMAX', '4DX'].map((x) => <option key={x}>{x}</option>)}</select></label>
        </div>
        {screen && <fieldset><legend>Ticket prices (₹)</legend>{screen.categories.map((c) => <label key={c}>{c}<input type="number" min="1" required value={f.prices[c]} onChange={(e) => setF({ ...f, prices: { ...f.prices, [c]: e.target.value } })} /></label>)}</fieldset>}
        <button className="btn primary">Schedule show</button>
      </form>
      <h2>Upcoming shows</h2>
      {shows.data && !shows.data.data.length && <Empty>No upcoming shows.</Empty>}
      <ul className="list">
        {shows.data?.data.map((s) => (
          <li key={s._id} className="card row between">
            <div><strong>{s.movie.title}</strong> · {fmtDateTime(s.startsAt)}<div className="muted">{s.screen.theatre.name} – {s.screen.name} · {Object.entries(s.prices).map(([c, p]) => `${c.toLowerCase()} ${money(p)}`).join(', ')} · {s.availableSeats}/{s.screen.capacity} free</div></div>
            <button className="btn danger" onClick={() => remove(s)}>Delete</button>
          </li>
        ))}
      </ul>
      <Pager meta={shows.data?.meta} onPage={setPage} />
    </>
  );
}
