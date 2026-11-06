# Technical report — Cinema Hall Ticket Booking System

**Stack:** Node.js 20+/Express 5, MongoDB 7 + Mongoose, React 18 + Vite, JWT auth, zod validation, Jest + Supertest.
**Shape:** modular monolith — `routes` (HTTP + validation) → `services` (business rules) → `models` (persistence).

## 1. Seat locking without multi-document transactions
Seats are modelled as *reservations*, not as a boolean on a seat: a `SeatReservation` document exists only while a seat is HELD or BOOKED, and a **unique index on `{show, seatId}`** is the single source of truth.

* **Hold:** delete the user's previous hold for that show and any *expired* holds on the requested seats, then `insertMany` the new HELD documents. If any seat is taken the unique index raises a duplicate-key error and the seats already inserted by that request (tagged with a `holdId`) are removed → all-or-nothing, no replica set required.
* **Expiry:** every hold stores `expiresAt` (default 5 min). Every read/count treats an expired HELD document as free; the next hold on that seat deletes it lazily; a partial TTL index also purges them in the background.
* **Confirm:** one `updateMany` flips the caller's HELD documents (matching `holdId`, `expiresAt > now`) to BOOKED and removes `expiresAt`. If the number modified differs from the number held (a hold expired mid-checkout) the conversion is rolled back and the user gets `409 HOLD_EXPIRED`. Because a BOOKED document still occupies the unique key, nobody else can take that seat.
* **Cancel:** the booking is atomically moved CONFIRMED→CANCELLED (conditional update) and its reservation documents are deleted, releasing the seats.

## 2. Idempotency and state machines
* `POST /bookings` requires an `Idempotency-Key`. A unique partial index `{user, idempotencyKey}` plus a lookup-first strategy means retries and double clicks return the original booking (HTTP 200) instead of charging twice. A concurrent loser re-reads the winner.
* Booking: `CONFIRMED → CANCELLED` only; a ticket that was validated (`usedAt` set) cannot be cancelled. Ticket validation is a conditional `findOneAndUpdate` on `usedAt` not existing, so concurrent scans yield exactly one success.
* Payment is a **simulated** gateway (`services/payment.js`): cards ending `0002` are declined; only the last four digits are stored. The charge happens *before* seat conversion, so a decline keeps the hold and a lost hold never results in a charge.

## 3. Security
* Passwords hashed with bcrypt; JWT (8h) carries only user id; **the role is re-read from the database on every request**. Registration always creates a `customer`.
* RBAC is enforced server-side by `requireRole` middleware on every admin/staff endpoint (tests assert 401/403). UI route guards are cosmetic.
* zod validates every body/query/param; unknown routes/errors use one error envelope `{error:{code,message,details}}`. Helmet, CORS allow-list, request-size limit, and rate limiting on login/registration.
* Secrets live in `.env` (git-ignored); only `.env.example` is committed. Demo credentials are dummy.

## 4. Reporting and consistency
`GET /admin/reports/occupancy` aggregates per-show capacity, BOOKED reservations, confirmed/cancelled bookings and revenue (gross − refunds), and returns `consistent: true` when seats counted from CONFIRMED bookings equal BOOKED reservations. A test books, cancels and asserts the figures reconcile. All material actions (hold, booking, cancellation, ticket validation, catalog/show changes, registration) are written to `AuditLog`.

## 5. Trade-offs and known limitations
* No multi-document transactions: correctness relies on the unique index plus compensating deletes. A process crash between steps can leave an orphan HELD document that simply expires; an orphan BOOKED document without a booking is possible only if the process dies between two consecutive writes in `createBooking` (the reconciliation flag in the occupancy report would show it).
* Refunds and payments are simulated; no real gateway or webhooks. Currency is whole rupees.
* JWT is kept in `localStorage` (simple; vulnerable to XSS) — httpOnly cookies + CSRF protection would be the production choice.
* Seat map refreshes by 10-second polling (no WebSocket/SSE).
* Time zone: shows are stored in UTC and rendered in the browser's zone.
* No email/SMS, no show cancellation workflow for already-booked shows (rescheduling is blocked once bookings exist), no movie poster upload.
