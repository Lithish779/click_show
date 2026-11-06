const router = require('express').Router();
const { z } = require('zod');
const { Movie, Theatre, Screen, Show, Booking } = require('../models');
const { validate } = require('../middleware/validate');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const { AppError, escapeRegex, paging, pageMeta } = require('../utils/http');
const { CATEGORIES, buildLayout, capacityOf } = require('../utils/layout');
const { getSeatMap, unavailableCounts } = require('../services/seatService');
const { audit } = require('../services/audit');

const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = validate({ params: z.object({ id: oid }) });
const admin = [authenticate, requireRole('admin')];

/* ---------------- Movies ---------------- */
const movieBody = z.object({
  title: z.string().trim().min(1).max(150),
  description: z.string().max(2000).optional(),
  genres: z.array(z.string().trim().min(1)).min(1).max(5),
  language: z.string().trim().min(2).max(30),
  durationMins: z.number().int().min(20).max(400),
  formats: z.array(z.enum(['2D', '3D', 'IMAX', '4DX'])).min(1).default(['2D']),
  rating: z.string().max(10).optional(),
  posterUrl: z.string().url().or(z.literal('')).optional(),
  active: z.boolean().optional(),
});

router.get('/movies', validate({ query: z.object({ q: z.string().max(100).optional(), genre: z.string().optional(), language: z.string().optional() }).passthrough() }), async (req, res) => {
  const { q, genre, language } = req.valid.query;
  const p = paging(req.query, 12);
  const filter = { active: true };
  if (q) filter.title = new RegExp(escapeRegex(q), 'i');
  if (genre) filter.genres = genre;
  if (language) filter.language = language;
  const [data, total] = await Promise.all([Movie.find(filter).sort({ title: 1 }).skip(p.skip).limit(p.limit).lean(), Movie.countDocuments(filter)]);
  res.json({ data, meta: pageMeta(p, total) });
});

router.get('/movies/filters', async (_req, res) => {
  res.json({ genres: (await Movie.distinct('genres', { active: true })).sort(), languages: (await Movie.distinct('language', { active: true })).sort() });
});

router.get('/movies/:id', idParam, async (req, res) => {
  const movie = await Movie.findById(req.valid.params.id).lean();
  if (!movie) throw new AppError(404, 'MOVIE_NOT_FOUND', 'Movie not found');
  res.json(movie);
});

router.post('/movies', ...admin, validate({ body: movieBody }), async (req, res) => {
  const movie = await Movie.create(req.valid.body);
  await audit(req.user, 'MOVIE_CREATED', 'Movie', movie._id, { title: movie.title });
  res.status(201).json(movie);
});

router.put('/movies/:id', ...admin, idParam, validate({ body: movieBody.partial() }), async (req, res) => {
  const movie = await Movie.findByIdAndUpdate(req.valid.params.id, req.valid.body, { new: true, runValidators: true });
  if (!movie) throw new AppError(404, 'MOVIE_NOT_FOUND', 'Movie not found');
  await audit(req.user, 'MOVIE_UPDATED', 'Movie', movie._id, req.valid.body);
  res.json(movie);
});

// Movies are archived (not deleted) so existing bookings keep their history.
router.delete('/movies/:id', ...admin, idParam, async (req, res) => {
  const movie = await Movie.findByIdAndUpdate(req.valid.params.id, { active: false }, { new: true });
  if (!movie) throw new AppError(404, 'MOVIE_NOT_FOUND', 'Movie not found');
  await audit(req.user, 'MOVIE_ARCHIVED', 'Movie', movie._id);
  res.status(204).end();
});

/* ---------------- Theatres & screens ---------------- */
router.get('/theatres', async (_req, res) => res.json(await Theatre.find().sort({ name: 1 }).lean()));

router.post('/theatres', ...admin, validate({ body: z.object({ name: z.string().trim().min(2).max(100), city: z.string().trim().min(2).max(60) }) }), async (req, res) => {
  const t = await Theatre.create(req.valid.body);
  await audit(req.user, 'THEATRE_CREATED', 'Theatre', t._id, req.valid.body);
  res.status(201).json(t);
});

router.get('/screens', async (req, res) => {
  const filter = req.query.theatre ? { theatre: String(req.query.theatre) } : {};
  const screens = await Screen.find(filter).populate('theatre', 'name city').sort({ name: 1 }).lean();
  res.json(screens.map((s) => ({ ...s, capacity: capacityOf(s.layout), categories: [...new Set(s.layout.map((r) => r.category))] })));
});

router.post(
  '/screens',
  ...admin,
  validate({
    body: z.object({
      theatre: oid,
      name: z.string().trim().min(1).max(50),
      sections: z.array(z.object({ category: z.enum(CATEGORIES), rows: z.number().int().min(1).max(10), seatsPerRow: z.number().int().min(1).max(30) })).min(1).max(5),
    }),
  }),
  async (req, res) => {
    const { theatre, name, sections } = req.valid.body;
    if (!(await Theatre.exists({ _id: theatre }))) throw new AppError(404, 'THEATRE_NOT_FOUND', 'Theatre not found');
    const screen = await Screen.create({ theatre, name, layout: buildLayout(sections) });
    await audit(req.user, 'SCREEN_CREATED', 'Screen', screen._id, { name, capacity: capacityOf(screen.layout) });
    res.status(201).json(screen);
  }
);

