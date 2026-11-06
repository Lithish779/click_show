const { app, request, M, connect, disconnect, makeUser, makeShow, hold, book, holdAndBook } = require('./helpers');

let alice, bob, admin, staff, ctx;
beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
  await Promise.all(['Booking', 'SeatReservation', 'Show', 'AuditLog'].map((m) => M[m].deleteMany({})));
  alice = alice || (await makeUser('customer', 'alice'));
  bob = bob || (await makeUser('customer', 'bob'));
  admin = admin || (await makeUser('admin', 'admin'));
  staff = staff || (await makeUser('staff', 'staff'));
  ctx = await makeShow();
});

describe('AC1: an available seat can be held and booked', () => {
  test('hold -> price summary -> booking with reference and QR', async () => {
    const h = await hold(alice, ctx.show._id, ['A1', 'B1']);
    expect(h.status).toBe(201);
    expect(h.body.total).toBe(500);
    const b = await book(alice, ctx.show._id, h.body.holdId);
    expect(b.status).toBe(201);
    expect(b.body.reference).toMatch(/^CIN-[A-Z0-9]{10}$/);
    expect(b.body.status).toBe('CONFIRMED');
    const qr = await request(app).get(`/api/bookings/${b.body._id}/qr`).set(alice.auth);
    expect(qr.body.qr).toMatch(/^data:image\/png;base64,/);
    const map = await request(app).get(`/api/shows/${ctx.show._id}/seats`).set(bob.auth);
    const status = Object.fromEntries(map.body.rows.flatMap((r) => r.seats).map((s) => [s.seatId, s.status]));
    expect(status.A1).toBe('booked');
    expect(status.A2).toBe('available');
  });
});

describe('AC2: the same seat cannot be confirmed to two users', () => {
  test('second user cannot hold a seat that is held', async () => {
    expect((await hold(alice, ctx.show._id, ['A1'])).status).toBe(201);
    const r = await hold(bob, ctx.show._id, ['A1', 'A2']);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('SEAT_UNAVAILABLE');
    // all-or-nothing: A2 must not have been left held by the failed request
    expect(await M.SeatReservation.countDocuments({ show: ctx.show._id, user: bob.user._id })).toBe(0);
  });

  test('concurrent holds on one seat: exactly one wins', async () => {
    const results = await Promise.all([hold(alice, ctx.show._id, ['B2']), hold(bob, ctx.show._id, ['B2'])]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await M.SeatReservation.countDocuments({ show: ctx.show._id, seatId: 'B2' })).toBe(1);
  });

  test('a booked seat cannot be held by anyone else', async () => {
    await holdAndBook(alice, ctx.show._id, ['A3']);
    const r = await hold(bob, ctx.show._id, ['A3']);
    expect(r.status).toBe(409);
  });

  test('bob cannot confirm using alices hold id', async () => {
    const h = await hold(alice, ctx.show._id, ['A1']);
    const r = await book(bob, ctx.show._id, h.body.holdId);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('HOLD_EXPIRED');
  });
});

describe('AC3: expired holds release seats; confirmed bookings stay unavailable', () => {
  test('expired hold frees the seat for another user', async () => {
    await hold(alice, ctx.show._id, ['A1']);
    await M.SeatReservation.updateMany({ show: ctx.show._id }, { expiresAt: new Date(Date.now() - 1000) });
    const map = await request(app).get(`/api/shows/${ctx.show._id}/seats`);
    expect(map.body.rows[0].seats[0].status).toBe('available');
    expect((await hold(bob, ctx.show._id, ['A1'])).status).toBe(201);
  });

  test('cannot book with an expired hold', async () => {
    const h = await hold(alice, ctx.show._id, ['A2']);
    await M.SeatReservation.updateMany({ show: ctx.show._id }, { expiresAt: new Date(Date.now() - 1000) });
    const r = await book(alice, ctx.show._id, h.body.holdId);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('HOLD_EXPIRED');
    expect(await M.Booking.countDocuments()).toBe(0);
  });

  test('an expired-hold sweep never touches booked seats', async () => {
    await holdAndBook(alice, ctx.show._id, ['A1']);
    await hold(bob, ctx.show._id, ['A2']); // triggers lazy cleanup path
    await M.SeatReservation.updateMany({ status: 'HELD' }, { expiresAt: new Date(Date.now() - 1000) });
    await hold(bob, ctx.show._id, ['A3']);
    expect(await M.SeatReservation.countDocuments({ seatId: 'A1', status: 'BOOKED' })).toBe(1);
  });
});

