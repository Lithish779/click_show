# CineBook — Cinema Hall Ticket Booking System

Full-stack assessment project (Algions AI Labs). **Node.js + Express + MongoDB (Mongoose) + React (Vite).**

## Features (mapped to the brief)
| Brief requirement | Where |
|---|---|
| Movies, genres, theatres, screens, seat layouts, showtimes, category prices | Admin → *Catalog*, *Shows* (`routes/catalog.js`) |
| Browse movies/showtimes with seat availability, search/filter/pagination | Home, Movie page |
| Seat selection, price summary, **temporary holds with expiry**, no double booking | `services/seatService.js`, `SeatSelection.jsx` |
| Unique ticket reference + QR | `services/bookingService.js`, `/bookings/:id/qr` |
| Booking history, **configurable cancellation** + simulated refund | *My bookings*, `utils/pricing.js` |
| Admin schedules, occupancy and sales dashboard, audit trail | Admin → *Dashboard* |
| Simulated payment | `services/payment.js` |
| Entry validation (once only) | Staff → *Validate ticket* |
| RBAC (customer / staff / admin), server-side | `middleware/auth.js` |

## Quick start (local)
Prerequisites: Node 20+, MongoDB 7 (local install, or `docker compose up -d` using the included file).

```bash
# 1) database
docker compose up -d                     # or start your own mongod on :27017

# 2) backend
cd server
cp .env.example .env                     # edit JWT_SECRET
npm install
npm run migrate                          # (re)creates all indexes — repeatable
npm run seed                             # WIPES the DB, loads demo data
npm run dev                              # http://localhost:4000  (Swagger: /api/docs)

# 3) frontend (new terminal)
cd client
npm install
npm run dev                              # http://localhost:5173 (proxies /api to :4000)
```

### Demo credentials (dummy data only)
| Role | Email | Password |
|---|---|---|
| Admin | admin@cinema.test | Admin@12345 |
| Staff | staff@cinema.test | Staff@12345 |
| Customer | customer@cinema.test | Customer@12345 |

Test card: any number (e.g. `4242 4242 4242 4242`) succeeds; numbers ending `0002` are declined.

### Environment variables (`server/.env`)
`PORT`, `MONGO_URI`, `MONGO_URI_TEST`, `JWT_SECRET`, `CLIENT_ORIGIN`, `HOLD_MINUTES` (5), `MAX_SEATS_PER_BOOKING` (6), `CANCEL_CUTOFF_MINUTES` (60), `FULL_REFUND_BEFORE_MINUTES` (240), `PARTIAL_REFUND_PERCENT` (50).

## Tests
```bash
cd server
npm test            # needs a running MongoDB; uses MONGO_URI_TEST and DROPS that database
```
* `tests/unit.test.js` — layout, pricing, refund policy, payment simulator (no DB needed).
* `tests/booking.test.js` — API/integration, mapped to the acceptance tests:
  AC1 hold & book · AC2 same seat to two users (incl. concurrent race) · AC3 expired holds release, booked seats stay unavailable ·
  AC4 ticket validates once (incl. concurrent scans) · AC5 occupancy report reconciles with bookings/cancellations; plus RBAC, idempotency, declined payment, cancellation policy, validation and audit negative cases.

## Architecture
```
client/ (React + Vite)  ──HTTP /api──▶  server/src
                                         ├─ routes/        HTTP, zod validation, RBAC guards
                                         ├─ services/      seatService, bookingService, reportService, payment, audit
                                         ├─ models/        Mongoose schemas + indexes
                                         └─ utils/         layout, pricing/refund policy, errors
                                                    │
                                                 MongoDB
```
* ER diagram: [`docs/ER_DIAGRAM.md`](docs/ER_DIAGRAM.md) · Design decisions: [`docs/TECHNICAL_REPORT.md`](docs/TECHNICAL_REPORT.md) · API docs: Swagger UI at `/api/docs` (JSON at `/api/openapi.json`).
* Double-booking protection = unique index `{show, seatId}`; holds are all-or-nothing; confirmation, cancellation and validation are conditional atomic updates; checkout uses an `Idempotency-Key`.

## API conventions
Errors: `{ "error": { "code": "SEAT_UNAVAILABLE", "message": "...", "details": {...} } }`. Lists: `{ "data": [...], "meta": { page, limit, total, pages } }`.

## Known limitations
See the technical report §5 (no multi-document transactions, simulated payments/refunds, JWT in localStorage, polling instead of websockets, no email notifications, no live demo deployment).
