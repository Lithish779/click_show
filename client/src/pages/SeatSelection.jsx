import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDateTime, money } from '../api.js';
import { useLoad } from '../hooks.js';
import { ErrorBox, Loading, Notice } from '../components.jsx';

const MAX_SEATS = 6;

function useCountdown(expiresAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return expiresAt ? Math.max(0, Math.floor((new Date(expiresAt) - now) / 1000)) : null;
}

export default function SeatSelection() {
  const { id } = useParams();
  const show = useLoad(() => api(`/shows/${id}`), [id]);
  const map = useLoad(() => api(`/shows/${id}/seats`), [id]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState({ cardNumber: '4242 4242 4242 4242', name: '' });
  const [ticket, setTicket] = useState(null);

  const hold = map.data?.myHold;
  const secondsLeft = useCountdown(hold?.expiresAt);
  const idemKey = useMemo(() => crypto.randomUUID(), [hold?.holdId]); // one key per hold => safe double-click / retry

  // Live availability: refresh every 10s (and whenever our hold runs out).
  useEffect(() => {
    const t = setInterval(() => !document.hidden && map.reload(), 10000);
    return () => clearInterval(t);
  }, [map.reload]);
  useEffect(() => { if (secondsLeft === 0) { map.reload(); setError({ message: 'Your seat hold expired. Please choose seats again.' }); } }, [secondsLeft]); // eslint-disable-line

  const seats = useMemo(() => map.data?.rows.flatMap((r) => r.seats.map((s) => ({ ...s, category: r.category }))) ?? [], [map.data]);
  const mine = seats.filter((s) => s.status === 'mine');
  const total = (hold ? mine : seats.filter((s) => selected.includes(s.seatId))).reduce((a, s) => a + s.price, 0);

  if (ticket) return <Ticket booking={ticket} />;
  if (map.loading && !map.data) return <Loading label="Loading seat map…" />;
  if (map.error && !map.data) return <ErrorBox error={map.error} />;
  const s = show.data;

  const toggle = (seat) => {
    if (hold || ['booked', 'held'].includes(seat.status)) return;
    setError(null);
    setSelected((cur) => (cur.includes(seat.seatId) ? cur.filter((x) => x !== seat.seatId) : cur.length < MAX_SEATS ? [...cur, seat.seatId] : cur));
  };

  async function act(fn) {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e); if (e.status === 409) { setSelected([]); map.reload(); } } finally { setBusy(false); }
  }
  const holdSeats = () => act(async () => { await api(`/shows/${id}/holds`, { method: 'POST', body: { seatIds: selected } }); setSelected([]); map.reload(); });
  const release = () => act(async () => { await api(`/shows/${id}/holds`, { method: 'DELETE' }); map.reload(); });
  const pay = (e) => {
    e.preventDefault();
    act(async () => {
      const booking = await api('/bookings', { method: 'POST', headers: { 'Idempotency-Key': idemKey }, body: { showId: id, holdId: hold.holdId, payment: card } });
      setTicket(booking);
    });
  };

  const mm = secondsLeft != null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : '';
  return (
    <>
      <h1>{map.data.movie}</h1>
      {s && <p className="muted">{fmtDateTime(s.startsAt)} · {s.screen.theatre.name} · {s.screen.name} · {s.format}</p>}
      <div className="screen-bar" aria-hidden="true">SCREEN</div>
      <div className="seatmap" role="group" aria-label="Seat map">
        {map.data.rows.map((r) => (
          <div className="seat-row" key={r.row}>
            <span className="row-label" aria-hidden="true">{r.row}</span>
            {r.seats.map((seat) => {
              const isSel = selected.includes(seat.seatId);
              const cls = seat.status === 'mine' ? 'mine' : isSel ? 'selected' : seat.status;
              return (
                <button key={seat.seatId} type="button" className={`seat ${cls} cat-${r.category.toLowerCase()}`} onClick={() => toggle(seat)}
                  disabled={['booked', 'held'].includes(seat.status)} aria-pressed={isSel || seat.status === 'mine'}
                  aria-label={`Seat ${seat.seatId}, ${r.category.toLowerCase()}, ${money(seat.price)}, ${seat.status === 'mine' ? 'held by you' : seat.status}`}>
                  {seat.seatId.slice(1)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <ul className="legend" aria-label="Legend">
        <li><span className="seat available" /> Available</li><li><span className="seat selected" /> Selected</li>
        <li><span className="seat mine" /> Held by you</li><li><span className="seat held" /> Held by others</li><li><span className="seat booked" /> Booked</li>
      </ul>
      <p className="muted small">{Object.entries(map.data.prices).map(([c, p]) => `${c.toLowerCase()}: ${money(p)}`).join(' · ')}</p>

      <section className="card summary" aria-live="polite">
        <h2>Summary</h2>
        <ErrorBox error={error} />
        {!hold && !selected.length && <p className="muted">Pick up to {MAX_SEATS} seats.</p>}
        {!hold && selected.length > 0 && (
          <>
            <p>Seats: <strong>{selected.join(', ')}</strong></p>
            <p>Total: <strong>{money(total)}</strong></p>
            <button className="btn primary" disabled={busy} onClick={holdSeats}>{busy ? 'Holding…' : 'Hold seats & continue'}</button>
          </>
        )}
        {hold && (
          <form onSubmit={pay}>
            <p>Seats held: <strong>{mine.map((m) => m.seatId).join(', ')}</strong> · Total <strong>{money(total)}</strong></p>
            <p className={secondsLeft < 60 ? 'timer urgent' : 'timer'} role="timer">Hold expires in {mm}</p>
            <p className="muted small">Payment is simulated. Use any card number; numbers ending in 0002 are declined.</p>
            <label>Name on card<input required minLength={2} value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} autoComplete="cc-name" /></label>
            <label>Card number<input required inputMode="numeric" pattern="[\d\s\-]{12,23}" value={card.cardNumber} onChange={(e) => setCard({ ...card, cardNumber: e.target.value })} autoComplete="cc-number" /></label>
            <div className="row">
              <button className="btn primary" disabled={busy}>{busy ? 'Processing…' : `Pay ${money(total)}`}</button>
              <button type="button" className="btn" disabled={busy} onClick={release}>Release seats</button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}

function Ticket({ booking }) {
  const qr = useLoad(() => api(`/bookings/${booking._id}/qr`), [booking._id]);
  return (
    <section className="card narrow ticket">
      <Notice>Booking confirmed!</Notice>
      <h1>Your ticket</h1>
      <p>Reference: <strong className="mono">{booking.reference}</strong></p>
      <p>Seats: {booking.seats.map((s) => s.seatId).join(', ')} · Paid {money(booking.total)}</p>
      {qr.loading ? <Loading label="Generating QR…" /> : qr.data && <img src={qr.data.qr} alt={`QR code for ticket ${booking.reference}`} width="200" height="200" />}
      <p><Link className="btn" to="/bookings">View my bookings</Link></p>
    </section>
  );
}
