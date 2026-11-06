const mongoose = require('mongoose');
const { Schema } = mongoose;
const ref = (model, extra = {}) => ({ type: Schema.Types.ObjectId, ref: model, ...extra });

const User = mongoose.model(
  'User',
  new Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true, select: false },
      role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' },
    },
    { timestamps: true }
  )
);

const movieSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 2000 },
    genres: { type: [String], validate: (v) => v.length > 0 },
    language: { type: String, required: true },
    durationMins: { type: Number, required: true, min: 20, max: 400 },
    formats: { type: [String], default: ['2D'] },
    rating: { type: String, default: 'U/A' },
    posterUrl: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
movieSchema.index({ active: 1, title: 1 });
movieSchema.index({ genres: 1 });
const Movie = mongoose.model('Movie', movieSchema);

const Theatre = mongoose.model(
  'Theatre',
  new Schema({ name: { type: String, required: true, trim: true }, city: { type: String, required: true, trim: true } }, { timestamps: true })
);

const screenSchema = new Schema(
  {
    theatre: ref('Theatre', { required: true, index: true }),
    name: { type: String, required: true, trim: true },
    layout: {
      type: [new Schema({ row: String, seats: { type: Number, min: 1, max: 40 }, category: String }, { _id: false })],
      validate: (v) => v.length > 0,
    },
  },
  { timestamps: true }
);
screenSchema.index({ theatre: 1, name: 1 }, { unique: true });
const Screen = mongoose.model('Screen', screenSchema);

const showSchema = new Schema(
  {
    movie: ref('Movie', { required: true }),
    screen: ref('Screen', { required: true }),
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    format: { type: String, default: '2D' },
    language: { type: String, required: true },
    prices: { type: Schema.Types.Mixed, required: true }, // { STANDARD: 200, PREMIUM: 300, ... } whole rupees
    status: { type: String, enum: ['SCHEDULED', 'CANCELLED'], default: 'SCHEDULED' },
    eventTitle: { type: String, default: '' },
    eventPerks: { type: [String], default: [] },
    isEventSpecial: { type: Boolean, default: false },
  },
  { timestamps: true }
);
showSchema.index({ screen: 1, startsAt: 1 });
showSchema.index({ movie: 1, startsAt: 1 });
showSchema.index({ startsAt: 1 });
const Show = mongoose.model('Show', showSchema);

/**
 * One document per (show, seat) that is currently HELD or BOOKED. A seat with no document is free.
 * The unique {show, seatId} index is what makes double-booking impossible, even under concurrent requests.
 */
const reservationSchema = new Schema({
  show: ref('Show', { required: true }),
  seatId: { type: String, required: true },
  status: { type: String, enum: ['HELD', 'BOOKED'], required: true },
  user: ref('User', { required: true }),
  holdId: { type: String },
  expiresAt: { type: Date }, // only for HELD
  booking: ref('Booking'),
});
reservationSchema.index({ show: 1, seatId: 1 }, { unique: true });
reservationSchema.index({ user: 1, show: 1, status: 1 });
reservationSchema.index({ booking: 1 }, { sparse: true });
// Safety net: Mongo's TTL monitor also removes expired holds (runs ~every 60s). Reads/writes ignore expired holds immediately.
reservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'HELD' } });
const SeatReservation = mongoose.model('SeatReservation', reservationSchema);

const bookingSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true }, // also the QR payload
    user: ref('User', { required: true }),
    show: ref('Show', { required: true }),
    seats: [new Schema({ seatId: String, category: String, price: Number }, { _id: false })],
    total: { type: Number, required: true },
    status: { type: String, enum: ['CONFIRMED', 'CANCELLED'], default: 'CONFIRMED' },
    payment: {
      method: { type: String, default: 'SIMULATED_CARD' },
      status: { type: String, enum: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'], default: 'PAID' },
      txnId: String,
      last4: String,
    },
    refund: {
      status: { type: String, enum: ['NONE', 'PROCESSED'], default: 'NONE' },
      percent: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      at: Date,
    },
    idempotencyKey: String,
    cancelledAt: Date,
    usedAt: Date,
    usedBy: ref('User'),
  },
  { timestamps: true }
);
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1, status: 1 });
bookingSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
const Booking = mongoose.model('Booking', bookingSchema);

const AuditLog = mongoose.model(
  'AuditLog',
  new Schema(
    {
      actor: ref('User'),
      actorRole: String,
      action: { type: String, required: true, index: true },
      entity: String,
      entityId: String,
      meta: Schema.Types.Mixed,
    },
    { timestamps: { createdAt: 'at', updatedAt: false } }
  )
);

const all = { User, Movie, Theatre, Screen, Show, SeatReservation, Booking, AuditLog };
/** Build all indexes (used by `npm run migrate`, server boot and tests). */
const syncAll = () => Promise.all(Object.values(all).map((m) => m.syncIndexes()));

module.exports = { ...all, syncAll };
