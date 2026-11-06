const router = require('express').Router();
const { z } = require('zod');
const { AuditLog } = require('../models');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { paging, pageMeta } = require('../utils/http');
const reports = require('../services/reportService');

router.use(authenticate, requireRole('admin'));
const range = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).passthrough();

router.get('/summary', validate({ query: range }), async (req, res) => res.json(await reports.summary(req.valid.query)));
router.get('/occupancy', validate({ query: range }), async (req, res) => res.json(await reports.occupancy({ ...req.valid.query, query: req.query })));

router.get('/audit', validate({ query: z.object({ action: z.string().max(50).optional() }).passthrough() }), async (req, res) => {
  const p = paging(req.query, 20);
  const filter = req.valid.query.action ? { action: req.valid.query.action } : {};
  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort({ at: -1 }).skip(p.skip).limit(p.limit).populate('actor', 'name email').lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ data, meta: pageMeta(p, total) });
});

module.exports = router;
