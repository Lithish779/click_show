const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { validate } = require('../middleware/validate');
const { sign, authenticate } = require('../middleware/auth');
const { AppError, isDuplicateKey } = require('../utils/http');
const { audit } = require('../services/audit');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 10000 : 50, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later' } } });

const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role });

router.post(
  '/register',
  limiter,
  validate({ body: z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email(), password: z.string().min(8).max(100) }) }),
  async (req, res) => {
    const { name, email, password } = req.valid.body;
    try {
      // Role is NEVER taken from the request: self-registration always creates a customer.
      const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'customer' });
      await audit({ id: user._id, role: user.role }, 'USER_REGISTERED', 'User', user._id);
      res.status(201).json({ token: sign(user), user: publicUser(user) });
    } catch (e) {
      if (isDuplicateKey(e)) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
      throw e;
    }
  }
);

router.post(
  '/login',
  limiter,
  validate({ body: z.object({ email: z.string().trim().email(), password: z.string().min(1) }) }),
  async (req, res) => {
    const user = await User.findOne({ email: req.valid.body.email.toLowerCase() }).select('+passwordHash');
    const ok = user && (await bcrypt.compare(req.valid.body.password, user.passwordHash));
    if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
    res.json({ token: sign(user), user: publicUser(user) });
  }
);

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
