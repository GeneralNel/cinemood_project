const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { validationResult } = require('express-validator');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrf() {
  return function (req, res, next) {
    if (!req.session) return next(new Error('csrf requires session'));

    if (!req.session.csrf) {
      req.session.csrf = crypto.randomBytes(24).toString('hex');
    }

    req.csrfToken = () => req.session.csrf;

    if (SAFE.has(req.method)) return next();

    const sent = req.get('x-csrf-token') || (req.body && req.body._csrf);
    if (sent && sent === req.session.csrf) return next();

    const err = new Error('bad csrf token');
    err.code = 'EBADCSRFTOKEN';
    next(err);
  };
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'sign in first' });
  res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many attempts, take a breath' }
});

function collect(req) {
  const result = validationResult(req);
  if (result.isEmpty()) return null;
  return result.array({ onlyFirstError: true }).map(e => e.msg);
}

function htmlGuard(view, dataBuilder = () => ({})) {
  return (req, res, next) => {
    const errors = collect(req);
    if (!errors) return next();
    res.status(400).render(view, { errors, form: req.body, ...dataBuilder(req) });
  };
}

function jsonGuard() {
  return (req, res, next) => {
    const errors = collect(req);
    if (!errors) return next();
    res.status(400).json({ error: 'invalid', errors });
  };
}

module.exports = { csrf, requireAuth, authLimiter, htmlGuard, jsonGuard };
