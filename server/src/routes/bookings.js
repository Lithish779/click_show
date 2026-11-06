const router = require('express').Router();
const QRCode = require('qrcode');
const { z } = require('zod');
const { Booking } = require('../models');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { AppError, paging, pageMeta, escapeRegex } = require('../utils/http');
const { holdSeats, releaseHold } = require('../services/seatService');
const { createBooking, cancelBooking, validateTicket } = require('../services/bookingService');
const { audit } = require('../services/audit');

const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = validate({ params: z.object({ id: oid }) });

const present = (b) => {
  const o = b.toObject ? b.toObject() : b;
  delete o.idempotencyKey;
  return o;
};
const populated = (q) => q.populate({ path: 'show', select: 'startsAt format language movie screen', populate: [{ path: 'movie', select: 'title posterUrl' }, { path: 'screen', select: 'name theatre', populate: { path: 'theatre', select: 'name city' } }] });

/* ---- Seat holds ---- */
router.post('/shows/:id/holds', authenticate, idParam, validate({ body: z.object({ seatIds: z.array(z.string().regex(/^[A-Z]\d{1,2}$/)).min(1).max(20) }) }), async (req, res) => {
  const hold = await holdSeats({ userId: req.user.id, showId: req.valid.params.id, seatIds: req.valid.body.seatIds });
  await audit(req.user, 'SEATS_HELD', 'Show', req.valid.params.id, { seats: hold.seats.map((s) => s.seatId), holdId: hold.holdId });
  res.status(201).json(hold);
});

router.delete('/shows/:id/holds', authenticate, idParam, async (req, res) => res.json(await releaseHold({ userId: req.user.id, showId: req.valid.params.id })));

/* ---- Bookings ---- */
router.post(
  '/bookings',
  authenticate,
  validate({
    body: z.object({
      showId: oid,
      holdId: z.string().uuid(),
      payment: z.object({ cardNumber: z.string().regex(/^[\d\s-]{12,23}$/, 'Invalid card number'), name: z.string().trim().min(2).max(80) }),
    }),
  }),
  async (req, res) => {
    const key = req.get('Idempotency-Key');
    if (!key || key.length < 8 || key.length > 100) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header (8-100 chars) is required');
    const { booking, replayed } = await createBooking({ actor: req.user, ...req.valid.body, idempotencyKey: key });
    res.status(replayed ? 200 : 201).json(present(booking));
  }
);

router.get('/bookings', authenticate, validate({ query: z.object({ status: z.enum(['CONFIRMED', 'CANCELLED']).optional() }).passthrough() }), async (req, res) => {
  const p = paging(req.query, 10);
  const filter = { user: req.user.id, ...(req.valid.query.status ? { status: req.valid.query.status } : {}) };
  const [data, total] = await Promise.all([populated(Booking.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit)).lean(), Booking.countDocuments(filter)]);
  res.json({ data: data.map(({ idempotencyKey, ...b }) => b), meta: pageMeta(p, total) });
});

async function ownBooking(req) {
  const b = await populated(Booking.findById(req.valid.params.id));
  if (!b) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  if (String(b.user) !== req.user.id && req.user.role !== 'admin') throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  return b;
}

router.get('/bookings/:id', authenticate, idParam, async (req, res) => res.json(present(await ownBooking(req))));

router.get('/bookings/:id/qr', authenticate, idParam, async (req, res) => {
  const b = await ownBooking(req);
  if (b.status !== 'CONFIRMED') throw new AppError(409, 'INVALID_STATE', 'Only confirmed bookings have a QR ticket');
  res.json({ reference: b.reference, qr: await QRCode.toDataURL(b.reference, { margin: 1, width: 240 }) });
});

router.post('/bookings/:id/cancel', authenticate, idParam, async (req, res) => {
  res.json(present(await cancelBooking({ actor: req.user, bookingId: req.valid.params.id })));
});

/* ---- Entry validation (staff/admin) ---- */
router.post('/tickets/validate', authenticate, requireRole('staff', 'admin'), validate({ body: z.object({ code: z.string().trim().min(6).max(40) }) }), async (req, res) => {
  res.json({ valid: true, ticket: await validateTicket({ actor: req.user, code: req.valid.body.code }) });
});

/* ---- Admin: booking lookup ---- */
router.get('/admin/bookings', authenticate, requireRole('admin'), validate({ query: z.object({ q: z.string().max(40).optional(), status: z.enum(['CONFIRMED', 'CANCELLED']).optional() }).passthrough() }), async (req, res) => {
  const p = paging(req.query, 15);
  const { q, status } = req.valid.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.reference = new RegExp('^' + escapeRegex(q.toUpperCase()));
  const [data, total] = await Promise.all([populated(Booking.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).populate('user', 'name email')).lean(), Booking.countDocuments(filter)]);
  res.json({ data: data.map(({ idempotencyKey, ...b }) => b), meta: pageMeta(p, total) });
});

module.exports = router;
