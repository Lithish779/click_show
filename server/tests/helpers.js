process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const M = require('../src/models');
const app = require('../src/app');
const { buildLayout } = require('../src/utils/layout');

const TEST_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/cinema_booking_test';

async function connect() {
  await mongoose.connect(TEST_URI);
  await mongoose.connection.dropDatabase();
  await M.syncAll(); // unique indexes must exist for the double-booking guarantees
}
const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

async function makeUser(role = 'customer', name = role) {
  const email = `${name}-${Math.random().toString(36).slice(2, 8)}@t.test`;
  const user = await M.User.create({ name, email, role, passwordHash: await bcrypt.hash('Password1!', 4) });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password1!' });
  return { user, token: res.body.token, auth: { Authorization: `Bearer ${res.body.token}` } };
}

/** Movie + theatre + 2x3 screen (A1-A3 standard, B1-B3 premium) + a show starting `startsInMinutes` from now. */
async function makeShow({ startsInMinutes = 60 * 24 } = {}) {
  const movie = await M.Movie.create({ title: 'Test Movie', genres: ['Drama'], language: 'English', durationMins: 100 });
  const theatre = await M.Theatre.create({ name: 'T', city: 'C' });
  const screen = await M.Screen.create({
    theatre: theatre._id, name: 'S' + Math.random().toString(36).slice(2, 6),
    layout: buildLayout([{ category: 'STANDARD', rows: 1, seatsPerRow: 3 }, { category: 'PREMIUM', rows: 1, seatsPerRow: 3 }]),
  });
  const startsAt = new Date(Date.now() + startsInMinutes * 60000);
  const show = await M.Show.create({
    movie: movie._id, screen: screen._id, startsAt, endsAt: new Date(startsAt.getTime() + 115 * 60000),
    language: 'English', prices: { STANDARD: 200, PREMIUM: 300 },
  });
  return { movie, theatre, screen, show };
}

const hold = (u, showId, seatIds) => request(app).post(`/api/shows/${showId}/holds`).set(u.auth).send({ seatIds });
let n = 0;
const book = (u, showId, holdId, { key = `idem-key-${++n}-${Date.now()}`, card = '4242 4242 4242 4242' } = {}) =>
  request(app).post('/api/bookings').set(u.auth).set('Idempotency-Key', key).send({ showId: String(showId), holdId, payment: { cardNumber: card, name: 'Test User' } });

/** hold + book in one go; returns the booking body */
async function holdAndBook(u, showId, seatIds) {
  const h = await hold(u, showId, seatIds);
  const b = await book(u, showId, h.body.holdId);
  return b.body;
}

module.exports = { app, request, M, connect, disconnect, makeUser, makeShow, hold, book, holdAndBook };
