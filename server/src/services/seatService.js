const crypto = require('crypto');
const cfg = require('../config');
const { Show, Screen, SeatReservation } = require('../models');
const { AppError, isDuplicateKey } = require('../utils/http');
const { seatCategoryMap, capacityOf } = require('../utils/layout');
const { priceSeats } = require('../utils/pricing');

async function loadBookableShow(showId) {
  const show = await Show.findById(showId).lean();
  if (!show) throw new AppError(404, 'SHOW_NOT_FOUND', 'Show not found');
  if (show.status !== 'SCHEDULED') throw new AppError(409, 'SHOW_CANCELLED', 'This show is cancelled');
  if (new Date(show.startsAt) <= new Date()) throw new AppError(409, 'SHOW_STARTED', 'This show has already started');
  return show;
}

/** A reservation blocks a seat if it is BOOKED, or HELD and not yet expired. */
const activeFilter = (now = new Date()) => ({ $or: [{ status: 'BOOKED' }, { status: 'HELD', expiresAt: { $gt: now } }] });

/**
 * Hold seats for a user. Atomicity comes from the unique (show, seatId) index: if any seat is taken, insertion
 * fails with a duplicate-key error and we roll back the seats we did insert (identified by holdId).
 */
async function holdSeats({ userId, showId, seatIds }) {
  const show = await loadBookableShow(showId);
  const screen = await Screen.findById(show.screen).lean();
  const categories = seatCategoryMap(screen.layout);

  const unique = [...new Set(seatIds)];
  if (unique.length !== seatIds.length) throw new AppError(400, 'DUPLICATE_SEATS', 'Duplicate seats in request');
  if (unique.length > cfg.maxSeatsPerBooking)
    throw new AppError(400, 'TOO_MANY_SEATS', `You can book at most ${cfg.maxSeatsPerBooking} seats at a time`);
  const invalid = unique.filter((s) => !categories.has(s));
  if (invalid.length) throw new AppError(400, 'INVALID_SEATS', 'Some seats do not exist on this screen', { seats: invalid });

  const now = new Date();
  // Replace semantics: a user has one active hold per show.
  await SeatReservation.deleteMany({ show: show._id, user: userId, status: 'HELD' });
  // Lazily release expired holds on the requested seats.
  await SeatReservation.deleteMany({ show: show._id, seatId: { $in: unique }, status: 'HELD', expiresAt: { $lte: now } });

  const holdId = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + cfg.holdMinutes * 60000);
  try {
    await SeatReservation.insertMany(
      unique.map((seatId) => ({ show: show._id, seatId, status: 'HELD', user: userId, holdId, expiresAt })),
      { ordered: true }
    );
  } catch (e) {
    await SeatReservation.deleteMany({ show: show._id, holdId });
    if (isDuplicateKey(e)) {
      const taken = await SeatReservation.find({ show: show._id, seatId: { $in: unique }, ...activeFilter() }).distinct('seatId');
      throw new AppError(409, 'SEAT_UNAVAILABLE', 'One or more seats are no longer available', { seats: taken });
    }
    throw e;
  }
  const { seats, total } = priceSeats(categories, show.prices, unique);
  return { holdId, showId: String(show._id), expiresAt, seats, total };
}

async function releaseHold({ userId, showId }) {
  const r = await SeatReservation.deleteMany({ show: showId, user: userId, status: 'HELD' });
  return { released: r.deletedCount };
}

/** Seat map with live status: available | held (by someone else) | mine | booked */
async function getSeatMap(showId, userId) {
  const show = await Show.findById(showId).populate('movie', 'title').lean();
  if (!show) throw new AppError(404, 'SHOW_NOT_FOUND', 'Show not found');
  const screen = await Screen.findById(show.screen).lean();
  const reservations = await SeatReservation.find({ show: show._id, ...activeFilter() }).lean();
  const state = new Map(reservations.map((r) => [r.seatId, r]));
  const rows = screen.layout.map((r) => ({
    row: r.row,
    category: r.category,
    seats: Array.from({ length: r.seats }, (_, i) => {
      const seatId = `${r.row}${i + 1}`;
      const res = state.get(seatId);
      let status = 'available';
      if (res?.status === 'BOOKED') status = 'booked';
      else if (res) status = userId && String(res.user) === String(userId) ? 'mine' : 'held';
      return { seatId, status, price: show.prices[r.category] };
    }),
  }));
  const mine = reservations.find((r) => r.status === 'HELD' && userId && String(r.user) === String(userId));
  return {
    showId: String(show._id),
    movie: show.movie.title,
    startsAt: show.startsAt,
    prices: show.prices,
    capacity: capacityOf(screen.layout),
    rows,
    myHold: mine ? { holdId: mine.holdId, expiresAt: mine.expiresAt } : null,
  };
}

/** Count of unavailable seats per show id (for discovery lists). */
async function unavailableCounts(showIds) {
  const rows = await SeatReservation.aggregate([
    { $match: { show: { $in: showIds }, ...activeFilter() } },
    { $group: { _id: '$show', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

module.exports = { holdSeats, releaseHold, getSeatMap, unavailableCounts, activeFilter, loadBookableShow };
