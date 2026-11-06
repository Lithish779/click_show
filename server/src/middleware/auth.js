const jwt = require('jsonwebtoken');
const cfg = require('../config');
const { User } = require('../models');
const { AppError } = require('../utils/http');

const sign = (user) => jwt.sign({ sub: String(user._id), role: user.role }, cfg.jwtSecret, { expiresIn: cfg.jwtExpiresIn });

async function loadUser(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  let payload;
  try {
    payload = jwt.verify(h.slice(7), cfg.jwtSecret);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token');
  }
  // Role is re-read from the DB on every request so revoked/changed roles take effect immediately.
  const user = await User.findById(payload.sub).lean();
  if (!user) throw new AppError(401, 'INVALID_TOKEN', 'User no longer exists');
  return { id: String(user._id), role: user.role, name: user.name, email: user.email };
}

async function authenticate(req, _res, next) {
  const user = await loadUser(req);
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  req.user = user;
  next();
}

async function optionalAuth(req, _res, next) {
  req.user = await loadUser(req);
  next();
}

const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) throw new AppError(403, 'FORBIDDEN', 'You do not have permission to do this');
  next();
};

module.exports = { sign, authenticate, optionalAuth, requireRole };
