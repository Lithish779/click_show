import { useState } from 'react';
import { api, fmtDateTime, money } from '../api.js';
import { useLoad } from '../hooks.js';
import { Empty, ErrorBox, Loading, Notice, Pager } from '../components.jsx';

export default function MyBookings() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(() => api('/bookings', { query: { status, page, limit: 6 } }), [status, page]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(null);
  const [qr, setQr] = useState({});

  async function cancel(b) {
    if (!window.confirm(`Cancel booking ${b.reference}? A refund is issued per the cancellation policy.`)) return;
    setErr(null); setMsg('');
    try {
      const r = await api(`/bookings/${b._id}/cancel`, { method: 'POST' });
      setMsg(`Cancelled ${r.reference}. Simulated refund: ${money(r.refund.amount)} (${r.refund.percent}%).`);
      reload();
    } catch (e) { setErr(e); }
  }
  async function showQr(b) {
    if (qr[b._id]) return setQr({ ...qr, [b._id]: null });
    try { setQr({ ...qr, [b._id]: (await api(`/bookings/${b._id}/qr`)).qr }); } catch (e) { setErr(e); }
  }

  return (
    <>
      <h1>My bookings</h1>
      <label className="inline">Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="CONFIRMED">Confirmed</option><option value="CANCELLED">Cancelled</option></select></label>
      <Notice>{msg}</Notice><ErrorBox error={err || error} />
      {loading && !data && <Loading />}
      {data && !data.data.length && <Empty>No bookings yet.</Empty>}
      <ul className="list">
        {data?.data.map((b) => (
          <li key={b._id} className="card">
            <div className="row between">
              <div>
                <strong>{b.show.movie.title}</strong> <span className={`tag ${b.status === 'CANCELLED' ? 'soldout' : ''}`}>{b.status}</span>{b.usedAt && <span className="tag"> Used</span>}
                <div className="muted">{fmtDateTime(b.show.startsAt)} · {b.show.screen.theatre.name}, {b.show.screen.name}</div>
                <div>Seats: {b.seats.map((s) => s.seatId).join(', ')} · {money(b.total)} · <span className="mono">{b.reference}</span></div>
                {b.status === 'CANCELLED' && <div className="muted">Refund {b.refund.status.toLowerCase()}: {money(b.refund.amount)} ({b.refund.percent}%)</div>}
              </div>
              {b.status === 'CONFIRMED' && (
                <div className="row">
                  <button className="btn" onClick={() => showQr(b)}>{qr[b._id] ? 'Hide QR' : 'Show QR'}</button>
                  {!b.usedAt && <button className="btn danger" onClick={() => cancel(b)}>Cancel</button>}
                </div>
              )}
            </div>
            {qr[b._id] && <img src={qr[b._id]} alt={`QR code for ${b.reference}`} width="160" height="160" />}
          </li>
        ))}
      </ul>
      <Pager meta={data?.meta} onPage={setPage} />
    </>
  );
}
