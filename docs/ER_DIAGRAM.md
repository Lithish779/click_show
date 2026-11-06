# ER diagram (MongoDB collections)

Render with any Mermaid viewer (GitHub renders this natively).

```mermaid
erDiagram
  USER ||--o{ BOOKING : makes
  USER ||--o{ SEAT_RESERVATION : holds
  USER ||--o{ AUDIT_LOG : performs
  THEATRE ||--o{ SCREEN : has
  SCREEN ||--o{ SHOW : hosts
  MOVIE ||--o{ SHOW : "is screened in"
  SHOW ||--o{ SEAT_RESERVATION : "locks seats of"
  SHOW ||--o{ BOOKING : "is booked in"
  BOOKING ||--o{ SEAT_RESERVATION : "owns BOOKED seats"

  USER { ObjectId _id PK; string email UK; string passwordHash; string role "customer|staff|admin" }
  MOVIE { ObjectId _id PK; string title; string[] genres; string language; int durationMins; bool active }
  THEATRE { ObjectId _id PK; string name; string city }
  SCREEN { ObjectId _id PK; ObjectId theatre FK; string name; array layout "row, seats, category" }
  SHOW { ObjectId _id PK; ObjectId movie FK; ObjectId screen FK; date startsAt; date endsAt; object prices "per category"; string status }
  SEAT_RESERVATION { ObjectId _id PK; ObjectId show FK; string seatId "unique with show"; string status "HELD|BOOKED"; ObjectId user FK; string holdId; date expiresAt; ObjectId booking FK }
  BOOKING { ObjectId _id PK; string reference UK "also the QR payload"; ObjectId user FK; ObjectId show FK; array seats; int total; string status "CONFIRMED|CANCELLED"; object payment; object refund; string idempotencyKey; date usedAt }
  AUDIT_LOG { ObjectId _id PK; ObjectId actor FK; string action; string entity; string entityId; object meta; date at }
```

## Key indexes and constraints

| Collection | Index | Purpose |
|---|---|---|
| seatreservations | **unique** `{show, seatId}` | The double-booking guard: at most one HELD/BOOKED document per seat per show |
| seatreservations | partial TTL on `expiresAt` (only `status: HELD`) | Mongo also purges expired holds; reads ignore expired holds immediately |
| bookings | **unique** `{reference}` | Ticket reference / QR payload |
| bookings | **unique partial** `{user, idempotencyKey}` | Duplicate-submit protection |
| bookings | `{user, createdAt}`, `{show, status}` | History, reports |
| shows | `{screen, startsAt}`, `{movie, startsAt}`, `{startsAt}` | Overlap check, browse, reports |
| screens | **unique** `{theatre, name}` | |
| users | **unique** `{email}` | |