describe('checkout safety', () => {
  test('same Idempotency-Key returns the original booking, not a second one', async () => {
    const h = await hold(alice, ctx.show._id, ['A1']);
    const first = await book(alice, ctx.show._id, h.body.holdId, { key: 'idem-fixed-key-1' });
    const second = await book(alice, ctx.show._id, h.body.holdId, { key: 'idem-fixed-key-1' });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body._id).toBe(first.body._id);
    expect(await M.Booking.countDocuments()).toBe(1);
  });

  test('declined card keeps the hold so the user can retry', async () => {
    const h = await hold(alice, ctx.show._id, ['A1']);
    const bad = await book(alice, ctx.show._id, h.body.holdId, { card: '4000 0000 0000 0002' });
    expect(bad.status).toBe(402);
    const ok = await book(alice, ctx.show._id, h.body.holdId);
    expect(ok.status).toBe(201);
  });

  test('missing idempotency key is rejected', async () => {
    const h = await hold(alice, ctx.show._id, ['A1']);
    const r = await request(app).post('/api/bookings').set(alice.auth).send({ showId: String(ctx.show._id), holdId: h.body.holdId, payment: { cardNumber: '4242424242424242', name: 'Al' } });
    expect(r.status).toBe(400);
  });

  test('invalid seats and over-limit requests are rejected', async () => {
    expect((await hold(alice, ctx.show._id, ['Z9'])).body.error.code).toBe('INVALID_SEATS');
    expect((await hold(alice, ctx.show._id, ['A1', 'A1'])).body.error.code).toBe('DUPLICATE_SEATS');
  });

  test('cannot hold seats for a show that already started', async () => {
    const past = await makeShow({ startsInMinutes: -10 });
    expect((await hold(alice, past.show._id, ['A1'])).body.error.code).toBe('SHOW_STARTED');
  });
});

describe('AC4: a ticket validates exactly once', () => {
  test('first scan ok, second scan rejected', async () => {
    const b = await holdAndBook(alice, ctx.show._id, ['A1']);
    const first = await request(app).post('/api/tickets/validate').set(staff.auth).send({ code: b.reference });
    expect(first.status).toBe(200);
    const second = await request(app).post('/api/tickets/validate').set(staff.auth).send({ code: b.reference.toLowerCase() });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_USED');
  });

  test('concurrent scans: only one succeeds', async () => {
    const b = await holdAndBook(alice, ctx.show._id, ['A1']);
    const rs = await Promise.all([1, 2, 3].map(() => request(app).post('/api/tickets/validate').set(staff.auth).send({ code: b.reference })));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
  });

  test('unknown, cancelled and customer-initiated validation are rejected', async () => {
    expect((await request(app).post('/api/tickets/validate').set(staff.auth).send({ code: 'CIN-NOPENOPE12' })).status).toBe(404);
    const b = await holdAndBook(alice, ctx.show._id, ['A1']);
    expect((await request(app).post('/api/tickets/validate').set(alice.auth).send({ code: b.reference })).status).toBe(403);
    await request(app).post(`/api/bookings/${b._id}/cancel`).set(alice.auth);
    const r = await request(app).post('/api/tickets/validate').set(staff.auth).send({ code: b.reference });
    expect(r.body.error.code).toBe('TICKET_CANCELLED');
  });

  test('a used ticket cannot be cancelled', async () => {
    const b = await holdAndBook(alice, ctx.show._id, ['A1']);
    await request(app).post('/api/tickets/validate').set(staff.auth).send({ code: b.reference });
    const r = await request(app).post(`/api/bookings/${b._id}/cancel`).set(alice.auth);
    expect(r.body.error.code).toBe('TICKET_USED');
  });
});

describe('cancellation & refunds', () => {
  test('cancel releases seats, issues a full refund and cannot be repeated', async () => {
    const b = await holdAndBook(alice, ctx.show._id, ['A1', 'B1']);
    const c = await request(app).post(`/api/bookings/${b._id}/cancel`).set(alice.auth);
    expect(c.status).toBe(200);
    expect(c.body).toMatchObject({ status: 'CANCELLED', refund: { status: 'PROCESSED', percent: 100, amount: 500 }, payment: { status: 'REFUNDED' } });
    expect((await hold(bob, ctx.show._id, ['A1'])).status).toBe(201); // seat is bookable again
    const again = await request(app).post(`/api/bookings/${b._id}/cancel`).set(alice.auth);
    expect(again.status).toBe(409);
  });

  test('cancellation is closed close to showtime; admin can override', async () => {
    const soon = await makeShow({ startsInMinutes: 20 });
    const b = await holdAndBook(alice, soon.show._id, ['A1']);
    const denied = await request(app).post(`/api/bookings/${b._id}/cancel`).set(alice.auth);
    expect(denied.body.error.code).toBe('CANCELLATION_CLOSED');
    expect((await request(app).post(`/api/bookings/${b._id}/cancel`).set(admin.auth)).status).toBe(200);
  });

  test('partial refund inside the full-refund window', async () => {
    const mid = await makeShow({ startsInMinutes: 120 });
    const b = await holdAndBook(alice, mid.show._id, ['A1']);
    const c = await request(app).post(`/api/bookings/${b._id}/cancel`).set(alice.auth);
    expect(c.body.refund).toMatchObject({ percent: 50, amount: 100 });
    expect(c.body.payment.status).toBe('PARTIALLY_REFUNDED');
  });

  test('users cannot see or cancel other users bookings', async () => {
    const b = await holdAndBook(alice, ctx.show._id, ['A1']);
    expect((await request(app).get(`/api/bookings/${b._id}`).set(bob.auth)).status).toBe(404);
    expect((await request(app).post(`/api/bookings/${b._id}/cancel`).set(bob.auth)).status).toBe(403);
  });

  test('booking history is paginated and per-user', async () => {
    await holdAndBook(alice, ctx.show._id, ['A1']);
    await holdAndBook(alice, ctx.show._id, ['A2']);
    const h = await request(app).get('/api/bookings?limit=1').set(alice.auth);
    expect(h.body.data).toHaveLength(1);
    expect(h.body.meta.total).toBe(2);
    expect((await request(app).get('/api/bookings').set(bob.auth)).body.meta.total).toBe(0);
  });
});

