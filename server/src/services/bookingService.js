const crypto = require('crypto');
const { Booking, Show, Screen, SeatReservation } = require('../models');
const { AppError, isDuplicateKey } = require('../utils/http');
const { seatCategoryMap } = require('../utils/layout');
const { priceSeats, refundFor } = require('../utils/pricing');
const { charge } = require('./payment');
const { audit } = require('./audit');

const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const newReference = () => {
  const bytes = crypto.randomBytes(10);
  return 'CIN-' + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
};

/**
 * Confirm a booking from an active hold.
 * Guards: idempotency key (duplicate submits), hold ownership + expiry, atomic HELD->BOOKED conversion,
 * unique (show, seatId) index (no double booking), rollback if the booking document cannot be written.
 */
async function createBooking({ actor, showId, holdId, payment, idempotencyKey }) {
  const existing = await Booking.findOne({ user: actor.id, idempotencyKey });
  if (existing) return { booking: existing, replayed: true };

  const now = new Date();
  const holds = await SeatReservation.find({ show: showId, user: actor.id, holdId, status: 'HELD', expiresAt: { $gt: now } }).lean();
  if (!holds.length) {
    const raced = await Booking.findOne({ user: actor.id, idempotencyKey });
    if (raced) return { booking: raced, replayed: true };
    throw new AppError(409, 'HOLD_EXPIRED', 'Your seat hold has expired. Please select seats again.');
  }

  const show = await Show.findById(showId).lean();
  if (!show || show.status !== 'SCHEDULED' || new Date(show.startsAt) <= now)
    throw new AppError(409, 'SHOW_UNAVAILABLE', 'This show is no longer bookable');
  const screen = await Screen.findById(show.screen).lean();
  const { seats, total } = priceSeats(seatCategoryMap(screen.layout), show.prices, holds.map((h) => h.seatId).sort());

  // Simulated payment first (instant & deterministic); a decline leaves the hold untouched so the user can retry.
  const paid = charge({ cardNumber: payment.cardNumber, amount: total });
  if (!paid.ok) throw new AppError(402, 'PAYMENT_DECLINED', 'Payment was declined. Try another card.');

  const bookingId = new (require('mongoose').Types.ObjectId)();
  const converted = await SeatReservation.updateMany(
    { show: showId, user: actor.id, holdId, status: 'HELD', expiresAt: { $gt: new Date() } },
    { $set: { status: 'BOOKED', booking: bookingId }, $unset: { expiresAt: 1 } }
  );
  if (converted.modifiedCount !== holds.length) {
    await SeatReservation.deleteMany({ booking: bookingId });
    throw new AppError(409, 'HOLD_EXPIRED', 'Your seat hold expired during checkout. No charge was made.');
  }

  try {
    let booking;
    for (let attempt = 0; ; attempt++) {
      try {
        booking = await Booking.create({
          _id: bookingId,
          reference: newReference(),
          user: actor.id,
          show: showId,
          seats,
          total,
          payment: { method: 'SIMULATED_CARD', status: 'PAID', txnId: paid.txnId, last4: paid.last4 },
          idempotencyKey,
        });
        break;
      } catch (e) {
        const refDup = isDuplicateKey(e) && e.keyPattern?.reference;
        if (!(refDup && attempt < 3)) throw e;
      }
    }
    await audit(actor, 'BOOKING_CONFIRMED', 'Booking', booking._id, { reference: booking.reference, seats: seats.map((s) => s.seatId), total });
    return { booking, replayed: false };
  } catch (e) {
    await SeatReservation.deleteMany({ booking: bookingId });
    if (isDuplicateKey(e) && e.keyPattern?.idempotencyKey) {
      const raced = await Booking.findOne({ user: actor.id, idempotencyKey });
      if (raced) return { booking: raced, replayed: true };
    }
    throw e;
  }
}

async function cancelBooking({ actor, bookingId }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  const isAdmin = actor.role === 'admin';
  if (String(booking.user) !== actor.id && !isAdmin) throw new AppError(403, 'FORBIDDEN', 'You cannot cancel this booking');
  if (booking.status !== 'CONFIRMED') throw new AppError(409, 'INVALID_STATE', `Booking is already ${booking.status.toLowerCase()}`);
  if (booking.usedAt) throw new AppError(409, 'TICKET_USED', 'A ticket that has been used cannot be cancelled');

  const show = await Show.findById(booking.show).lean();
  const now = new Date();
  const policy = refundFor({ startsAt: show.startsAt, total: booking.total, now, isAdmin });
  if (!policy.allowed) throw new AppError(409, 'CANCELLATION_CLOSED', 'Cancellation is closed for this show');

  // Conditional update = state-transition guard (CONFIRMED & unused -> CANCELLED) safe under concurrent requests.
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'CONFIRMED', usedAt: { $exists: false } },
    {
      $set: {
        status: 'CANCELLED',
        cancelledAt: now,
        refund: { status: 'PROCESSED', percent: policy.percent, amount: policy.amount, at: now },
        'payment.status': policy.amount === booking.total ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    },
    { new: true }
  );
  if (!updated) throw new AppError(409, 'INVALID_STATE', 'Booking can no longer be cancelled');
  await SeatReservation.deleteMany({ booking: booking._id }); // seats become available again
  await audit(actor, 'BOOKING_CANCELLED', 'Booking', booking._id, { reference: booking.reference, refund: policy.amount, percent: policy.percent });
  return updated;
}

/** Simulated entry gate: a ticket can be validated exactly once. */
async function validateTicket({ actor, code }) {
  const reference = code.trim().toUpperCase();
  const booking = await Booking.findOne({ reference });
  if (!booking) throw new AppError(404, 'INVALID_TICKET', 'Ticket not found');
  if (booking.status === 'CANCELLED') throw new AppError(409, 'TICKET_CANCELLED', 'This booking was cancelled');
  const show = await Show.findById(booking.show).populate('movie', 'title').populate('screen', 'name').lean();
  if (new Date(show.endsAt) < new Date()) throw new AppError(409, 'SHOW_ENDED', 'This show has already ended');

  const used = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'CONFIRMED', usedAt: { $exists: false } },
    { $set: { usedAt: new Date(), usedBy: actor.id } },
    { new: true }
  );
  if (!used) throw new AppError(409, 'ALREADY_USED', `Ticket already used at ${booking.usedAt?.toISOString() ?? 'an earlier time'}`);
  await audit(actor, 'TICKET_VALIDATED', 'Booking', booking._id, { reference });
  return { reference, movie: show.movie.title, screen: show.screen.name, startsAt: show.startsAt, seats: used.seats.map((s) => s.seatId) };
}

module.exports = { createBooking, cancelBooking, validateTicket };
