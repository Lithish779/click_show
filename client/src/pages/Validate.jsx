import { useState } from 'react';
import { api, fmtDateTime } from '../api.js';
import { ErrorBox } from '../components.jsx';

export default function Validate() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null); setResult(null);
    try { setResult((await api('/tickets/validate', { method: 'POST', body: { code } })).ticket); setCode(''); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  return (
    <form className="card narrow" onSubmit={submit}>
      <h1>Entry validation</h1>
      <p className="muted">Enter the ticket reference (the content of the QR code). Each ticket can be validated once.</p>
      <label>Ticket reference<input required autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="CIN-XXXXXXXXXX" className="mono" /></label>
      <button className="btn primary" disabled={busy}>{busy ? 'Checking…' : 'Validate'}</button>
      <ErrorBox error={error} />
      {result && (
        <div role="status" className="alert success">
          ✔ Valid — {result.movie}, {result.screen}, {fmtDateTime(result.startsAt)}<br />Seats: {result.seats.join(', ')}
        </div>
      )}
    </form>
  );
}
