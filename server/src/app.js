const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const cfg = require('./config');
const openapi = require('./docs/openapi');
const { errorHandler, notFound } = require('./middleware/validate');

const app = express();
app.use(helmet());
app.use(cors({ origin: cfg.clientOrigin }));
app.use(express.json({ limit: '50kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.get('/api/openapi.json', (_req, res) => res.json(openapi));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tmdb', require('./routes/tmdb'));
app.use('/api/admin/reports', require('./routes/reports'));
app.use('/api', require('./routes/catalog'));
app.use('/api', require('./routes/bookings'));

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
