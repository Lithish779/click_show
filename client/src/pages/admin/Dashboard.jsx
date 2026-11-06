import { useState } from 'react';
import { api, fmtDateTime, money } from '../../api.js';
import { useLoad } from '../../hooks.js';
import { Empty, ErrorBox, Loading, Pager } from '../../components.jsx';

const Stat = ({ label, value }) => <div className="stat"><div className="stat-v">{value}</div><div className="muted">{label}</div></div>;

export default function Dashboard() {
  const [range, setRange] = useState({ from: '', to: '' });
  const q = {
    from: range.from ? new Date(`${range.from}T00:00:00`).toISOString() : '',
    to: range.to ? new Date(`${range.to}T23:59:59`).toISOString() : '',
  };
  const [page, setPage] = useState(1);
  const [apage, setApage] = useState(1);
  const sum = useLoad(() => api('/admin/reports/summary', { query: q }), [range]);
  const occ = useLoad(() => api('/admin/reports/occupancy', { query: { ...q, page, limit: 8 } }), [range, page]);
  const audit = useLoad(() => api('/admin/reports/audit', { query: { page: apage, limit: 8 } }), [apage]);
  const s = sum.data;

  return (
    <>
      <h1>Sales & occupancy</h1>
      <div className="filters">
        <label>Shows from<input type="date" value={range.from} onChange={(e) => { setPage(1); setRange({ ...range, from: e.target.value }); }} /></label>
        <label>to<input type="date" value={range.to} onChange={(e) => { setPage(1); setRange({ ...range, to: e.target.value }); }} /></label>
      </div>
      <ErrorBox error={sum.error || occ.error} />
      {sum.loading && !s ? <Loading /> : s && (
        <div className="stats">
          <Stat label="Confirmed bookings" value={s.confirmedBookings} /><Stat label="Seats sold" value={s.seatsSold} />
          <Stat label="Cancelled bookings" value={s.cancelledBookings} /><Stat label="Tickets validated" value={s.ticketsValidated} />
          <Stat label="Gross sales" value={money(s.grossSales)} /><Stat label="Refunds (simulated)" value={money(s.refunds)} />
          <Stat label="Net revenue" value={money(s.netRevenue)} />
        </div>
      )}
      <h2>Occupancy by show</h2>
      {occ.data && !occ.data.data.length && <Empty>No shows in this range.</Empty>}
      {occ.data?.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption className="sr">Occupancy per show</caption>
            <thead><tr><th>Show</th><th>Starts</th><th>Booked / capacity</th><th>Occupancy</th><th>Held now</th><th>Bookings</th><th>Cancelled</th><th>Revenue</th><th>Reconciled</th></tr></thead>
            <tbody>
              {occ.data.data.map((r) => (
                <tr key={r.showId}>
                  <td>{r.movie} · {r.screen}</td><td>{fmtDateTime(r.startsAt)}</td><td>{r.bookedSeats} / {r.capacity}</td>
                  <td><div className="bar" role="img" aria-label={`${r.occupancyPercent}% occupied`}><span style={{ width: `${r.occupancyPercent}%` }} /></div>{r.occupancyPercent}%</td>
                  <td>{r.heldSeats}</td><td>{r.confirmedBookings}</td><td>{r.cancelledBookings} ({r.cancelledSeats} seats)</td><td>{money(r.revenue)}</td>
                  <td>{r.consistent ? '✔' : <strong className="danger-text">✖ mismatch</strong>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager meta={occ.data?.meta} onPage={setPage} />

      <h2>Audit trail</h2>
      {audit.data && !audit.data.data.length && <Empty>No activity yet.</Empty>}
      {audit.data?.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption className="sr">Recent audit events</caption>
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th></tr></thead>
            <tbody>{audit.data.data.map((a) => <tr key={a._id}><td>{new Date(a.at).toLocaleString('en-IN')}</td><td>{a.actor?.name || '—'} <small>({a.actorRole})</small></td><td>{a.action}</td><td>{a.entity} <small className="mono">{a.entityId?.slice(-6)}</small></td></tr>)}</tbody>
          </table>
        </div>
      )}
      <Pager meta={audit.data?.meta} onPage={setApage} />
    </>
  );
}
