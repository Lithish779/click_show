// Compact OpenAPI 3 description, served by Swagger UI at /api/docs and as JSON at /api/openapi.json
const err = (d) => ({ description: d, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
const ok = (d = 'OK') => ({ description: d, content: { 'application/json': { schema: { type: 'object' } } } });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const pageParams = [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }];
const body = (props, required = Object.keys(props)) => ({ required: true, content: { 'application/json': { schema: { type: 'object', required, properties: props } } } });
const s = { type: 'string' }, n = { type: 'integer' };
const authed = [{ bearerAuth: [] }];

const op = (summary, tag, { security, parameters, requestBody, responses } = {}) => ({
  summary, tags: [tag], ...(security && { security }), ...(parameters && { parameters }), ...(requestBody && { requestBody }),
  responses: { 200: ok(), 400: err('VALIDATION_ERROR'), ...(security && { 401: err('UNAUTHENTICATED'), 403: err('FORBIDDEN') }), ...responses },
});

module.exports = {
  openapi: '3.0.3',
  info: { title: 'Cinema Hall Ticket Booking API', version: '1.0.0', description: 'All errors use { error: { code, message, details? } }. Lists return { data, meta: { page, limit, total, pages } }.' },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: { Error: { type: 'object', properties: { error: { type: 'object', properties: { code: s, message: s, details: {} } } } } },
  },
  paths: {
    '/auth/register': { post: op('Register a customer account', 'Auth', { requestBody: body({ name: s, email: s, password: s }), responses: { 201: ok('token + user'), 409: err('EMAIL_TAKEN') } }) },
    '/auth/login': { post: op('Login', 'Auth', { requestBody: body({ email: s, password: s }), responses: { 401: err('INVALID_CREDENTIALS') } }) },
    '/auth/me': { get: op('Current user', 'Auth', { security: authed }) },
    '/movies': {
      get: op('Search/filter movies (q, genre, language, page, limit)', 'Catalog', { parameters: [{ name: 'q', in: 'query', schema: s }, { name: 'genre', in: 'query', schema: s }, { name: 'language', in: 'query', schema: s }, ...pageParams] }),
      post: op('Create movie (admin)', 'Catalog', { security: authed, requestBody: body({ title: s, genres: { type: 'array', items: s }, language: s, durationMins: n }, ['title', 'genres', 'language', 'durationMins']), responses: { 201: ok() } }),
    },
    '/movies/{id}': {
      get: op('Movie details', 'Catalog', { parameters: [idParam], responses: { 404: err('MOVIE_NOT_FOUND') } }),
      put: op('Update movie (admin)', 'Catalog', { security: authed, parameters: [idParam] }),
      delete: op('Archive movie (admin)', 'Catalog', { security: authed, parameters: [idParam], responses: { 204: ok() } }),
    },
    '/theatres': { get: op('List theatres', 'Catalog'), post: op('Create theatre (admin)', 'Catalog', { security: authed, requestBody: body({ name: s, city: s }), responses: { 201: ok() } }) },
    '/screens': {
      get: op('List screens with capacity', 'Catalog', { parameters: [{ name: 'theatre', in: 'query', schema: s }] }),
      post: op('Create screen from sections (admin)', 'Catalog', { security: authed, requestBody: body({ theatre: s, name: s, sections: { type: 'array', items: { type: 'object', properties: { category: { enum: ['STANDARD', 'PREMIUM', 'RECLINER'] }, rows: n, seatsPerRow: n } } } }), responses: { 201: ok() } }),
    },
    '/shows': {
      get: op('Browse upcoming shows with seat availability (movie, theatre, from, to, page)', 'Catalog', { parameters: [{ name: 'movie', in: 'query', schema: s }, { name: 'theatre', in: 'query', schema: s }, { name: 'from', in: 'query', schema: s }, { name: 'to', in: 'query', schema: s }, ...pageParams] }),
      post: op('Schedule a show with per-category prices (admin)', 'Admin', { security: authed, requestBody: body({ movie: s, screen: s, startsAt: s, prices: { type: 'object', example: { STANDARD: 200, PREMIUM: 300 } } }, ['movie', 'screen', 'startsAt', 'prices']), responses: { 201: ok(), 409: err('SCREEN_BUSY') } }),
    },
    '/shows/{id}': {
      get: op('Show details', 'Catalog', { parameters: [idParam] }),
      put: op('Update prices / reschedule (admin)', 'Admin', { security: authed, parameters: [idParam], responses: { 409: err('HAS_BOOKINGS | SCREEN_BUSY') } }),
      delete: op('Delete a show with no bookings (admin)', 'Admin', { security: authed, parameters: [idParam], responses: { 204: ok(), 409: err('HAS_BOOKINGS') } }),
    },
    '/shows/{id}/seats': { get: op('Live seat map (available | held | mine | booked). Token optional.', 'Seats', { parameters: [idParam] }) },
    '/shows/{id}/holds': {
      post: op('Hold seats for HOLD_MINUTES (replaces your previous hold for the show)', 'Seats', { security: authed, parameters: [idParam], requestBody: body({ seatIds: { type: 'array', items: s } }), responses: { 201: ok('holdId, expiresAt, priced seats'), 409: err('SEAT_UNAVAILABLE') } }),
      delete: op('Release your hold', 'Seats', { security: authed, parameters: [idParam] }),
    },
    '/bookings': {
      post: op('Confirm booking from a hold (simulated payment). Requires Idempotency-Key header; replays return 200 with the original booking.', 'Bookings', {
        security: authed, parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: s }],
        requestBody: body({ showId: s, holdId: s, payment: { type: 'object', properties: { cardNumber: { type: 'string', example: '4242 4242 4242 4242 (…0002 = declined)' }, name: s } } }),
        responses: { 201: ok(), 402: err('PAYMENT_DECLINED'), 409: err('HOLD_EXPIRED') },
      }),
      get: op('My booking history (status, page)', 'Bookings', { security: authed, parameters: pageParams }),
    },
    '/bookings/{id}': { get: op('Booking details (owner or admin)', 'Bookings', { security: authed, parameters: [idParam] }) },
    '/bookings/{id}/qr': { get: op('QR code (data URL) for a confirmed booking', 'Bookings', { security: authed, parameters: [idParam] }) },
    '/bookings/{id}/cancel': { post: op('Cancel + simulated refund per policy', 'Bookings', { security: authed, parameters: [idParam], responses: { 409: err('CANCELLATION_CLOSED | INVALID_STATE | TICKET_USED') } }) },
    '/tickets/validate': { post: op('Entry gate: validate a ticket once (staff/admin)', 'Tickets', { security: authed, requestBody: body({ code: s }), responses: { 404: err('INVALID_TICKET'), 409: err('ALREADY_USED | TICKET_CANCELLED | SHOW_ENDED') } }) },
    '/admin/bookings': { get: op('Search all bookings by reference prefix (admin)', 'Admin', { security: authed, parameters: [{ name: 'q', in: 'query', schema: s }, ...pageParams] }) },
    '/admin/reports/summary': { get: op('Sales summary (optional from/to)', 'Reports', { security: authed }) },
    '/admin/reports/occupancy': { get: op('Per-show occupancy with consistency check', 'Reports', { security: authed, parameters: pageParams }) },
    '/admin/reports/audit': { get: op('Audit trail (action filter)', 'Reports', { security: authed, parameters: pageParams }) },
  },
};