/* ---------------- Shows ---------------- */
const showBody = z.object({
  movie: oid,
  screen: oid,
  startsAt: z.coerce.date(),
  format: z.enum(['2D', '3D', 'IMAX', '4DX']).default('2D'),
  language: z.string().trim().min(2).max(30).optional(),
  prices: z.record(z.enum(CATEGORIES), z.number().int().min(1).max(10000)),
});

async function assertNoOverlap(screenId, startsAt, endsAt, ignoreId) {
  const clash = await Show.findOne({ screen: screenId, status: 'SCHEDULED', startsAt: { $lt: endsAt }, endsAt: { $gt: startsAt }, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) });
  if (clash) throw new AppError(409, 'SCREEN_BUSY', 'Another show is already scheduled on this screen at that time');
}

const showFilter = z.object({ movie: oid.optional(), theatre: oid.optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).passthrough();

async function withAvailability(shows) {
  const unavailable = await unavailableCounts(shows.map((s) => s._id));
  return shows.map((s) => {
    const capacity = capacityOf(s.screen.layout);
    const { layout, ...screen } = s.screen;
    return { ...s, screen: { ...screen, capacity }, availableSeats: capacity - (unavailable.get(String(s._id)) || 0) };
  });
}
const populateShow = (q) => q.populate('movie', 'title posterUrl durationMins rating genres').populate({ path: 'screen', select: 'name layout theatre', populate: { path: 'theatre', select: 'name city' } });

router.get('/shows', validate({ query: showFilter }), async (req, res) => {
  const { movie, theatre, from, to } = req.valid.query;
  const p = paging(req.query, 20);
  const filter = { status: 'SCHEDULED', startsAt: { $gte: from && from > new Date() ? from : new Date() } };
  if (to) filter.startsAt.$lte = to;
  if (movie) filter.movie = movie;
  if (theatre) filter.screen = { $in: await Screen.find({ theatre }).distinct('_id') };
  const [shows, total] = await Promise.all([populateShow(Show.find(filter).sort({ startsAt: 1 }).skip(p.skip).limit(p.limit)).lean(), Show.countDocuments(filter)]);
  res.json({ data: await withAvailability(shows), meta: pageMeta(p, total) });
});

router.get('/shows/:id', idParam, async (req, res) => {
  const show = await populateShow(Show.findById(req.valid.params.id)).lean();
  if (!show) throw new AppError(404, 'SHOW_NOT_FOUND', 'Show not found');
  res.json((await withAvailability([show]))[0]);
});

router.get('/shows/:id/seats', optionalAuth, idParam, async (req, res) => res.json(await getSeatMap(req.valid.params.id, req.user?.id)));

router.post('/shows', ...admin, validate({ body: showBody }), async (req, res) => {
  const b = req.valid.body;
  const [movie, screen] = await Promise.all([Movie.findById(b.movie).lean(), Screen.findById(b.screen).lean()]);
  if (!movie || !movie.active) throw new AppError(404, 'MOVIE_NOT_FOUND', 'Movie not found or archived');
  if (!screen) throw new AppError(404, 'SCREEN_NOT_FOUND', 'Screen not found');
  if (b.startsAt <= new Date()) throw new AppError(400, 'VALIDATION_ERROR', 'Show must start in the future');
  const missing = [...new Set(screen.layout.map((r) => r.category))].filter((c) => !b.prices[c]);
  if (missing.length) throw new AppError(400, 'VALIDATION_ERROR', `Missing price for: ${missing.join(', ')}`);
  const endsAt = new Date(b.startsAt.getTime() + (movie.durationMins + 15) * 60000); // +15 min cleaning buffer
  await assertNoOverlap(screen._id, b.startsAt, endsAt);
  const show = await Show.create({ ...b, endsAt, language: b.language || movie.language });
  await audit(req.user, 'SHOW_CREATED', 'Show', show._id, { movie: movie.title, startsAt: show.startsAt });
  res.status(201).json(show);
});

// Update prices (affects new bookings only) or reschedule (blocked once confirmed bookings exist).
router.put('/shows/:id', ...admin, idParam, validate({ body: z.object({ startsAt: z.coerce.date().optional(), prices: showBody.shape.prices.optional() }) }), async (req, res) => {
  const show = await Show.findById(req.valid.params.id);
  if (!show) throw new AppError(404, 'SHOW_NOT_FOUND', 'Show not found');
  const { startsAt, prices } = req.valid.body;
  if (startsAt) {
    if (await Booking.exists({ show: show._id, status: 'CONFIRMED' })) throw new AppError(409, 'HAS_BOOKINGS', 'Cannot reschedule a show that has confirmed bookings');
    const movie = await Movie.findById(show.movie).lean();
    const endsAt = new Date(startsAt.getTime() + (movie.durationMins + 15) * 60000);
    await assertNoOverlap(show.screen, startsAt, endsAt, show._id);
    show.startsAt = startsAt;
    show.endsAt = endsAt;
  }
  if (prices) show.prices = { ...show.prices, ...prices };
  await show.save();
  await audit(req.user, 'SHOW_UPDATED', 'Show', show._id, req.valid.body);
  res.json(show);
});

router.delete('/shows/:id', ...admin, idParam, async (req, res) => {
  const show = await Show.findById(req.valid.params.id);
  if (!show) throw new AppError(404, 'SHOW_NOT_FOUND', 'Show not found');
  if (await Booking.exists({ show: show._id })) throw new AppError(409, 'HAS_BOOKINGS', 'Cannot delete a show that has bookings');
  await show.deleteOne();
  await audit(req.user, 'SHOW_DELETED', 'Show', show._id);
  res.status(204).end();
});

module.exports = router;
