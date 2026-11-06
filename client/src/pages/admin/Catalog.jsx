import { useState } from 'react';
import { api } from '../../api.js';
import { useLoad } from '../../hooks.js';
import { ErrorBox, Notice } from '../../components.jsx';

function useSubmit(fn, onDone) {
  const [state, setState] = useState({ busy: false, error: null, ok: '' });
  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: null, ok: '' });
    try { const msg = await fn(); setState({ busy: false, error: null, ok: msg }); onDone?.(); }
    catch (error) { setState({ busy: false, error, ok: '' }); }
  };
  return [state, submit];
}

function MovieForm() {
  const [f, setF] = useState({ title: '', genres: '', language: 'English', durationMins: 120, formats: '2D' });
  const [st, submit] = useSubmit(async () => {
    await api('/movies', { method: 'POST', body: { ...f, durationMins: Number(f.durationMins), genres: f.genres.split(',').map((g) => g.trim()).filter(Boolean), formats: [f.formats] } });
    setF({ ...f, title: '' });
    return 'Movie added';
  });
  return (
    <form className="card" onSubmit={submit}>
      <h2>Add movie</h2><ErrorBox error={st.error} /><Notice>{st.ok}</Notice>
      <label>Title<input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <label>Genres (comma separated)<input required value={f.genres} onChange={(e) => setF({ ...f, genres: e.target.value })} /></label>
      <label>Language<input required value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} /></label>
      <label>Duration (min)<input type="number" min="20" max="400" required value={f.durationMins} onChange={(e) => setF({ ...f, durationMins: e.target.value })} /></label>
      <label>Format<select value={f.formats} onChange={(e) => setF({ ...f, formats: e.target.value })}>{['2D', '3D', 'IMAX', '4DX'].map((x) => <option key={x}>{x}</option>)}</select></label>
      <button className="btn primary" disabled={st.busy}>Add movie</button>
    </form>
  );
}

function TheatreForm({ onDone }) {
  const [f, setF] = useState({ name: '', city: '' });
  const [st, submit] = useSubmit(async () => { await api('/theatres', { method: 'POST', body: f }); setF({ name: '', city: '' }); return 'Theatre added'; }, onDone);
  return (
    <form className="card" onSubmit={submit}>
      <h2>Add theatre</h2><ErrorBox error={st.error} /><Notice>{st.ok}</Notice>
      <label>Name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label>City<input required value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
      <button className="btn primary" disabled={st.busy}>Add theatre</button>
    </form>
  );
}

const CATS = ['STANDARD', 'PREMIUM', 'RECLINER'];
function ScreenForm({ theatres, onDone }) {
  const [f, setF] = useState({ theatre: '', name: '', rows: { STANDARD: 4, PREMIUM: 2, RECLINER: 0 }, seatsPerRow: 10 });
  const [st, submit] = useSubmit(async () => {
    const sections = CATS.filter((c) => Number(f.rows[c]) > 0).map((c) => ({ category: c, rows: Number(f.rows[c]), seatsPerRow: Number(f.seatsPerRow) }));
    await api('/screens', { method: 'POST', body: { theatre: f.theatre, name: f.name, sections } });
    return 'Screen added';
  }, onDone);
  return (
    <form className="card" onSubmit={submit}>
      <h2>Add screen & seat layout</h2><ErrorBox error={st.error} /><Notice>{st.ok}</Notice>
      <label>Theatre<select required value={f.theatre} onChange={(e) => setF({ ...f, theatre: e.target.value })}><option value="">Select…</option>{theatres?.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.city})</option>)}</select></label>
      <label>Screen name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label>Seats per row<input type="number" min="1" max="30" value={f.seatsPerRow} onChange={(e) => setF({ ...f, seatsPerRow: e.target.value })} /></label>
      <fieldset><legend>Rows per category (front to back)</legend>
        {CATS.map((c) => <label key={c}>{c}<input type="number" min="0" max="10" value={f.rows[c]} onChange={(e) => setF({ ...f, rows: { ...f.rows, [c]: e.target.value } })} /></label>)}
      </fieldset>
      <button className="btn primary" disabled={st.busy}>Add screen</button>
    </form>
  );
}

export default function Catalog() {
  const theatres = useLoad(() => api('/theatres'), []);
  const screens = useLoad(() => api('/screens'), []);
  return (
    <>
      <h1>Cinema configuration</h1>
      <div className="two-col"><MovieForm /><TheatreForm onDone={theatres.reload} /><ScreenForm theatres={theatres.data} onDone={screens.reload} /></div>
      <h2>Screens</h2>
      <ul className="list">{screens.data?.map((s) => <li key={s._id} className="card">{s.theatre.name} — <strong>{s.name}</strong> · {s.capacity} seats · {s.categories.join(', ')}</li>)}</ul>
    </>
  );
}
