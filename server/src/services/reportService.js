const { Show, Booking, SeatReservation } = require('../models');
const { capacityOf } = require('../utils/layout');
const { paging, pageMeta } = require('../utils/http');
const { activeFilter } = require('./seatService');

const dateRange = (from, to) => {
  const r = {};
  if (from) r.$gte = from;
  if (to) r.$lte = to;
  return Object.keys(r).length ? r : undefined;
};

/** Sales summary, optionally restricted to shows starting within [from, to]. */
async function summary({ from, to }) {
  let showMatch = {};
  const range = dateRange(from, to);
  if (range) showMatch = { show: { $in: await Show.find({ startsAt: range }).distinct('_id') } };

  const rows = await Booking.aggregate([
    { $match: showMatch },
    {
      $group: {
        _id: '$status',
        bookings: { $sum: 1 },
        seats: { $sum: { $size: '$seats' } },
        gross: { $sum: '$total' },
        refunds: { $sum: '$refund.amount' },
        validated: { $sum: { $cond: [{ $ifNull: ['$usedAt', false] }, 1, 0] } },
      },
    },
  ]);
  const by = Object.fromEntries(rows.map((r) => [r._id, r]));
  const c = by.CONFIRMED || { bookings: 0, seats: 0, gross: 0, refunds: 0, validated: 0 };
  const x = by.CANCELLED || { bookings: 0, seats: 0, gross: 0, refunds: 0, validated: 0 };
  return {
    confirmedBookings: c.bookings,
    cancelledBookings: x.bookings,
    seatsSold: c.seats,
    seatsCancelled: x.seats,
    ticketsValidated: c.validated,
    grossSales: c.gross + x.gross,
    refunds: x.refunds,
    netRevenue: c.gross + x.gross - x.refunds,
  };
}

/** Per-show occupancy. `consistent` proves booked seats in Bookings == BOOKED reservations (cancellations released). */
async function occupancy({ from, to, query }) {
  const p = paging(query, 10);
  const filter = {};
  const range = dateRange(from, to);
  if (range) filter.startsAt = range;
  const [shows, total] = await Promise.all([
    Show.find(filter).sort({ startsAt: -1 }).skip(p.skip).limit(p.limit).populate('movie', 'title').populate('screen', 'name layout').lean(),
    Show.countDocuments(filter),
  ]);
  const ids = shows.map((s) => s._id);
  const [bk, rs, held] = await Promise.all([
    Booking.aggregate([
      { $match: { show: { $in: ids } } },
      { $group: { _id: { show: '$show', status: '$status' }, bookings: { $sum: 1 }, seats: { $sum: { $size: '$seats' } }, gross: { $sum: '$total' }, refunds: { $sum: '$refund.amount' } } },
    ]),
    SeatReservation.aggregate([{ $match: { show: { $in: ids }, status: 'BOOKED' } }, { $group: { _id: '$show', n: { $sum: 1 } } }]),
    SeatReservation.aggregate([{ $match: { show: { $in: ids }, ...activeFilter(), status: 'HELD' } }, { $group: { _id: '$show', n: { $sum: 1 } } }]),
  ]);
  const get = (id, status) => bk.find((b) => String(b._id.show) === String(id) && b._id.status === status) || { bookings: 0, seats: 0, gross: 0, refunds: 0 };
  const num = (arr, id) => arr.find((r) => String(r._id) === String(id))?.n || 0;

  const data = shows.map((s) => {
    const c = get(s._id, 'CONFIRMED');
    const x = get(s._id, 'CANCELLED');
    const capacity = capacityOf(s.screen.layout);
    const bookedSeats = num(rs, s._id);
    return {
      showId: s._id,
      movie: s.movie.title,
      screen: s.screen.name,
      startsAt: s.startsAt,
      capacity,
      bookedSeats,
      heldSeats: num(held, s._id),
      occupancyPercent: capacity ? Math.round((bookedSeats / capacity) * 1000) / 10 : 0,
      confirmedBookings: c.bookings,
      cancelledBookings: x.bookings,
      cancelledSeats: x.seats,
      revenue: c.gross + x.gross - x.refunds,
      consistent: c.seats === bookedSeats,
    };
  });
  return { data, meta: pageMeta(p, total) };
}

module.exports = { summary, occupancy };
