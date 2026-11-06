require('dotenv').config();
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

module.exports = {
  port: num(process.env.PORT, 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cinema_booking',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: '8h',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  holdMinutes: num(process.env.HOLD_MINUTES, 5),
  maxSeatsPerBooking: num(process.env.MAX_SEATS_PER_BOOKING, 6),
  cancelCutoffMinutes: num(process.env.CANCEL_CUTOFF_MINUTES, 60),
  fullRefundBeforeMinutes: num(process.env.FULL_REFUND_BEFORE_MINUTES, 240),
  partialRefundPercent: num(process.env.PARTIAL_REFUND_PERCENT, 50),
  tmdbApiKey: process.env.TMDB_API_KEY || '3d08f5a21b3c22b657451dea630d47a7',
  tmdbReadToken: process.env.TMDB_READ_ACCESS_TOKEN || '',
};