describe('AC5: admin occupancy report matches bookings and cancellations', () => {
  test('numbers reconcile after bookings and a cancellation', async () => {
    await holdAndBook(alice, ctx.show._id, ['A1', 'A2']); // 400
    const b2 = await holdAndBook(bob, ctx.show._id, ['B1']); // 300
    await request(app).post(`/api/bookings/${b2._id}/cancel`).set(bob.auth); // full refund
    const occ = await request(app).get('/api/admin/reports/occupancy').set(admin.auth);
    const row = occ.body.data.find((r) => String(r.showId) === String(ctx.show._id));
    expect(row).toMatchObject({ capacity: 6, bookedSeats: 2, confirmedBookings: 1, cancelledBookings: 1, cancelledSeats: 1, revenue: 400, consistent: true });
    const sum = await request(app).get('/api/admin/reports/summary').set(admin.auth);
    expect(sum.body).toMatchObject({ confirmedBookings: 1, cancelledBookings: 1, seatsSold: 2, grossSales: 700, refunds: 300, netRevenue: 400 });
  });
});

describe('authorization & validation', () => {
  test('unauthenticated -> 401, customer on admin routes -> 403, staff cannot use admin reports', async () => {
    expect((await request(app).post(`/api/shows/${ctx.show._id}/holds`).send({ seatIds: ['A1'] })).status).toBe(401);
    expect((await request(app).get('/api/admin/reports/summary').set(alice.auth)).status).toBe(403);
    expect((await request(app).get('/api/admin/reports/summary').set(staff.auth)).status).toBe(403);
    expect((await request(app).post('/api/movies').set(alice.auth).send({ title: 'x' })).status).toBe(403);
  });

  test('registration cannot choose a role', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'Mallory', email: 'm@t.test', password: 'Password1!', role: 'admin' });
    expect(r.status).toBe(201);
    expect(r.body.user.role).toBe('customer');
  });

  test('duplicate email and weak password are rejected with consistent errors', async () => {
    const body = { name: 'Dup', email: 'dup@t.test', password: 'Password1!' };
    await request(app).post('/api/auth/register').send(body);
    expect((await request(app).post('/api/auth/register').send(body)).body.error.code).toBe('EMAIL_TAKEN');
    const weak = await request(app).post('/api/auth/register').send({ ...body, email: 'w@t.test', password: 'short' });
    expect(weak.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('admin can schedule shows but overlapping shows on a screen are rejected', async () => {
    const start = new Date(Date.now() + 3 * 86400e3).toISOString();
    const payload = { movie: String(ctx.movie._id), screen: String(ctx.screen._id), startsAt: start, prices: { STANDARD: 150, PREMIUM: 250 } };
    expect((await request(app).post('/api/shows').set(admin.auth).send(payload)).status).toBe(201);
    const clash = await request(app).post('/api/shows').set(admin.auth).send(payload);
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe('SCREEN_BUSY');
    const noPrice = await request(app).post('/api/shows').set(admin.auth).send({ ...payload, startsAt: new Date(Date.now() + 9 * 86400e3).toISOString(), prices: { STANDARD: 150 } });
    expect(noPrice.status).toBe(400);
  });

  test('critical actions are written to the audit trail', async () => {
    await holdAndBook(alice, ctx.show._id, ['A1']);
    const log = await request(app).get('/api/admin/reports/audit?action=BOOKING_CONFIRMED').set(admin.auth);
    expect(log.body.meta.total).toBe(1);
  });
});
